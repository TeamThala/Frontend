// import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth/next';
// import { authOptions } from '@/lib/auth';
// import dbConnect from '@/lib/dbConnect';
// import User from '@/models/User';
// import Scenario from '@/models/Scenario';
// import Investment from '@/models/Investment';
// import InvestmentType from '@/models/InvestmentType';
// import Event from '@/models/Event';
// import mongoose from 'mongoose';
// import * as yaml from 'js-yaml';

// // This is the correct way to configure the API route in Next.js App Router
// export const dynamic = 'force-dynamic';
// export const dynamicParams = true;
// export const revalidate = 0;

// export async function POST(request: NextRequest) {
//   try {
//     await dbConnect();

//     // Get session to authenticate the user
//     const session = await getServerSession(authOptions);
//     if (!session || !session.user?.email) {
//       return NextResponse.json(
//         { success: false, error: 'Authentication required' },
//         { status: 401 }
//       );
//     }

//     // Find the user in the database
//     const user = await User.findOne({ email: session.user.email });
//     if (!user) {
//       return NextResponse.json(
//         { success: false, error: 'User not found' },
//         { status: 404 }
//       );
//     }

//     // Read and parse the YAML file from the form data
//     const formData = await request.formData();
//     const file = formData.get('file') as File;
    
//     if (!file) {
//       return NextResponse.json(
//         { success: false, error: 'No file uploaded' },
//         { status: 400 }
//       );
//     }

//     // Check if file is a YAML file
//     if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
//       return NextResponse.json(
//         { success: false, error: 'File must be a YAML file' },
//         { status: 400 }
//       );
//     }

//     // Read the file content and parse it as YAML
//     const fileContent = await file.text();
//     const scenarioData: any = yaml.load(fileContent);

//     // Generate unique IDs for all entities
//     const generateUniqueId = () => new mongoose.Types.ObjectId().toString();

//     // Map to keep track of investment types
//     const investmentTypeMap = new Map<string, mongoose.Types.ObjectId>();
//     const investmentMap = new Map<string, mongoose.Types.ObjectId>();
//     const eventMap = new Map<string, mongoose.Types.ObjectId>();

//     // Step 1: Create investment types from the YAML file
//     const investmentTypeIds: mongoose.Types.ObjectId[] = [];
//     for (const invType of scenarioData.investmentTypes || []) {
//       const uniqueId = generateUniqueId();

//       // Create the investment type document
//       const investmentTypeDoc = await InvestmentType.create({
//         id: uniqueId,
//         name: invType.name,
//         description: invType.description || 'No description',
//         expectedAnnualReturn: {
//           type: invType.returnDistribution.type,
//           valueType: invType.returnAmtOrPct === 'percent' ? 'percentage' : invType.returnAmtOrPct,
//           value: invType.returnDistribution.value,
//           mean: invType.returnDistribution.mean,
//           stdDev: invType.returnDistribution.stdev,
//           min: invType.returnDistribution.lower,
//           max: invType.returnDistribution.upper,
//         },
//         expenseRatio: invType.expenseRatio,
//         expectedAnnualIncome: {
//           type: invType.incomeDistribution.type,
//           valueType: invType.returnAmtOrPct === 'percent' ? 'percentage' : invType.returnAmtOrPct,
//           value: invType.incomeDistribution.value,
//           mean: invType.incomeDistribution.mean,
//           stdDev: invType.incomeDistribution.stdev,
//           min: invType.incomeDistribution.lower,
//           max: invType.incomeDistribution.upper,
//         },
//         taxability: invType.taxability,
//       });

//       investmentTypeIds.push(investmentTypeDoc._id);
//       investmentTypeMap.set(invType.name, investmentTypeDoc._id);
//     }

//     // Step 2: Create investments from the YAML file
//     const investmentIds: mongoose.Types.ObjectId[] = [];
//     for (const inv of scenarioData.investments || []) {
//       const uniqueId = generateUniqueId();
//       const investmentTypeId = investmentTypeMap.get(inv.investmentType);

