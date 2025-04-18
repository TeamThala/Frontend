import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Scenario from "@/models/Scenario";
import * as yaml from "js-yaml";
import { FixedValues, NormalDistributionValues, UniformDistributionValues } from "@/types/utils";
import { AssetAllocationFixed, AssetAllocationGlidePath } from "@/types/event";

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
      .populate({
        path: "eventSeries",
        populate: { path: "startYear.event", model: "Event" }
      })
      .populate("RothConversionStrategy");

    if (!scenario) {
      return NextResponse.json({ success: false, error: "Scenario not found" }, { status: 404 });
    }


    const investmentTypesMap = new Map();
    const investmentIdMap = new Map();

    const investmentsYaml = scenario.investments.map((inv) => {
      if (!inv || !inv.investmentType) {
        console.log("Warning: Invalid investment found");
        return null; // Skip this investment
      }

      const type = inv.investmentType;
      // Ensure we have a valid ID format
      const id = type && type.name ? `${type.name} ${inv.taxStatus}`.replace(/\s+/g, ' ').trim() : `unknown ${inv.taxStatus}`;

      if (type && type.name && !investmentTypesMap.has(type.name)) {
        investmentTypesMap.set(type.name, {
          name: type.name,
          description: type.description || '',
          returnAmtOrPct: type.expectedAnnualReturn && type.expectedAnnualReturn.valueType === "percentage" ? "percent" : "amount",
          returnDistribution: serializeDistribution(type.expectedAnnualReturn || {}),
          expenseRatio: type.expenseRatio || 0,
          incomeAmtOrPct: type.expectedAnnualIncome && type.expectedAnnualIncome.valueType === "percentage" ? "percent" : "amount",
          incomeDistribution: serializeDistribution(type.expectedAnnualIncome || {}),
          taxability: type.taxability || false,
        });
      }

      if (inv._id) {
        investmentIdMap.set(inv._id.toString(), id);
      }

      return {
        id,
        investmentType: type ? type.name : 'unknown',
        value: inv.value || 0,
        taxStatus: inv.taxStatus || 'non-retirement',
      };
    }).filter(Boolean); // Filter out any null values

    const investmentTypesYaml = Array.from(investmentTypesMap.values());

    const eventsYaml = scenario.eventSeries.map((evt) => {
      if (!evt || !evt.eventType) {
        console.log("Warning: Invalid event found in eventSeries");
        return null; // Skip this event
      }

      const out: YamlEventOutput = {
        name: evt.name,
        description: evt.description,
        type: evt.eventType.type === "investment" ? "invest" : evt.eventType.type,
      };

      if (evt.startYear && evt.startYear.type === "event") {
        const relatedEvent = evt.startYear.event;
        out.start = {
          type: evt.startYear.eventTime === "start" ? "startWith" : "startAfter",
          // Always include eventSeries, use the name from the related event or default to 'salary'
          eventSeries: relatedEvent && relatedEvent.name ? relatedEvent.name : 'salary',
        };
      } else if (evt.startYear) {
        out.start = serializeDistribution(evt.startYear, true);
      } else {
        // Default start object if not specified
        out.start = { type: "fixed", value: 0 };
      }

      if (evt.duration) {
        out.duration = serializeDistribution(evt.duration, true);
      }

      if (evt.eventType && ["income", "expense"].includes(evt.eventType.type)) {
        out.initialAmount = evt.eventType.amount;

        if (evt.eventType.expectedAnnualChange) {
          out.changeAmtOrPct = evt.eventType.expectedAnnualChange.valueType === "percentage" ? "percent" : "amount";
          out.changeDistribution = serializeDistribution(evt.eventType.expectedAnnualChange);
        }
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
        const hasGlidePath = evt.eventType.assetAllocation && Array.isArray(evt.eventType.assetAllocation) && 
            evt.eventType.assetAllocation.some((alloc: AssetAllocationFixed | AssetAllocationGlidePath) => 
                alloc && alloc.type === 'glidePath');

        if (evt.eventType.assetAllocation && evt.eventType.assetAllocation.length > 0) {
          evt.eventType.assetAllocation.forEach((alloc) => {
            // Check if allocation has valid data
            if (!alloc) {
              console.log(`Warning: Invalid asset allocation entry found in event ${evt.name}`);
              return; // Skip this iteration
            }
            
            // Handle both single investment and arrays of investments
            const investments = alloc.investment ? [alloc.investment] : alloc.investments || [];
            const initialPercentages = alloc.initialPercentage ? 
                (Array.isArray(alloc.initialPercentage) ? alloc.initialPercentage : [alloc.initialPercentage]) : 
                alloc.percentages || [];
            const finalPercentages = alloc.finalPercentage ? 
                (Array.isArray(alloc.finalPercentage) ? alloc.finalPercentage : [alloc.finalPercentage]) : 
                [];
                
            // Process each investment with its corresponding percentage
            investments.forEach((investment, index) => {
              if (!investment) return;
              
              // Get the investment ID from the map
              const id = investmentIdMap.get(investment.toString());
              if (id) {
                // Use the percentage at the matching index, or default to the first one
                const initialPct = initialPercentages[index] !== undefined ? 
                    initialPercentages[index] : 
                    (initialPercentages[0] || 0);
                    
                assetMap[id] = initialPct;
                
                if (hasGlidePath) {
                  const finalPct = finalPercentages[index] !== undefined ? 
                      finalPercentages[index] : 
                      (finalPercentages[0] || initialPct);
                      
                  assetMap2[id] = finalPct;
                }
              }
            });
          });
        }
        // No default entries - just use what's actually in the scenario data

        out.assetAllocation = assetMap;
        if (hasGlidePath) {
          out.glidePath = true;
          out.assetAllocation2 = assetMap2;
        }

        out.maxCash = evt.eventType.maximumCash;
      }

      return out;
    }).filter(Boolean); // Filter out any null values

    // changes

    // changes

    const yamlData: Record<string, string | number | boolean | null | unknown[] | Record<string, unknown>> = {
      name: scenario.name,
      description: scenario.description,
      maritalStatus: scenario.type === 'couple' ? 'couple' : 'single', 
      birthYears: [scenario.ownerBirthYear, scenario.spouseBirthYear].filter(Boolean),
      lifeExpectancy: [
        scenario.ownerLifeExpectancy ? serializeDistribution(scenario.ownerLifeExpectancy) : null,
        scenario.spouseLifeExpectancy ? serializeDistribution(scenario.spouseLifeExpectancy) : null,
      ].filter(Boolean),
      investmentTypes: investmentTypesYaml,
      investments: investmentsYaml,
      eventSeries: eventsYaml,
      inflationAssumption: serializeDistribution(scenario.inflationRate),
      // Include afterTaxContributionLimit 
      afterTaxContributionLimit: 7000, 
      spendingStrategy: scenario.spendingStrategy?.map((id) => {
        if (typeof id === 'string') return scenario.eventSeries.find((e) => e._id.toString() === id)?.name;
        return scenario.eventSeries.find((e) => e._id.equals(id))?.name;
      }).filter(Boolean),
      expenseWithdrawalStrategy: scenario.expenseWithdrawalStrategy?.map((id) => {
        if (typeof id === 'string') return investmentIdMap.get(id);
        return investmentIdMap.get(id.toString());
      }).filter(Boolean),
      RMDStrategy: scenario.RMDStrategy?.map((id) => {
        if (typeof id === 'string') return investmentIdMap.get(id);
        return investmentIdMap.get(id.toString());
      }).filter(Boolean),
    };

    // Explicitly add Roth conversion properties as direct fields
    yamlData.RothConversionOpt = scenario.rothConversion?.rothConversion || false;
    yamlData.RothConversionStart = scenario.rothConversion?.rothConversion ? 
        scenario.rothConversion.RothConversionStartYear : null;
    yamlData.RothConversionEnd = scenario.rothConversion?.rothConversion ? 
        scenario.rothConversion.RothConversionEndYear : null;
    
    // Add Roth conversion strategy
    yamlData.RothConversionStrategy = [];
    if (scenario.rothConversion?.rothConversion && scenario.RothConversionStrategy) {
      yamlData.RothConversionStrategy = scenario.RothConversionStrategy.flatMap((r) => {
        if (!r || !r.investmentOrder) return [];
        return r.investmentOrder.map((id) => {
          if (typeof id === 'string') return investmentIdMap.get(id);
          return investmentIdMap.get(id.toString());
        }).filter(Boolean);
      });
    }
    
    // Add remaining fields
    yamlData.financialGoal = scenario.financialGoal;
    yamlData.residenceState = scenario.residenceState;

    // Log Roth conversion details for debugging
    console.log('Roth Conversion details:');
    console.log('  rothConversion from DB:', JSON.stringify(scenario.rothConversion));
    console.log('  Values going into YAML:');
    console.log('  RothConversionOpt:', yamlData.RothConversionOpt);
    console.log('  RothConversionStart:', yamlData.RothConversionStart);
    console.log('  RothConversionEnd:', yamlData.RothConversionEnd);
    console.log('  RothConversionStrategy:', JSON.stringify(yamlData.RothConversionStrategy));

    // Generate the YAML string
    const yamlStr = yaml.dump(yamlData, { 
      lineWidth: 0,
      skipInvalid: false,
      noRefs: true
    });

    // Double-check if Roth conversion fields are in the YAML
    console.log('Checking final YAML for Roth fields:');
    console.log('  RothConversionOpt in YAML:', yamlStr.includes('RothConversionOpt:'));
    console.log('  RothConversionStart in YAML:', yamlStr.includes('RothConversionStart:'));
    console.log('  RothConversionEnd in YAML:', yamlStr.includes('RothConversionEnd:'));
    console.log('  RothConversionStrategy in YAML:', yamlStr.includes('RothConversionStrategy:'));

    // Add header comments to match the example format
    const headerComment = `# file format for scenario import/export.  version: ${new Date().toISOString().split('T')[0]}
# CSE416, Software Engineering, Scott D. Stoller.

# a distribution is represented as a map with one of the following forms:
# {type: fixed, value: <number>}
# {type: normal, mean: <number>, stdev: <number>}
# {type: uniform, lower: <number>, upper: <number>}
# percentages are represented by their decimal value, e.g., 4% is represented as 0.04.

`;

    // If for some reason the fields don't appear in the YAML, manually add them
    let finalYamlStr = headerComment + yamlStr;
    
    // Ensure critical fields are always present
    const requiredFields = [
      { key: 'RothConversionOpt', value: yamlData.RothConversionOpt },
      { key: 'RothConversionStart', value: yamlData.RothConversionStart },
      { key: 'RothConversionEnd', value: yamlData.RothConversionEnd },
      { key: 'RothConversionStrategy', value: JSON.stringify(yamlData.RothConversionStrategy) === '[]' ? '[]' : yamlData.RothConversionStrategy }
    ];
    
    // Check each field and add it if missing
    for (const field of requiredFields) {
      if (!finalYamlStr.includes(`${field.key}:`)) {
        console.log(`  Adding missing field: ${field.key}`);
        if (field.key === 'RothConversionStrategy' && field.value === '[]') {
          finalYamlStr += `${field.key}: []\n`;
        } else {
          finalYamlStr += `${field.key}: ${field.value}\n`;
        }
      }
    }

    console.log('Final YAML check after potential additions:');
    console.log('  RothConversionOpt in final YAML:', finalYamlStr.includes('RothConversionOpt:'));
    console.log('  RothConversionStart in final YAML:', finalYamlStr.includes('RothConversionStart:'));
    console.log('  RothConversionEnd in final YAML:', finalYamlStr.includes('RothConversionEnd:'));
    console.log('  RothConversionStrategy in final YAML:', finalYamlStr.includes('RothConversionStrategy:'));

    return new NextResponse(finalYamlStr, {
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

// Define TypeScript interface for the event output data structure
interface YamlEventOutput {
  name: string;
  description?: string;
  type: string;
  start?: Record<string, unknown>;
  duration?: Record<string, unknown>;
  initialAmount?: number;
  changeAmtOrPct?: string;
  changeDistribution?: Record<string, unknown>;
  inflationAdjusted?: boolean;
  userFraction?: number;
  socialSecurity?: boolean;
  wage?: boolean;
  discretionary?: boolean;
  assetAllocation?: Record<string, number>;
  assetAllocation2?: Record<string, number>;
  glidePath?: boolean;
  maxCash?: number;
}

function serializeDistribution(dist: FixedValues | NormalDistributionValues | UniformDistributionValues | Record<string, unknown>, isYear = false): Record<string, unknown> {
  if (!dist || typeof dist !== 'object' || !('type' in dist)) return {};
  
  // Extract all possible fields
  const { type } = dist;
  
  if (!type) return {};
  
  if (type === "fixed") {
    const fixedDist = dist as FixedValues;
    // For year fields, use year if available, otherwise value
    if (isYear) {
      return { type, value: 'year' in dist ? dist.year : fixedDist.value };
    }
    return { type, value: fixedDist.value };
  }
  
  if (type === "normal") {
    const normalDist = dist as NormalDistributionValues;
    return { type, mean: normalDist.mean, stdev: normalDist.stdDev };
  }
  
  if (type === "uniform") {
    const uniformDist = dist as UniformDistributionValues;
    return { type, lower: uniformDist.min, upper: uniformDist.max };
  }
  
  return {};
}
