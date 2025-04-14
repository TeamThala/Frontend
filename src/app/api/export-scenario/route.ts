import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Scenario from "@/models/Scenario";
import Investment from "@/models/Investment";
import InvestmentType from "@/models/InvestmentType";
import Event from "@/models/Event";
import * as yaml from "js-yaml";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Scenario ID is required" }, { status: 400 });
    }

    const scenario = await Scenario.findById(id)
      .populate({
        path: "investments",
        populate: { path: "investmentType", model: "InvestmentType" }
      })
      .populate("eventSeries");

    if (!scenario) {
      return NextResponse.json({ success: false, error: "Scenario not found" }, { status: 404 });
    }

    const investmentTypesMap = new Map();
    const investmentIdMap = new Map();

    const investmentsYaml = scenario.investments.map((inv) => {
      const type = inv.investmentType;
      const id = `${type.name} ${inv.taxStatus}`.replace(/\s+/g, ' ').trim();

      if (!investmentTypesMap.has(type.name)) {
        investmentTypesMap.set(type.name, {
          name: type.name,
          description: type.description,
          returnAmtOrPct: type.expectedAnnualReturn.valueType === "percentage" ? "percent" : "amount",
          returnDistribution: serializeDistribution(type.expectedAnnualReturn),
          expenseRatio: type.expenseRatio,
          incomeAmtOrPct: type.expectedAnnualIncome.valueType === "percentage" ? "percent" : "amount",
          incomeDistribution: serializeDistribution(type.expectedAnnualIncome),
          taxability: type.taxability,
        });
      }

      investmentIdMap.set(inv._id.toString(), id);

      return {
        investmentType: type.name,
        value: inv.value,
        taxStatus: inv.taxStatus,
        id,
      };
    });

    const investmentTypesYaml = Array.from(investmentTypesMap.values());

    const eventsYaml = scenario.eventSeries.map((evt) => {
      const out: any = {
        name: evt.name,
        type: evt.eventType.type === "investment" ? "invest" : evt.eventType.type,
      };

      if (evt.startYear.type === "event") {
        out.start = {
          type: evt.startYear.eventTime === "start" ? "startWith" : "startAfter",
          eventSeries: scenario.eventSeries.find((e) => e._id.equals(evt.startYear.event))?.name,
        };
      } else {
        out.start = serializeDistribution(evt.startYear, true);
      }

      if (evt.duration) {
        out.duration = serializeDistribution(evt.duration, true);
      }

      if (["income", "expense"].includes(evt.eventType.type)) {
        out.initialAmount = evt.eventType.amount;
        out.changeAmtOrPct = evt.eventType.expectedAnnualChange?.valueType === "percentage" ? "percent" : "amount";
        out.changeDistribution = serializeDistribution(evt.eventType.expectedAnnualChange);
        out.inflationAdjusted = evt.eventType.inflationAdjustment;
        out.userFraction = evt.eventType.percentageOfIncome;

        if (evt.eventType.type === "income") {
          out.socialSecurity = evt.eventType.socialSecurity;
          out.wage = evt.eventType.wage;
        } else {
          out.discretionary = evt.eventType.discretionary;
        }
      }

      if (["investment", "rebalance"].includes(evt.eventType.type)) {
        const assetMap: Record<string, number> = {};
        const assetMap2: Record<string, number> = {};

        evt.eventType.assetAllocation.forEach((alloc) => {
          const id = investmentIdMap.get(alloc.investment.toString());
          if (id) {
            assetMap[id] = alloc.initialPercentage;
            assetMap2[id] = alloc.finalPercentage;
          }
        });

        out.assetAllocation = assetMap;
        if (evt.eventType.assetAllocation.some(a => a.type === 'glidePath')) {
          out.glidePath = true;
          out.assetAllocation2 = assetMap2;
        }

        out.maxCash = evt.eventType.maximumCash;
      }

      return out;
    });

    const yamlData = {
      name: scenario.name,
      maritalStatus: scenario.type,
      birthYears: [scenario.userBirthYear, scenario.spouseBirthYear].filter(Boolean),
      lifeExpectancy: [
        scenario.userLifeExpectancy ? serializeDistribution(scenario.userLifeExpectancy) : null,
        scenario.spouseLifeExpectancy ? serializeDistribution(scenario.spouseLifeExpectancy) : null,
      ].filter(Boolean),
      investmentTypes: investmentTypesYaml,
      investments: investmentsYaml,
      eventSeries: eventsYaml,
      inflationAssumption: serializeDistribution(scenario.inflationRate),
      spendingStrategy: scenario.spendingStrategy.map((id) => scenario.eventSeries.find((e) => e._id.equals(id))?.name),
      expenseWithdrawalStrategy: scenario.expenseWithdrawalStrategy.map((id) => investmentIdMap.get(id.toString())),
      RMDStrategy: scenario.RMDStrategy.map((id) => investmentIdMap.get(id.toString())),
      RothConversionOpt: scenario.rothConversion.rothConversion,
      RothConversionStart: scenario.rothConversion.RothConversionStartYear,
      RothConversionEnd: scenario.rothConversion.RothConversionEndYear,
      RothConversionStrategy: scenario.RothConversionStrategy.flatMap((r) => r.investmentOrder.map((id) => investmentIdMap.get(id.toString()))),
      financialGoal: scenario.financialGoal,
      residenceState: scenario.residenceState,
    };

    const yamlStr = yaml.dump(yamlData, { lineWidth: 0 });

    return new NextResponse(yamlStr, {
      status: 200,
      headers: {
        "Content-Type": "text/yaml",
        "Content-Disposition": `attachment; filename=${scenario.name.replace(/\s+/g, "_")}.yaml`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ success: false, error: "Failed to export scenario" }, { status: 500 });
  }
}

function serializeDistribution(dist: any, isYear = false) {
  if (!dist) return {};
  const { type, value, year, mean, stdDev, min, max } = dist;
  if (type === "fixed") return { type, value: year ?? value };
  if (type === "normal") return { type, mean, stdev: stdDev };
  if (type === "uniform") return { type, lower: min, upper: max };
  return {};
}