//       if (!investmentTypeId) {
//         return NextResponse.json(
//           { success: false, error: `Investment type not found: ${inv.investmentType}` },
//           { status: 400 }
//         );
//       }

//       // Create the investment document
//       const investmentDoc = await Investment.create({
//         id: uniqueId,
//         value: inv.value,
//         taxStatus: inv.taxStatus,
//         investmentType: investmentTypeId,
//       });

//       investmentIds.push(investmentDoc._id);
//       const normalizedId = inv.id.replace(/\s+/g, '');
//       investmentMap.set(inv.id, investmentDoc._id);          // original
//       investmentMap.set(normalizedId, investmentDoc._id);    // normalized

//     }

//     // Step 3: Create events from the YAML file
//     const eventIds: mongoose.Types.ObjectId[] = [];
//     for (const evt of scenarioData.eventSeries || []) {
//       const uniqueId = generateUniqueId();

//       // Process start year/date
//     let startYear = {};

//     if (evt.start.type === 'fixed' || evt.start.type === 'normal' || evt.start.type === 'uniform') {
//     // For a fixed type, use 'year' instead of 'value'
//     startYear = {
//         type: evt.start.type,
//         ...(evt.start.type === 'fixed' ? { year: evt.start.value } : { 
//         value: evt.start.value, // or any other mapping as needed for normal or uniform distributions
//         mean: evt.start.mean,
//         stdDev: evt.start.stdev,
//         min: evt.start.lower,
//         max: evt.start.upper,
//         }),
//     };
//     } else if (evt.start.type === 'startWith' || evt.start.type === 'startAfter') {
//     startYear = {
//         type: 'event',
//         event: null, // to be resolved later
//         eventTime: evt.start.type === 'startWith' ? 'start' : 'end',
//     };
//     // Save dependency info for later resolution
//     const dependencyName = evt.start.eventSeries;
//     eventMap.set(`${evt.name}-dependency`, dependencyName);
//     }


//       // Process duration
//       let duration: any = null;
//       if (evt.duration) {
//         duration = {
//           type: evt.duration.type,
//           value: evt.duration.value, // Use value for fixed type
//           mean: evt.duration.mean,
//           stdDev: evt.duration.stdev,
//           min: evt.duration.lower,
//           max: evt.duration.upper,
//         };
//       }

//       // Process event type based on the event's type (income, expense, invest, rebalance)
//       let eventType: any = {
//         type: evt.type === "invest" ? "investment" : evt.type,
//       };

//       if (evt.type === 'income') {
//         eventType.amount = evt.initialAmount;
//         eventType.expectedAnnualChange = {
//           type: evt.changeDistribution.type,
//           valueType: evt.returnAmtOrPct === 'percent' ? 'percentage' : evt.returnAmtOrPct,
//           value: evt.changeDistribution.value,
//           mean: evt.changeDistribution.mean,
//           stdDev: evt.changeDistribution.stdev,
//           min: evt.changeDistribution.lower,
//           max: evt.changeDistribution.upper,
//         };
//         eventType.inflationAdjustment = evt.inflationAdjusted;
//         eventType.percentageOfIncome = evt.userFraction;
//         eventType.socialSecurity = evt.socialSecurity || false;
//         eventType.wage = evt.wage || false;
//       } else if (evt.type === 'expense') {
//         eventType.amount = evt.initialAmount;
//         eventType.expectedAnnualChange = {
//           type: evt.changeDistribution.type,
//           valueType: evt.returnAmtOrPct === 'percent' ? 'percentage' : evt.returnAmtOrPct,
//           value: evt.changeDistribution.value,
//           mean: evt.changeDistribution.mean,
//           stdDev: evt.changeDistribution.stdev,
//           min: evt.changeDistribution.lower,
//           max: evt.changeDistribution.upper,
//         };
//         eventType.inflationAdjustment = evt.inflationAdjusted;
//         eventType.percentageOfIncome = evt.userFraction;
//         eventType.discretionary = evt.discretionary || false;
//       } else if (evt.type === 'invest' || evt.type === 'rebalance') {
//         // Process asset allocation
//         const assetAllocation: any[] = [];
//         const isGlidePath = evt.glidePath || false;

