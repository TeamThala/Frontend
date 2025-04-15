import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import Scenario from '@/models/Scenario';
import Investment from '@/models/Investment';
import InvestmentType from '@/models/InvestmentType';
import Event from '@/models/Event';
import mongoose, { Types } from 'mongoose';
import * as yaml from 'js-yaml';

// This is the correct way to configure the API route in Next.js App Router
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

// Define types for the YAML data structure
interface YamlInvestmentType {
  name: string;
  description?: string;
  returnDistribution: {
    type: 'fixed' | 'normal' | 'uniform';
    value?: number;
    mean?: number;
    stdev?: number;
    lower?: number;
    upper?: number;
  };
  incomeDistribution: {
    type: 'fixed' | 'normal' | 'uniform';
    value?: number;
    mean?: number;
    stdev?: number;
    lower?: number;
    upper?: number;
  };
  returnAmtOrPct: 'amount' | 'percent';
  incomeAmtOrPct?: 'amount' | 'percent';
  expenseRatio: number;
  taxability: boolean;
}

interface YamlInvestment {
  id: string;
  value: number;
  investmentType: string;
  taxStatus: 'non-retirement' | 'pre-tax' | 'after-tax';
}

interface YamlEvent {
  name: string;
  description?: string;
  type: 'income' | 'expense' | 'invest' | 'rebalance';
  start: {
    type: 'fixed' | 'normal' | 'uniform' | 'startWith' | 'startAfter';
    value?: number;
    mean?: number;
    stdev?: number;
    lower?: number;
    upper?: number;
    eventSeries?: string;
  };
  duration?: {
    type: 'fixed' | 'normal' | 'uniform';
    value?: number;
    mean?: number;
    stdev?: number;
    lower?: number;
    upper?: number;
  };
  initialAmount?: number;
  changeAmtOrPct?: 'amount' | 'percent';
  changeDistribution?: {
    type: 'fixed' | 'normal' | 'uniform';
    value?: number;
    mean?: number;
    stdev?: number;
    lower?: number;
    upper?: number;
  };
  returnAmtOrPct?: 'amount' | 'percent';
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

interface YamlScenario {
  name: string;
  description?: string;
  maritalStatus: 'single' | 'couple';
  birthYears?: number[];
  lifeExpectancy?: Array<{
    type: 'fixed' | 'normal' | 'uniform';
    value?: number;
    mean?: number;
    stdev?: number;
    lower?: number;
    upper?: number;
  }>;
  investmentTypes?: YamlInvestmentType[];
  investments?: YamlInvestment[];
  eventSeries?: YamlEvent[];
  spendingStrategy?: string[];
  expenseWithdrawalStrategy?: string[];
  RMDStrategy?: string[];
  inflationAssumption: {
    type: 'fixed' | 'normal' | 'uniform';
    value?: number;
    mean?: number;
    stdev?: number;
    lower?: number;
    upper?: number;
  };
  RothConversionOpt?: boolean;
  RothConversionStart?: number;
  RothConversionEnd?: number;
  RothConversionStrategy?: string[];
  financialGoal?: number;
  residenceState?: string;
  afterTaxContributionLimit?: number;
}

// Type definitions to match your Mongoose schemas
interface StartYear {
  type: string;
  year?: number;
  mean?: number;
  stdDev?: number;
  min?: number;
  max?: number;
  event?: Types.ObjectId;
  eventTime?: string;
}

interface Duration {
  type: string;
  year?: number;
  mean?: number;
  stdDev?: number;
  min?: number;
  max?: number;
  value?: number;
  valueType?: string;
}

interface DistributionValues {
  type: string;
  valueType: string;
  value?: number;
  mean?: number;
  stdDev?: number;
  min?: number;
  max?: number;
}

interface EventType {
  type: string;
  amount?: number;
  expectedAnnualChange?: DistributionValues;
  inflationAdjustment?: boolean;
  percentageOfIncome?: number;
  socialSecurity?: boolean;
  wage?: boolean;
  discretionary?: boolean;
  assetAllocation?: Array<{
    type: string;
    investments: Types.ObjectId[];
    percentages: number[];
    initialPercentage: number[];
    finalPercentage: number[];
  }>;
  maximumCash?: number;
}

// Helper function to create distribution values from yaml input
function createDistribution(
  distribution: { 
    type: 'fixed' | 'normal' | 'uniform'; 
    value?: number; 
    mean?: number; 
    stdev?: number; 
    lower?: number; 
    upper?: number; 
  } | undefined, 
  valueType: 'amount' | 'percentage' = 'amount'
): DistributionValues {
  if (!distribution) {
    // Return a default fixed distribution
    return {
      type: 'fixed',
      valueType,
      value: 0,
    };
  }

  const { type, value, mean, stdev, lower, upper } = distribution;
  
  if (type === 'fixed') {
    return {
      type,
      valueType,
      value,
    };
  } else if (type === 'normal') {
    return {
      type,
      valueType,
      mean,
      stdDev: stdev,
    };
  } else if (type === 'uniform') {
    return {
      type,
      valueType,
      min: lower,
      max: upper,
    };
  }
  
  // Default
  return {
    type: 'fixed',
    valueType,
    value: 0,
  };
}

// Helper function to normalize investment IDs for consistent matching
function normalizeInvestmentId(id: string): string {
  // Standardize spaces, remove special characters, convert to lowercase
  return id.toLowerCase()
    .replace(/&/g, '') // Remove ampersands
    .replace(/\s+/g, ' ') // Standardize spaces
    .replace(/\W+/g, match => match === ' ' ? ' ' : '') // Keep spaces but remove other non-word chars
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Get session to authenticate the user
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Find the user in the database
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Read and parse the YAML file from the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Check if file is a YAML file
    if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
      return NextResponse.json(
        { success: false, error: 'File must be a YAML file' },
        { status: 400 }
      );
    }

