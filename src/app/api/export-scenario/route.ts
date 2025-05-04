import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Scenario from "@/models/Scenario";
import * as yaml from "js-yaml";
import { FixedValues, NormalDistributionValues, UniformDistributionValues } from "@/types/utils";
import { AssetAllocationFixed, AssetAllocationGlidePath } from "@/types/event";
import RothConversionStrategy from "@/models/RothConversionStrategy";
import { Investment } from "@/types/investment";

export const dynamic = "force-dynamic";

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

// Interface for investment type in YAML export
interface YamlInvestmentType {
  name: string;
  description: string;
  returnAmtOrPct: string;
  returnDistribution: Record<string, unknown>;
  expenseRatio: number;
  incomeAmtOrPct: string;
  incomeDistribution: Record<string, unknown>;
  taxability: boolean;
}

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

    // Enhanced mapping functions for investments
    const investmentTypesMap = new Map<string, YamlInvestmentType>();
    const investmentIdMap = new Map<string, string>();
    
    // Helper function to create multiple variants of investment ID for more robust mapping
    const stashIdVariants = (humanId: string, investment: Investment) => {
      if (!humanId || !investment || !investment._id) return;
      
      const id = investment._id.toString();
      const norm = humanId.toLowerCase().replace(/[^\w]+/g, "").trim();
      
      investmentIdMap.set(humanId, id);
      investmentIdMap.set(norm, id);
      investmentIdMap.set(humanId.replace(/\s+/g, ""), id);
      
      if (humanId.includes("S&P")) {
        investmentIdMap.set(humanId.replace(/S&P/g, "SP"), id);
      }
    };

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

      // Store both ID-to-Object mapping and reverse lookup
      if (inv._id) {
        investmentIdMap.set(inv._id.toString(), id);
        stashIdVariants(id, inv);
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

      /* ---------------- allocation → YAML ---------------- */
      if (["investment", "rebalance"].includes(evt.eventType.type)) {
        const assetMap: Record<string, number> = {};
        const assetMap2: Record<string, number> = {};

        /* ✨ NEW: treat assetAllocation as an array no matter what */
        const allAllocs =
          evt.eventType.assetAllocation == null
            ? []
            : Array.isArray(evt.eventType.assetAllocation)
              ? evt.eventType.assetAllocation
              : [evt.eventType.assetAllocation];

        const hasGlidePath = allAllocs.some(
          (alloc: AssetAllocationFixed | AssetAllocationGlidePath) =>
            alloc && alloc.type === "glidePath",
        );

        allAllocs.forEach((alloc) => {
          if (!alloc) return;                        // skip nulls

          /* invest list + matching % arrays */
          const investments =
            "investments" in alloc && Array.isArray(alloc.investments)
              ? alloc.investments
              : alloc.investment
                ? [alloc.investment]
                : [];

          const initialPcts =
            alloc.type === "glidePath"
              ? alloc.initialPercentages ?? []
              : alloc.percentages ?? [];

          const finalPcts =
            alloc.type === "glidePath"
              ? alloc.finalPercentages ?? []
              : [];

          investments.forEach((inv, idx) => {
            const humanId = inv && investmentIdMap.get(inv.toString());
            if (!humanId) return;

            /* initial */
            const firstPct =
              initialPcts[idx] !== undefined ? initialPcts[idx] : initialPcts[0] ?? 0;
            assetMap[humanId] = firstPct;

            /* final (only for glidePath) */
            if (hasGlidePath) {
              const lastPct =
                finalPcts[idx] !== undefined ? finalPcts[idx] : finalPcts[0] ?? firstPct;
              assetMap2[humanId] = lastPct;
            }
          });
        });

        /* write out */
        out.assetAllocation = assetMap;
        if (hasGlidePath) {
          out.glidePath = true;
          out.assetAllocation2 = assetMap2;
        }
        out.maxCash =
          typeof (evt.eventType as any).maxCash === "number"
            ? (evt.eventType as any).maxCash
            : 0;
      }


      return out;
    }).filter(Boolean); // Filter out any null values

    // Helper function to get investment names from IDs with more robust error handling
    const getInvestmentIdsWithFallback = async (strategy: (string | Investment)[], strategyName: string): Promise<string[]> => {
      
      // If no strategy exists, return empty array
      if (!strategy || !Array.isArray(strategy) || strategy.length === 0) {
        return [];
      }
      
      // Process all items in the strategy array
      const result: string[] = [];
      
      for (const item of strategy) {
        if (!item) continue;
        
        // Handle direct investment references
        if (typeof item === 'object' && item._id) {
          // Investment object reference
          const id = investmentIdMap.get(item._id.toString());
          if (id) {
            result.push(id);
          } else {
          }
        } else if (typeof item === 'string') {
          // String ID reference
          const id = investmentIdMap.get(item);
          if (id) {
            result.push(id);
          } else {
          }
        }
      }
      
      // Special handling for S&P 500 pre-tax in RothConversionStrategy
      if (strategyName === 'RothConversionStrategy' && result.length === 0) {
        
        // Look for any investment that might be an S&P 500 pre-tax account
        for (const [key, value] of Object.entries(investmentIdMap)) {
          if ((typeof key === 'string' && key.includes('S&P') && key.includes('pre-tax')) || 
              (typeof value === 'string' && value.includes('S&P') && value.includes('pre-tax'))) {
            const investmentId = typeof value === 'string' ? value : key;
            result.push(investmentId);
          }
        }
      }
      
      return result;
    };

    // Process Roth conversion strategy with enhanced error handling
    let rothConversionStrategy: string[] = [];
    if (scenario.rothConversion && scenario.rothConversion.rothConversion) {
      // First try to get from RothConversionStrategy collection references
      if (scenario.RothConversionStrategy && Array.isArray(scenario.RothConversionStrategy)) {
        
        for (const strategyRef of scenario.RothConversionStrategy) {
          try {
            // If this is already populated as an object with investmentOrder
            if (strategyRef.investmentOrder) {
              const investments = await getInvestmentIdsWithFallback(
                strategyRef.investmentOrder, 
                'RothConversionStrategy.investmentOrder'
              );
              rothConversionStrategy = [...rothConversionStrategy, ...investments];
            } else {
              // If it's just an ID reference, fetch the document
              const strategyDoc = await RothConversionStrategy.findById(strategyRef).exec();
              if (strategyDoc && strategyDoc.investmentOrder) {
                const investments = await getInvestmentIdsWithFallback(
                  strategyDoc.investmentOrder,
                  'RothConversionStrategy.investmentOrder (from lookup)'
                );
                rothConversionStrategy = [...rothConversionStrategy, ...investments];
              }
            }
          } catch (error) {
            console.error('Error processing Roth conversion strategy:', error);
          }
        }
      }
      
      // If still empty, try direct investment references 
      if (rothConversionStrategy.length === 0) {
        const directInvestments = await getInvestmentIdsWithFallback(
          scenario.RothConversionStrategy as (string | Investment)[], 
          'RothConversionStrategy (direct)'
        );
        rothConversionStrategy = directInvestments;
      }
      
      // If still empty, fallback to all pre-tax accounts as last resort
      if (rothConversionStrategy.length === 0) {
        
        // Find all pre-tax investments
        for (const inv of scenario.investments) {
          if (inv && inv.taxStatus === 'pre-tax') {
            const id = investmentIdMap.get(inv._id.toString());
            if (id) {
              rothConversionStrategy.push(id);
            }
          }
        }
      }
    }

    // Process RMD strategy similarly
    let rmdStrategy: string[] = [];
    if (scenario.RMDStrategy && Array.isArray(scenario.RMDStrategy)) {
      rmdStrategy = await getInvestmentIdsWithFallback(scenario.RMDStrategy as (string | Investment)[], 'RMDStrategy');
      
      // If empty, fallback to all pre-tax accounts
      if (rmdStrategy.length === 0) {
        
        // Find all pre-tax investments
        for (const inv of scenario.investments) {
          if (inv && inv.taxStatus === 'pre-tax') {
            const id = investmentIdMap.get(inv._id.toString());
            if (id) {
              rmdStrategy.push(id);
            }
          }
        }
      }
    }
    
    // Process spending strategy
    const spendingStrategy = scenario.spendingStrategy?.map((id) => {
      if (typeof id === 'string') return scenario.eventSeries.find((e) => e._id.toString() === id)?.name;
      return scenario.eventSeries.find((e) => e._id.equals(id))?.name;
    }).filter(Boolean) as string[];
    
    // Process expense withdrawal strategy
    const expenseWithdrawalStrategy = scenario.expenseWithdrawalStrategy?.map((id) => {
      if (typeof id === 'string') return investmentIdMap.get(id);
      return investmentIdMap.get(id.toString());
    }).filter(Boolean) as string[];

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
      spendingStrategy,
      expenseWithdrawalStrategy,
      RMDStrategy: rmdStrategy,
      RothConversionOpt: scenario.rothConversion?.rothConversion || false,
      RothConversionStart: scenario.rothConversion?.rothConversion ? 
          scenario.rothConversion.RothConversionStartYear : null,
      RothConversionEnd: scenario.rothConversion?.rothConversion ? 
          scenario.rothConversion.RothConversionEndYear : null,
      RothConversionStrategy: rothConversionStrategy,
      financialGoal: scenario.financialGoal,
      residenceState: scenario.residenceState,
    };


    // Generate the YAML string
    const yamlStr = yaml.dump(yamlData, { 
      lineWidth: 0,
      skipInvalid: false,
      noRefs: true
    });


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