//         if (evt.assetAllocation) {
//           for (const [investmentId, percentage] of Object.entries(evt.assetAllocation)) {
//             const normalizedId = investmentId.replace(/\s+/g, '');
//             const mongoInvestmentId = investmentMap.get(investmentId) || investmentMap.get(normalizedId);

//             if (!mongoInvestmentId) {
//               return NextResponse.json(
//                 { success: false, error: `Investment not found for allocation: ${investmentId}` },
//                 { status: 400 }
//               );
//             }

//             assetAllocation.push({
//               type: isGlidePath ? 'glidePath' : 'fixed',
//               investment: mongoInvestmentId,
//               percentage: percentage as number,
//               initialPercentage: percentage as number,
//               finalPercentage: isGlidePath ? (evt.assetAllocation2[investmentId] || 0) : (percentage as number),
//             });
//           }
//         }

//         eventType.assetAllocation = assetAllocation;
//         eventType.maximumCash = evt.maxCash || 0;
//       }

//       // Create the event document
//       const eventDoc = await Event.create({
//         name: evt.name,
//         description: evt.description || '',
//         startYear,
//         duration,
//         eventType,
//       });

//       eventIds.push(eventDoc._id);
//       eventMap.set(evt.name, eventDoc._id);
//     }

//     // Step 4: Resolve event dependencies
//     for (const [key, dependencyName] of eventMap.entries()) {
//       if (key.endsWith('-dependency')) {
//         const eventName = key.replace('-dependency', '');
//         const event = await Event.findOne({ name: eventName });
        
//         if (event && event.startYear.type === 'event') {
//           const dependentEventId = eventMap.get(dependencyName as unknown as string);
//           if (dependentEventId) {
//             event.startYear.event = dependentEventId;
//             await event.save();
//           }
//         }
//       }
//     }

//     // Step 5: Create the scenario
//     const scenarioId = generateUniqueId();
    
//     // Determine scenario type (single or couple)
//     const scenarioType = scenarioData.maritalStatus === 'couple' ? 'married' : 'single';
    
//     // Process spending strategy and expense withdrawal strategy
//     const spendingStrategy: mongoose.Types.ObjectId[] = [];
//     for (const eventName of scenarioData.spendingStrategy || []) {
//       const eventId = eventMap.get(eventName);
//       if (eventId) {
//         spendingStrategy.push(eventId);
//       }
//     }
    
//     const expenseWithdrawalStrategy: mongoose.Types.ObjectId[] = [];
//     for (const investmentId of scenarioData.expenseWithdrawalStrategy || []) {
//         const normalizedId = investmentId.replace(/\s+/g, '');
//         const mongoInvestmentId = investmentMap.get(investmentId) || investmentMap.get(normalizedId);
        
//       if (mongoInvestmentId) {
//         expenseWithdrawalStrategy.push(mongoInvestmentId);
//       }
//     }
    
//     // Process Roth conversion strategy
//     const rothConversionStrategy: any[] = [];
//     if (scenarioData.RothConversionOpt) {
//       const rothInvestments: mongoose.Types.ObjectId[] = [];
//       for (const investmentId of scenarioData.RothConversionStrategy || []) {
//         const normalizedId = investmentId.replace(/\s+/g, '');
//         const mongoInvestmentId = investmentMap.get(investmentId) || investmentMap.get(normalizedId);

//         if (mongoInvestmentId) {
//           rothInvestments.push(mongoInvestmentId);
//         }
//       }
      
//       rothConversionStrategy.push({
//         startYear: scenarioData.RothConversionStart,
//         endYear: scenarioData.RothConversionEnd,
//         investmentOrder: rothInvestments,
//       });
//     }
    