    // Read the file content and parse it as YAML
    const fileContent = await file.text();
    const scenarioData = yaml.load(fileContent) as YamlScenario;
    console.log(scenarioData);
    // Map to keep track of investment types
    const investmentTypeMap = new Map<string, Types.ObjectId>();
    const investmentMap = new Map<string, Types.ObjectId>();
    const eventMap = new Map<string, Types.ObjectId | string>();

    // Step 1: Create investment types from the YAML file
    const investmentTypeIds: Types.ObjectId[] = [];
    for (const invType of scenarioData.investmentTypes || []) {

      // Create the distribution objects with proper typing
      const returnDistribution: DistributionValues = createDistribution(
        invType.returnDistribution, 
        invType.returnAmtOrPct === 'percent' ? 'percentage' : 'amount'
      );

      // Handle either incomeAmtOrPct or the equivalent field in the import data
      const incomePctType = 
        invType.incomeAmtOrPct ? invType.incomeAmtOrPct :  // If directly specified
        invType.returnAmtOrPct === 'percent' ? 'percent' : 'amount'; // Otherwise use same as return type
        
      const incomeDistribution: DistributionValues = createDistribution(
        invType.incomeDistribution, 
        incomePctType === 'percent' ? 'percentage' : 'amount'
      );

      // Create the investment type document
      const investmentTypeDoc = await InvestmentType.create({
        name: invType.name,
        description: invType.description || 'No description',
        expectedAnnualReturn: returnDistribution,
        expenseRatio: invType.expenseRatio,
        expectedAnnualIncome: incomeDistribution,
        taxability: invType.taxability,
      });

      investmentTypeIds.push(investmentTypeDoc._id);
      investmentTypeMap.set(invType.name, investmentTypeDoc._id);
    }

    // Step 2: Create investments from the YAML file
    const investmentIds: Types.ObjectId[] = [];
    for (const inv of scenarioData.investments || []) {
      const investmentTypeId = investmentTypeMap.get(inv.investmentType);

      if (!investmentTypeId) {
        return NextResponse.json(
          { success: false, error: `Investment type not found: ${inv.investmentType}` },
          { status: 400 }
        );
      }

      // Create the investment document
      const investmentDoc = await Investment.create({
        value: inv.value,
        taxStatus: inv.taxStatus,
        investmentType: investmentTypeId,
      });

      investmentIds.push(investmentDoc._id);
      
      // Store multiple variants of the ID for flexible matching
      storeInvestmentIdVariants(inv.id, investmentDoc._id, investmentMap);
    }

    // Step 3: Create events from the YAML file
    const eventIds: Types.ObjectId[] = [];
    for (const evt of scenarioData.eventSeries || []) {
      // Process start year/date
      const startYear: StartYear = {
        type: evt.start.type === 'startWith' || evt.start.type === 'startAfter' ? 'event' : evt.start.type,
      };

      if (evt.start.type === 'fixed') {
        startYear.year = evt.start.value;
      } else if (evt.start.type === 'normal') {
        startYear.mean = evt.start.mean;
        startYear.stdDev = evt.start.stdev;
      } else if (evt.start.type === 'uniform') {
        startYear.min = evt.start.lower;
        startYear.max = evt.start.upper;
      } else if (evt.start.type === 'startWith' || evt.start.type === 'startAfter') {
        startYear.eventTime = evt.start.type === 'startWith' ? 'start' : 'end';
        
        // Save dependency info for later resolution
        let dependencyName = evt.start.eventSeries as string;
        
        // If no eventSeries is specified, default to 'salary' as fallback
        if (!dependencyName) {
          console.log(`No event dependency specified for ${evt.name}, defaulting to 'salary'`);
          dependencyName = 'salary';
        }
        
        if (dependencyName) {
          eventMap.set(`${evt.name}-dependency`, dependencyName);
        }
      }

      // Process duration
      let duration: Duration | undefined = undefined;
      if (evt.duration) {
        duration = {
          type: evt.duration.type,
          valueType: "amount", // Duration is always an amount
        };

        if (evt.duration.type === 'fixed') {
          duration.value = evt.duration.value;
        } else if (evt.duration.type === 'normal') {
          duration.mean = evt.duration.mean;
          duration.stdDev = evt.duration.stdev;
        } else if (evt.duration.type === 'uniform') {
          duration.min = evt.duration.lower;
          duration.max = evt.duration.upper;
        }
      }

      // Process event type based on the event's type (income, expense, invest, rebalance)
      const eventType: EventType = {
        type: evt.type === "invest" ? "investment" : evt.type,
      };

      if (evt.type === 'income' || evt.type === 'expense') {
        eventType.amount = evt.initialAmount;
        
        // Create change distribution
        if (evt.changeDistribution) {
          eventType.expectedAnnualChange = createDistribution(
            evt.changeDistribution,
            (evt.changeAmtOrPct || 'amount') === 'percent' ? 'percentage' : 'amount'
          );
        }
        
        eventType.inflationAdjustment = evt.inflationAdjusted || false;
        eventType.percentageOfIncome = evt.userFraction;
        
        if (evt.type === 'income') {
          eventType.socialSecurity = evt.socialSecurity || false;
          eventType.wage = evt.wage || false;
        } else if (evt.type === 'expense') {
          eventType.discretionary = evt.discretionary || false;
        }
      } else if (evt.type === 'invest' || evt.type === 'rebalance') {
        // Process asset allocation
        const assetAllocation: Array<{
          type: string;
          investments: Types.ObjectId[];
          percentages: number[];
          initialPercentage: number[];
          finalPercentage: number[];
        }> = [];
        
        const isGlidePath = evt.glidePath || false;
        
        // Group all allocations into a single entry since the schema expects arrays
        const investments: Types.ObjectId[] = [];
        const percentages: number[] = [];
        const finalPercentages: number[] = [];

        if (evt.assetAllocation) {
          for (const [investmentId, percentage] of Object.entries(evt.assetAllocation)) {
            const normalizedId = normalizeInvestmentId(investmentId);
            let mongoInvestmentId = investmentMap.get(investmentId);
            
            if (!mongoInvestmentId) {
              mongoInvestmentId = investmentMap.get(normalizedId);
            }

            // Additional fallback: try find by similar name
            if (!mongoInvestmentId) {
              console.log(`Investment ID not found: ${investmentId} (normalized: ${normalizedId})`);
              console.log(`Available IDs:`, Array.from(investmentMap.keys()));
              
              // Try to find the most similar match
              for (const [key, value] of investmentMap.entries()) {
                const normalizedKey = normalizeInvestmentId(key);
                // Check if they're similar after normalization
                if (normalizedKey.includes(normalizedId.replace(' ', '')) || 
                    normalizedId.replace(' ', '').includes(normalizedKey)) {
                  console.log(`Found similar match: ${key} for ${investmentId}`);
                  mongoInvestmentId = value;
                  break;
                }
              }
            }

            if (!mongoInvestmentId) {
              return NextResponse.json(
                { success: false, error: `Investment not found for allocation: ${investmentId}` },
                { status: 400 }
              );
            }

            // Add to the arrays
            investments.push(mongoInvestmentId);
            percentages.push(percentage as number);
            
            // Get the final percentage from assetAllocation2 if it exists and this is a glidePath
            const finalPercentage = isGlidePath && evt.assetAllocation2 ? 
              (evt.assetAllocation2[investmentId] || percentage) : percentage;
              
            finalPercentages.push(finalPercentage as number);
          }
        }

        // Create a single asset allocation entry with arrays
        if (investments.length > 0) {
          assetAllocation.push({
            type: isGlidePath ? 'glidePath' : 'fixed',
            investments: investments,
            percentages: percentages,
            initialPercentage: percentages,
            finalPercentage: finalPercentages,
          });
        }

        eventType.assetAllocation = assetAllocation;
        eventType.maximumCash = evt.maxCash || 0;
      }

      // Create the event document
      const eventDoc = await Event.create({
        name: evt.name,
        description: evt.description || '',
        startYear,
        duration,
        eventType,
      });

      eventIds.push(eventDoc._id);
      eventMap.set(evt.name, eventDoc._id);
    }