//     // Create the scenario document
//     const scenarioDoc = await Scenario.create({
//       id: scenarioId,
//       type: scenarioType,
//       name: scenarioData.name || 'Imported Scenario',
//       description: scenarioData.description || 'Imported from YAML file',
//       financialGoal: scenarioData.financialGoal || 0,
//       investments: investmentIds,
//       eventSeries: eventIds,
//       spendingStrategy,
//       expenseWithdrawalStrategy,
//       inflationRate: {
//         type: scenarioData.inflationAssumption.type,
//         valueType: 'percentage',
//         value: scenarioData.inflationAssumption.value,
//         mean: scenarioData.inflationAssumption.mean,
//         stdDev: scenarioData.inflationAssumption.stdev,
//         min: scenarioData.inflationAssumption.lower,
//         max: scenarioData.inflationAssumption.upper,
//       },
//       RothConversionStrategy: rothConversionStrategy,
//       RMDStrategy: [], // TODO: Process RMD strategy from YAML
//       rothConversion: {
//         rothConversion: scenarioData.RothConversionOpt || false,
//         RothConversionStartYear: scenarioData.RothConversionStart || null,
//         RothConversionEndYear: scenarioData.RothConversionEnd || null,
//       },
//       residenceState: scenarioData.residenceState || 'Default State',
//       owner: user._id,
//       ownerBirthYear: scenarioData.birthYears ? scenarioData.birthYears[0] : null,
//       ownerLifeExpectancy: scenarioData.lifeExpectancy ? {
//         type: scenarioData.lifeExpectancy[0].type,
//         valueType: 'year',
//         value: scenarioData.lifeExpectancy[0].value,
//         mean: scenarioData.lifeExpectancy[0].mean,
//         stdDev: scenarioData.lifeExpectancy[0].stdev,
//         min: scenarioData.lifeExpectancy[0].lower,
//         max: scenarioData.lifeExpectancy[0].upper,
//       } : null,
//       viewPermissions: [],
//       editPermissions: [],
//       updatedAt: new Date()
//     });

//     // Add spouse data if it's a couple scenario
//     if (scenarioType === 'married' && scenarioData.birthYears && scenarioData.birthYears.length > 1) {
//       scenarioDoc.spouseBirthYear = scenarioData.birthYears[1];
      
//       if (scenarioData.lifeExpectancy && scenarioData.lifeExpectancy.length > 1) {
//         scenarioDoc.spouseLifeExpectancy = {
//           type: scenarioData.lifeExpectancy[1].type,
//           valueType: 'year',
//           value: scenarioData.lifeExpectancy[1].value,
//           mean: scenarioData.lifeExpectancy[1].mean,
//           stdDev: scenarioData.lifeExpectancy[1].stdev,
//           min: scenarioData.lifeExpectancy[1].lower,
//           max: scenarioData.lifeExpectancy[1].upper,
//         };
//       }
      
//       await scenarioDoc.save();
//     }

//     // Link the scenario to the user
//     user.createdScenarios.push(scenarioDoc._id);
//     await user.save();