    // Step 4: Resolve event dependencies
    for (const [key, dependencyName] of eventMap.entries()) {
      if (key.endsWith('-dependency') && typeof dependencyName === 'string') {
        const eventName = key.replace('-dependency', '');
        // Find the event that has the dependency
        const event = await Event.findOne({ name: eventName });
        
        if (event && event.startYear && event.startYear.type === 'event') {
          // Find the dependent event by name, with case-insensitive matching
          const dependentEvent = await Event.findOne({ 
            $or: [
              { name: dependencyName },
              { name: { $regex: new RegExp(`^${dependencyName}$`, 'i') } }
            ]
          });
          
          if (dependentEvent) {
            // Update the event reference
            event.startYear.event = dependentEvent._id;
            await event.save();
            console.log(`Resolved dependency for ${eventName}: depends on ${dependencyName}`);
          } else {
            console.warn(`Dependent event '${dependencyName}' not found for event '${eventName}'`);
          }
        }
      }
    }

    
    // Determine scenario type (single or couple)
    const scenarioType = scenarioData.maritalStatus === 'couple' ? 'couple' : 'individual';
    
    // Process spending strategy and expense withdrawal strategy
    const spendingStrategy: Types.ObjectId[] = [];
    for (const eventName of scenarioData.spendingStrategy || []) {
      const eventId = eventMap.get(eventName);
      if (eventId && typeof eventId !== 'string') {
        spendingStrategy.push(eventId);
      }
    }
    
    const expenseWithdrawalStrategy: Types.ObjectId[] = [];
    // Use proper type instead of any
    const withdrawalStrategyData = scenarioData.expenseWithdrawalStrategy || [];
    for (const investmentId of withdrawalStrategyData) {
      const normalizedId = normalizeInvestmentId(investmentId);
      let mongoInvestmentId = investmentMap.get(investmentId);
      
      if (!mongoInvestmentId) {
        mongoInvestmentId = investmentMap.get(normalizedId);
      }
      
      // Additional fallback: try find by similar name
      if (!mongoInvestmentId) {
        console.log(`Withdrawal strategy: Investment ID not found: ${investmentId} (normalized: ${normalizedId})`);
        
        // Try to find the most similar match
        for (const [key, value] of investmentMap.entries()) {
          const normalizedKey = normalizeInvestmentId(key);
          // Check if they're similar after normalization
          if (normalizedKey.includes(normalizedId.replace(' ', '')) || 
              normalizedId.replace(' ', '').includes(normalizedKey)) {
            console.log(`Found similar match: ${key} for ${investmentId}`);
            mongoInvestmentId = value;
            break;
          }
        }
      }
        
      if (mongoInvestmentId) {
        expenseWithdrawalStrategy.push(mongoInvestmentId);
      }
    }
    
    // Process RMD strategy
    const rmdStrategy: Types.ObjectId[] = [];
    // Use proper type instead of any
    const rmdStrategyData = scenarioData.RMDStrategy || [];
    for (const investmentId of rmdStrategyData) {
      const normalizedId = normalizeInvestmentId(investmentId);
      let mongoInvestmentId = investmentMap.get(investmentId);
      
      if (!mongoInvestmentId) {
        mongoInvestmentId = investmentMap.get(normalizedId);
      }
      
      // Additional fallback: try find by similar name
      if (!mongoInvestmentId) {
        console.log(`RMD strategy: Investment ID not found: ${investmentId} (normalized: ${normalizedId})`);
        
        // Try to find the most similar match
        for (const [key, value] of investmentMap.entries()) {
          const normalizedKey = normalizeInvestmentId(key);
          // Check if they're similar after normalization
          if (normalizedKey.includes(normalizedId.replace(' ', '')) || 
              normalizedId.replace(' ', '').includes(normalizedKey)) {
            console.log(`Found similar match: ${key} for ${investmentId}`);
            mongoInvestmentId = value;
            break;
          }
        }
      }
        
      if (mongoInvestmentId) {
        rmdStrategy.push(mongoInvestmentId);
      }
    }
    
    // Process Roth conversion strategy
    const rothConversionStrategyIds: Types.ObjectId[] = [];
    
    if (scenarioData.RothConversionOpt === true) {
      const rothInvestments: Types.ObjectId[] = [];
      // Use proper type instead of any
      const rothStrategyData = scenarioData.RothConversionStrategy || [];
      for (const investmentId of rothStrategyData) {
        const normalizedId = normalizeInvestmentId(investmentId);
        let mongoInvestmentId = investmentMap.get(investmentId);
        
        if (!mongoInvestmentId) {
          mongoInvestmentId = investmentMap.get(normalizedId);
        }
        
        // Additional fallback: try find by similar name
        if (!mongoInvestmentId) {
          console.log(`Roth strategy: Investment ID not found: ${investmentId} (normalized: ${normalizedId})`);
          
          // Try to find the most similar match
          for (const [key, value] of investmentMap.entries()) {
            const normalizedKey = normalizeInvestmentId(key);
            // Check if they're similar after normalization
            if (normalizedKey.includes(normalizedId.replace(' ', '')) || 
                normalizedId.replace(' ', '').includes(normalizedKey)) {
              console.log(`Found similar match: ${key} for ${investmentId}`);
              mongoInvestmentId = value;
              break;
            }
          }
        }
        
        if (mongoInvestmentId) {
          rothInvestments.push(mongoInvestmentId);
        }
      }
      
      // Create a RothConversionStrategy document
      if (rothInvestments.length > 0) {
        const RothConversionStrategy = mongoose.models.RothConversionStrategy;
        const rothStrategyDoc = await RothConversionStrategy.create({
          name: "Imported Strategy",
          investmentOrder: rothInvestments,
          owner: user._id,
          updatedAt: new Date()
        });
        
        rothConversionStrategyIds.push(rothStrategyDoc._id);
      }
    }
    
    // Create inflation rate object
    const inflationRate: DistributionValues = createDistribution(
      scenarioData.inflationAssumption,
      'percentage'
    );