//     return NextResponse.json({
//       success: true, 
//       message: 'Scenario imported successfully',
//       scenarioId: scenarioDoc._id
//     });
//   } catch (error) {
//     console.error('Error importing scenario:', error);
//     return NextResponse.json(
//       { 
//         success: false, 
//         error: `Failed to import scenario: ${error instanceof Error ? error.message : 'Unknown error'}`
//       }, 
//       { status: 500 }
//     );
//   }
// }
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
    investment: Types.ObjectId;
    percentage: number;
    initialPercentage: number;
    finalPercentage: number;
  }>;
  maximumCash?: number;
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

    // Generate unique IDs for all entities
    const generateUniqueId = () => new mongoose.Types.ObjectId().toString();

    // Map to keep track of investment types
    const investmentTypeMap = new Map<string, Types.ObjectId>();
    const investmentMap = new Map<string, Types.ObjectId>();
    const eventMap = new Map<string, Types.ObjectId | string>();

    // Step 1: Create investment types from the YAML file
    const investmentTypeIds: Types.ObjectId[] = [];
    for (const invType of scenarioData.investmentTypes || []) {
      const uniqueId = generateUniqueId();

      // Create the distribution objects with proper typing
      const returnDistribution: DistributionValues = {
        type: invType.returnDistribution.type,
        valueType: invType.returnAmtOrPct === 'percent' ? 'percentage' : 'amount',
        value: invType.returnDistribution.value,
        mean: invType.returnDistribution.mean,
        stdDev: invType.returnDistribution.stdev,
        min: invType.returnDistribution.lower,
        max: invType.returnDistribution.upper,
      };

      const incomeDistribution: DistributionValues = {
        type: invType.incomeDistribution.type,
        valueType: invType.returnAmtOrPct === 'percent' ? 'percentage' : 'amount',
        value: invType.incomeDistribution.value,
        mean: invType.incomeDistribution.mean,
        stdDev: invType.incomeDistribution.stdev,
        min: invType.incomeDistribution.lower,
        max: invType.incomeDistribution.upper,
      };

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
      const uniqueId = generateUniqueId();
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
      const normalizedId = inv.id.replace(/\s+/g, '');
      investmentMap.set(inv.id, investmentDoc._id);          // original
      investmentMap.set(normalizedId, investmentDoc._id);    // normalized
    }

    // Step 3: Create events from the YAML file
    const eventIds: Types.ObjectId[] = [];
    for (const evt of scenarioData.eventSeries || []) {
      const uniqueId = generateUniqueId();

      // Process start year/date
      const startYear: StartYear = {
        type: evt.start.type,
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
        startYear.type = 'event';
        startYear.event = undefined; // to be resolved later
        startYear.eventTime = evt.start.type === 'startWith' ? 'start' : 'end';
        
        // Save dependency info for later resolution
        const dependencyName = evt.start.eventSeries as string;
        eventMap.set(`${evt.name}-dependency`, dependencyName);
      }

      // Process duration
      let duration: Duration | undefined = undefined;
      if (evt.duration) {
        duration = {
          type: evt.duration.type,
        };

        if (evt.duration.type === 'fixed') {
          duration.year = evt.duration.value;
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
          eventType.expectedAnnualChange = {
            type: evt.changeDistribution.type,
            valueType: evt.returnAmtOrPct === 'percent' ? 'percentage' : 'amount',
            value: evt.changeDistribution.value,
            mean: evt.changeDistribution.mean,
            stdDev: evt.changeDistribution.stdev,
            min: evt.changeDistribution.lower,
            max: evt.changeDistribution.upper,
          };
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
          investment: Types.ObjectId;
          percentage: number;
          initialPercentage: number;
          finalPercentage: number;
        }> = [];
        
        const isGlidePath = evt.glidePath || false;

        if (evt.assetAllocation) {
          for (const [investmentId, percentage] of Object.entries(evt.assetAllocation)) {
            const normalizedId = investmentId.replace(/\s+/g, '');
            const mongoInvestmentId = investmentMap.get(investmentId) || investmentMap.get(normalizedId);

            if (!mongoInvestmentId) {
              return NextResponse.json(
                { success: false, error: `Investment not found for allocation: ${investmentId}` },
                { status: 400 }
              );
            }

            assetAllocation.push({
              type: isGlidePath ? 'glidePath' : 'fixed',
              investment: mongoInvestmentId,
              percentage: percentage as number,
              initialPercentage: percentage as number,
              finalPercentage: isGlidePath && evt.assetAllocation2 ? 
                (evt.assetAllocation2[investmentId] || 0) : (percentage as number),
            });
          }
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
      if (key.endsWith('-dependency')) {
        const eventName = key.replace('-dependency', '');
        const event = await Event.findOne({ name: eventName });
        
        if (event && event.startYear.type === 'event') {
          const dependentEventId = eventMap.get(dependencyName as string);
          if (dependentEventId && typeof dependentEventId !== 'string') {
            event.startYear.event = dependentEventId;
            await event.save();
          }
        }
      }
    }

    // Step 5: Create the scenario
    const scenarioId = generateUniqueId();
    
    // Determine scenario type (single or couple)
    const scenarioType = scenarioData.maritalStatus;
    
    // Process spending strategy and expense withdrawal strategy
    const spendingStrategy: Types.ObjectId[] = [];
    for (const eventName of scenarioData.spendingStrategy || []) {
      const eventId = eventMap.get(eventName);
      if (eventId && typeof eventId !== 'string') {
        spendingStrategy.push(eventId);
      }
    }
    
    const expenseWithdrawalStrategy: Types.ObjectId[] = [];
    for (const investmentId of scenarioData.expenseWithdrawalStrategy || []) {
      const normalizedId = investmentId.replace(/\s+/g, '');
      const mongoInvestmentId = investmentMap.get(investmentId) || investmentMap.get(normalizedId);
        
      if (mongoInvestmentId) {
        expenseWithdrawalStrategy.push(mongoInvestmentId);
      }
    }
    
    // Process Roth conversion strategy
    const rothConversionStrategy: Array<{
      startYear: number;
      endYear: number;
      investmentOrder: Types.ObjectId[];
    }> = [];
    
    if (scenarioData.RothConversionOpt) {
      const rothInvestments: Types.ObjectId[] = [];
      for (const investmentId of scenarioData.RothConversionStrategy || []) {
        const normalizedId = investmentId.replace(/\s+/g, '');
        const mongoInvestmentId = investmentMap.get(investmentId) || investmentMap.get(normalizedId);

        if (mongoInvestmentId) {
          rothInvestments.push(mongoInvestmentId);
        }
      }
      
      rothConversionStrategy.push({
        startYear: scenarioData.RothConversionStart || 0,
        endYear: scenarioData.RothConversionEnd || 0,
        investmentOrder: rothInvestments,
      });
    }
    
    // Create inflation rate object
    const inflationRate: DistributionValues = {
      type: scenarioData.inflationAssumption.type,
      valueType: 'percentage',
      value: scenarioData.inflationAssumption.value,
      mean: scenarioData.inflationAssumption.mean,
      stdDev: scenarioData.inflationAssumption.stdev,
      min: scenarioData.inflationAssumption.lower,
      max: scenarioData.inflationAssumption.upper,
    };

    // Create Roth conversion object
    const rothConversion = {
      rothConversion: scenarioData.RothConversionOpt || false,
      RothConversionStartYear: scenarioData.RothConversionStart || null,
      RothConversionEndYear: scenarioData.RothConversionEnd || null,
    };

    // Create life expectancy object for owner
    let userLifeExpectancy: DistributionValues | null = null;
    if (scenarioData.lifeExpectancy && scenarioData.lifeExpectancy.length > 0) {
      userLifeExpectancy = {
        type: scenarioData.lifeExpectancy[0].type,
        valueType: 'year',
        value: scenarioData.lifeExpectancy[0].value,
        mean: scenarioData.lifeExpectancy[0].mean,
        stdDev: scenarioData.lifeExpectancy[0].stdev,
        min: scenarioData.lifeExpectancy[0].lower,
        max: scenarioData.lifeExpectancy[0].upper,
      };
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
      RothConversionStrategy: rothConversionStrategy,
      RMDStrategy: [], // TODO: Process RMD strategy from YAML
      rothConversion,
      residenceState: scenarioData.residenceState || 'Default State',
      owner: user._id,
      userBirthYear: scenarioData.birthYears ? scenarioData.birthYears[0] : null,
      userLifeExpectancy,
      viewPermissions: [],
      editPermissions: [],
      updatedAt: new Date()
    });
    console.log(scenarioType);

    // Add spouse data if it's a couple scenario
    if (scenarioType === 'couple' && scenarioData.birthYears && scenarioData.birthYears.length > 1) {
      scenarioDoc.spouseBirthYear = scenarioData.birthYears[1];
      
      if (scenarioData.lifeExpectancy && scenarioData.lifeExpectancy.length > 1) {
        const spouseLifeExpectancy: DistributionValues = {
          type: scenarioData.lifeExpectancy[1].type,
          valueType: 'year',
          value: scenarioData.lifeExpectancy[1].value,
          mean: scenarioData.lifeExpectancy[1].mean,
          stdDev: scenarioData.lifeExpectancy[1].stdev,
          min: scenarioData.lifeExpectancy[1].lower,
          max: scenarioData.lifeExpectancy[1].upper,
        };
        
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