    // Create Roth conversion object
    const rothConversion: {
      rothConversion: boolean;
      RothConversionStartYear: number | null;
      RothConversionEndYear: number | null;
    } = {
      rothConversion: scenarioData.RothConversionOpt === true,
      RothConversionStartYear: scenarioData.RothConversionOpt === true && scenarioData.RothConversionStart ? 
          scenarioData.RothConversionStart : null,
      RothConversionEndYear: scenarioData.RothConversionOpt === true && scenarioData.RothConversionEnd ? 
          scenarioData.RothConversionEnd : null,
    };

    // Create life expectancy object for owner
    let ownerLifeExpectancy: DistributionValues | null = null;
    if (scenarioData.lifeExpectancy && scenarioData.lifeExpectancy.length > 0) {
      ownerLifeExpectancy = createDistribution(scenarioData.lifeExpectancy[0], 'amount');
    }

    // Create the scenario document
    const scenarioDoc = await Scenario.create({
      type: scenarioType,
      name: scenarioData.name || 'Imported Scenario',
      description: scenarioData.description || 'Imported from YAML file',
      financialGoal: scenarioData.financialGoal || 0,
      investments: investmentIds,
      eventSeries: eventIds,
      spendingStrategy,
      expenseWithdrawalStrategy,
      inflationRate,
      RothConversionStrategy: rothConversionStrategyIds,
      RMDStrategy: rmdStrategy,
      rothConversion,
      residenceState: scenarioData.residenceState || 'Default State',
      owner: user._id,
      ownerBirthYear: scenarioData.birthYears ? scenarioData.birthYears[0] : null,
      ownerLifeExpectancy: ownerLifeExpectancy,
      viewPermissions: [],
      editPermissions: [],
      updatedAt: new Date(),
      // Store any additional fields as metadata if your schema supports it
      // Alternatively, log them for diagnostic purposes
      // afterTaxContributionLimit: scenarioData.afterTaxContributionLimit || 7000,
    });
    
    // Log non-standard fields for diagnostics
    if (scenarioData.afterTaxContributionLimit) {
      console.log(`afterTaxContributionLimit: ${scenarioData.afterTaxContributionLimit}`);
    }

    // Add spouse data if it's a couple scenario
    if (scenarioType === 'couple' && scenarioData.birthYears && scenarioData.birthYears.length > 1) {
      scenarioDoc.spouseBirthYear = scenarioData.birthYears[1];
      
      if (scenarioData.lifeExpectancy && scenarioData.lifeExpectancy.length > 1) {
        const spouseLifeExpectancy: DistributionValues = createDistribution(
          scenarioData.lifeExpectancy[1], 
          'amount'
        );
        
        scenarioDoc.spouseLifeExpectancy = spouseLifeExpectancy;
      }
      
      await scenarioDoc.save();
    }

    // Link the scenario to the user
    user.createdScenarios.push(scenarioDoc._id);
    await user.save();
    return NextResponse.json({
      success: true, 
      message: 'Scenario imported successfully',
      scenarioId: scenarioDoc._id
    });
  } catch (error) {
    console.error('Error importing scenario:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to import scenario: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, 
      { status: 500 }
    );
  }
}

// Add a function to generate and store id variants
function storeInvestmentIdVariants(originalId: string, docId: Types.ObjectId, idMap: Map<string, Types.ObjectId>) {
  // Store the original ID
  idMap.set(originalId, docId);
  
  // Store normalized version
  const normalizedId = normalizeInvestmentId(originalId);
  idMap.set(normalizedId, docId);
  
  // Store version with removed spaces
  const noSpacesId = originalId.replace(/\s+/g, '');
  idMap.set(noSpacesId, docId);
  
  // Store version with S&P variations
  if (originalId.includes('S&P')) {
    idMap.set(originalId.replace('S&P', 'SP'), docId);
    idMap.set(originalId.replace('S&P', 'S P'), docId);
    idMap.set(originalId.replace('S&P', 'S and P'), docId);
  }
  
  if (originalId.includes('SP')) {
    idMap.set(originalId.replace('SP', 'S&P'), docId);
  }
  
  // Log all variants for debugging
  console.log(`Stored investment ID variants for: ${originalId}`);
}