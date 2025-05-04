// import { NextRequest, NextResponse } from 'next/server';
// import mongoose from 'mongoose';
// import dbConnect from '@/lib/dbConnect';
// import "@/models/Investment";
// import "@/models/Event";
// import "@/models/User";
// import "@/models/InvestmentType";
// import Scenario from '@/models/Scenario';
// import { getServerSession } from 'next-auth/next';
// import { authOptions } from '@/lib/auth';
// // import Investment from "@/models/Investment";
// // import InvestmentType from "@/models/InvestmentType";
// import Event from "@/models/Event";
// import User from "@/models/User";
// import { CoupleScenario } from "@/types/scenario";
// import InvestmentType from '@/models/InvestmentType';
// import Investment from '@/models/Investment';


// export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
//   await dbConnect();
//   const scenarioId = (await params).id;

//   if (!scenarioId || !mongoose.Types.ObjectId.isValid(scenarioId)) {
//     return NextResponse.json({ success: false, error: "Invalid scenario ID" }, { status: 400 });
//   }
  
//   // Get the user session
//   const session = await getServerSession(authOptions);
//   // Check if user is authenticated
//   if (!session || !session.user?.email) {
//     return NextResponse.json(
//       { success: false, error: 'Authentication required' }, 
//       { status: 401 }
//     );
//   }

//   try {
//     const scenario = await Scenario.findById(scenarioId)
//     // Local storage for guest user
//       .populate({
//         path: 'investments',
//         populate: { path: 'investmentType' }
//       })
//       .populate('eventSeries')
//       .populate('spendingStrategy')
//       .populate('expenseWithdrawalStrategy')

//     if (!scenario) {
//       return NextResponse.json({ success: false, error: 'Scenario not found' }, { status: 404 });
//     }

//     // Check if this is a guest scenario (no owner or owner is "Guest")
//     const isGuestScenario = !scenario.owner || scenario.owner.toString() === "Guest";
    
//     if (isGuestScenario) {
//       // For guest scenarios, anyone with the session can view
//       return NextResponse.json({ 
//         success: true, 
//         scenario, 
//         isOwner: false, 
//         hasEditPermission: true,  // Allow editing for guest scenarios
//         hasViewPermission: true 
//       }, { status: 200 });
//     }

//     // For non-guest scenarios, check permissions
//     const user = await User.findOne({ email: session.user.email });
//     if (!user) {
//       return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
//     }
//     // Include stateTaxFiles map to return to frontend
//     const stateTaxFiles = Object.fromEntries(user.stateTaxFiles || []);


//     // Check if user has permission to view this scenario
//     const isOwner = scenario.owner.toString() === user._id.toString();
//     const hasEditPermission = user.readWriteScenarios.some(
//       (id: mongoose.Types.ObjectId) => id.toString() === scenarioId
//     );
//     const hasViewPermission = scenario.viewPermissions.some(
//       (id: mongoose.Types.ObjectId) => id.toString() === user._id.toString()
//     );

//     if (!isOwner && !hasViewPermission && !hasEditPermission) {
//       return NextResponse.json(
//         { success: false, error: 'You do not have permission to view this scenario' }, 
//         { status: 401 }
//       );
//     }

    

//     return NextResponse.json({ success: true, scenario, isOwner, hasEditPermission, hasViewPermission, stateTaxFiles }, { status: 200 });
//   } catch (error) {
//     console.error('Error fetching scenario:', error);
//     return NextResponse.json({ success: false, error: 'Failed to fetch scenario' }, { status: 500 });
//   }
// }

// export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
//   await dbConnect();
//   const scenarioId = (await params).id;

//   if (!scenarioId || !mongoose.Types.ObjectId.isValid(scenarioId)) {
//     return NextResponse.json({ success: false, error: "Invalid scenario ID" }, { status: 400 });
//   }

//   // Get the user session
//   const session = await getServerSession(authOptions);
//   // Check if user is authenticated
//   if (!session || !session.user?.email) {
//     return NextResponse.json(
//       { success: false, error: 'Authentication required' }, 
//       { status: 401 }
//     );
//   }

//   try {
//     // Find the scenario
//     const scenario = await Scenario.findById(scenarioId);
    
//     if (!scenario) {
//       return NextResponse.json({ success: false, error: 'Scenario not found' }, { status: 404 });
//     }

//     // Parse the request body
//     const body: CoupleScenario = await req.json();
    
//     // 1. Update General Information
//     scenario.name = body.name;
//     scenario.description = body.description;
//     scenario.financialGoal = body.financialGoal;
//     scenario.residenceState = body.residenceState;
//     scenario.inflationRate = body.inflationRate;
//     scenario.ownerBirthYear = body.ownerBirthYear;
//     scenario.ownerLifeExpectancy = body.ownerLifeExpectancy;
//     scenario.type = body.type;
//     if (scenario.type === "couple") {
//       scenario.spouseBirthYear = body.spouseBirthYear;
//       scenario.spouseLifeExpectancy = body.spouseLifeExpectancy;
//     }
    
//     // 2. Update Investments
//     for (const investment of body.investments) {
//       // Check if this is an existing investment from MongoDB (has valid ObjectId in _id)
//       if(investment._id && mongoose.Types.ObjectId.isValid(investment._id)) {
//         // Update existing investment with valid MongoDB ObjectId
//         const existingInvestment = await Investment.findById(investment._id);
        
//         if(!existingInvestment) continue;
        
//         let investmentTypeId;
        
//         // Check if investment type has a valid MongoDB _id
//         if(investment.investmentType._id && mongoose.Types.ObjectId.isValid(investment.investmentType._id)) {
//           const existingInvestmentType = await InvestmentType.findById(investment.investmentType._id);
          
//           if(existingInvestmentType) {
//             // Update existing investment type
//             existingInvestmentType.name = investment.investmentType.name;
//             existingInvestmentType.description = investment.investmentType.description;
//             existingInvestmentType.expectedAnnualReturn = investment.investmentType.expectedAnnualReturn;
//             existingInvestmentType.expectedAnnualIncome = investment.investmentType.expectedAnnualIncome;
//             existingInvestmentType.taxability = investment.investmentType.taxability;
//             existingInvestmentType.expenseRatio = investment.investmentType.expenseRatio;
            
//             await existingInvestmentType.save();
//             investmentTypeId = existingInvestmentType._id;
//           }
//         } else {
//           // Create new investment type since the existing one doesn't have a valid MongoDB _id
//           const investmentTypeData = { 
//             name: investment.investmentType.name,
//             description: investment.investmentType.description,
//             expectedAnnualReturn: investment.investmentType.expectedAnnualReturn,
//             expectedAnnualIncome: investment.investmentType.expectedAnnualIncome,
//             taxability: investment.investmentType.taxability,
//             expenseRatio: investment.investmentType.expenseRatio
//           };
          
//           const newInvestmentType = new InvestmentType(investmentTypeData);
//           await newInvestmentType.save();
//           investmentTypeId = newInvestmentType._id;
//         }
        
//         // Update the investment
//         existingInvestment.investmentType = investmentTypeId;
//         existingInvestment.purchasePrice = investment.purchasePrice;
//         existingInvestment.value = investment.value;
//         existingInvestment.taxStatus = investment.taxStatus;
//         await existingInvestment.save();
//       } else {
//         // Create new investment type
//         const investmentTypeData = { 
//           name: investment.investmentType.name,
//           description: investment.investmentType.description,
//           expectedAnnualReturn: investment.investmentType.expectedAnnualReturn,
//           expectedAnnualIncome: investment.investmentType.expectedAnnualIncome,
//           taxability: investment.investmentType.taxability,
//           expenseRatio: investment.investmentType.expenseRatio
//         };
        
//         const newInvestmentType = new InvestmentType(investmentTypeData);
//         await newInvestmentType.save();
        
//         // Create new investment
//         const newInvestment = new Investment({
//           value: investment.value,
//           purchasePrice: investment.purchasePrice,
//           taxStatus: investment.taxStatus,
//           investmentType: newInvestmentType._id
//         });
        
//         await newInvestment.save();
//         scenario.investments.push(newInvestment._id);
//       }
//     }
    
//     // 3. Update Events
//     for (const event of body.eventSeries) {
//       // Check if this is an existing event with a valid MongoDB ObjectId
//       if (event._id && mongoose.Types.ObjectId.isValid(event._id)) {
//         // This is an existing event with a valid MongoDB _id
//         const existingEvent = await Event.findById(event._id);
//         if (!existingEvent) continue;

//         // Process event data before saving
//         const eventToSave = { ...event };
        
//         // Handle special event types with investment references
//         if (eventToSave.eventType.type === "investment" && eventToSave.eventType.assetAllocation) {
//           // Fix investment event's assetAllocation
//           let assetAllocationData;
          
//           // Handle assetAllocation regardless if it comes as an array or direct object
//           if (Array.isArray(eventToSave.eventType.assetAllocation)) {
//             assetAllocationData = eventToSave.eventType.assetAllocation[0] || {
//               type: "fixed",
//               investments: [],
//               percentages: []
//             };
//           } else {
//             assetAllocationData = eventToSave.eventType.assetAllocation;
//           }
          
//           // Ensure assetAllocation data is properly structured
//           const assetAllocation = { ...assetAllocationData };
          
//           // Update asset allocation investments
//           if (assetAllocation.type === "fixed") {
//             assetAllocation.percentages = assetAllocation.percentages || [];
//           } else if (assetAllocation.type === "glidePath") {
//             assetAllocation.initialPercentages = assetAllocation.initialPercentages || [];
//             assetAllocation.finalPercentages = assetAllocation.finalPercentages || [];
//           }
          
//           // Store as an array to match the MongoDB schema
//           eventToSave.eventType.assetAllocation = assetAllocation;
//         } 
//         else if (eventToSave.eventType.type === "rebalance" && eventToSave.eventType.portfolioDistribution) {
//           // Fix rebalance event's portfolioDistribution
//           let portfolioDistributionData;
          
//           // Handle portfolioDistribution regardless if it comes as an array or direct object
//           if (Array.isArray(eventToSave.eventType.portfolioDistribution)) {
//             portfolioDistributionData = eventToSave.eventType.portfolioDistribution[0] || {
//               type: "fixed",
//               investments: [],
//               percentages: []
//             };
//           } else {
//             portfolioDistributionData = eventToSave.eventType.portfolioDistribution;
//           }
          
//           const portfolioDistribution = { ...portfolioDistributionData };
          
//           // Update portfolio distribution investments
//           if (portfolioDistribution.type === "fixed") {
//             portfolioDistribution.percentages = portfolioDistribution.percentages || [];
//           } else if (portfolioDistribution.type === "glidePath") {
//             portfolioDistribution.initialPercentages = portfolioDistribution.initialPercentages || [];
//             portfolioDistribution.finalPercentages = portfolioDistribution.finalPercentages || [];
//           }
          
//           // Store as an array to match the MongoDB schema
//           eventToSave.eventType.portfolioDistribution = portfolioDistribution;
//         }

//         // Update the existing event with the processed data
//         existingEvent.name = eventToSave.name;
//         existingEvent.description = eventToSave.description;
//         existingEvent.startYear = eventToSave.startYear;
//         existingEvent.duration = eventToSave.duration;
//         existingEvent.eventType = eventToSave.eventType;
//         await existingEvent.save();
//       } else {
//         // Create new event - strip any existing id or _id values
//         const eventData = { ...event } as Record<string, unknown>;
        
//         // Process event data before creating a new document
//         if (event.eventType.type === "investment" && event.eventType.assetAllocation) {
//           // Fix investment event's assetAllocation
//           let assetAllocationData;
          
//           // Handle assetAllocation regardless if it comes as an array or direct object
//           if (Array.isArray(event.eventType.assetAllocation)) {
//             assetAllocationData = event.eventType.assetAllocation[0] || {
//               type: "fixed",
//               investments: [],
//               percentages: []
//             };
//           } else {
//             assetAllocationData = event.eventType.assetAllocation;
//           }
          
//           // Ensure assetAllocation data is properly structured
//           const assetAllocation = { ...assetAllocationData };
          
//           // Ensure percentages are initialized
//           if (assetAllocation.type === "fixed") {
//             assetAllocation.percentages = assetAllocation.percentages || [];
//           } else if (assetAllocation.type === "glidePath") {
//             assetAllocation.initialPercentages = assetAllocation.initialPercentages || [];
//             assetAllocation.finalPercentages = assetAllocation.finalPercentages || [];
//           }
          
//           // Store as an array to match the MongoDB schema
//           eventData.eventType = {
//             ...event.eventType,
//             assetAllocation
//           };
//         } 
//         else if (event.eventType.type === "rebalance" && event.eventType.portfolioDistribution) {
//           // Fix rebalance event's portfolioDistribution
//           let portfolioDistributionData;
          
//           // Handle portfolioDistribution regardless if it comes as an array or direct object
//           if (Array.isArray(event.eventType.portfolioDistribution)) {
//             portfolioDistributionData = event.eventType.portfolioDistribution[0] || {
//               type: "fixed",
//               investments: [],
//               percentages: []
//             };
//           } else {
//             portfolioDistributionData = event.eventType.portfolioDistribution;
//           }
          
//           const portfolioDistribution = { ...portfolioDistributionData };
          
//           // Ensure percentages are initialized
//           if (portfolioDistribution.type === "fixed") {
//             portfolioDistribution.percentages = portfolioDistribution.percentages || [];
//           } else if (portfolioDistribution.type === "glidePath") {
//             portfolioDistribution.initialPercentages = portfolioDistribution.initialPercentages || [];
//             portfolioDistribution.finalPercentages = portfolioDistribution.finalPercentages || [];
//           }
          
//           eventData.eventType = {
//             ...event.eventType,
//             portfolioDistribution: [portfolioDistribution]
//           };
//         }
        
//         // Remove client-side ids that could cause MongoDB validation errors
//         delete eventData._id;
//         delete eventData.id;  // Remove the UUID from the client side
        
//         // Create and save the event
//         const newEvent = new Event(eventData);
//         console.log("newEvent", newEvent);
//         console.log("newEventType", JSON.stringify(newEvent.eventType, null, 2));
//         await newEvent.save();
//         scenario.eventSeries.push(newEvent._id);
//       }
//     }
//     // 4. Update Spending Strategy
//     // Clear existing spending strategy
//     scenario.spendingStrategy = [];
    
//     // Update spending strategy if it exists in request body
//     if (body.spendingStrategy && Array.isArray(body.spendingStrategy)) {
//       for (const expenseEvent of body.spendingStrategy) {
//         // Only include events that have valid MongoDB IDs
//         if (expenseEvent._id && mongoose.Types.ObjectId.isValid(expenseEvent._id)) {
//           // Verify the event exists
//           const eventExists = await Event.findById(expenseEvent._id);
//           if (eventExists) {
//             scenario.spendingStrategy.push(expenseEvent._id);
//           }
//         }
//       }
//     }
    
//     // 5. Update Expense Withdrawal Strategy
//     // Clear existing expense withdrawal strategy
//     scenario.expenseWithdrawalStrategy = [];
    
//     // Update expense withdrawal strategy if it exists in request body
//     if (body.expenseWithdrawalStrategy && Array.isArray(body.expenseWithdrawalStrategy)) {
//       for (const investmentItem of body.expenseWithdrawalStrategy) {
//         // Only include investments that have valid MongoDB IDs
//         if (investmentItem._id && mongoose.Types.ObjectId.isValid(investmentItem._id)) {
//           // Verify the investment exists
//           const investmentExists = await Investment.findById(investmentItem._id);
//           if (investmentExists) {
//             scenario.expenseWithdrawalStrategy.push(investmentItem._id);
//           }
//         }
//       }
//     }
    
//     // 6. Update RMD Strategy
//     // Clear existing RMD strategy
//     scenario.RMDStrategy = [];
    
//     // Update RMD strategy if it exists in request body
//     if (body.RMDStrategy && Array.isArray(body.RMDStrategy)) {
//       for (const investmentItem of body.RMDStrategy) {
//         // Only include investments that have valid MongoDB IDs
//         if (investmentItem._id && mongoose.Types.ObjectId.isValid(investmentItem._id)) {
//           // Verify the investment exists
//           const investmentExists = await Investment.findById(investmentItem._id);
//           if (investmentExists) {
//             scenario.RMDStrategy.push(investmentItem._id);
//           }
//         }
//       }
//     }
    
//     // 7. Update Roth Conversion Strategy
//     // Clear existing Roth Conversion strategy
//     scenario.RothConversionStrategy = [];
    
//     // Update Roth Conversion strategy if it exists in request body
//     if (body.RothConversionStrategy && Array.isArray(body.RothConversionStrategy)) {
//       for (const investmentItem of body.RothConversionStrategy) {
//         // Only include investments that have valid MongoDB IDs
//         if (investmentItem._id && mongoose.Types.ObjectId.isValid(investmentItem._id)) {
//           // Verify the investment exists
//           const investmentExists = await Investment.findById(investmentItem._id);
//           if (investmentExists) {
//             scenario.RothConversionStrategy.push(investmentItem._id);
//           }
//         }
//       }
//     }
    
//     // 8. Update Roth Conversion settings
//     scenario.rothConversion = body.rothConversion || null;
    
//     // 9. Update Inflation Rate
//     scenario.inflationRate = body.inflationRate;

//     // Save the updated scenario
//     await scenario.save();

//     return NextResponse.json({
//       success: true,
//       message: "Scenario updated successfully",
//       scenarioId: scenario._id
//     });
//   } catch (error) {
//     console.error('Error updating scenario:', error);
//     return NextResponse.json({ 
//       success: false, 
//       error: 'Failed to update scenario', 
//       details: error instanceof Error ? error.message : String(error) 
//     }, { status: 500 });
//   }
// }
// src/app/api/scenarios/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';

import "@/models/Investment";
import "@/models/Event";
import "@/models/User";
import "@/models/InvestmentType";

import Scenario from '@/models/Scenario';
import Event from '@/models/Event';
import InvestmentType from '@/models/InvestmentType';
import Investment from '@/models/Investment';
import User from '@/models/User';
import { FixedYear, UniformYear, NormalYear, EventYear } from "@/types/event";
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { CoupleScenario } from '@/types/scenario';
import { FixedValues, NormalDistributionValues, UniformDistributionValues } from '@/types/utils';

type YearInput = FixedYear | UniformYear | NormalYear | EventYear;
interface InvestmentInput {
  id: string;
    _id?: string;
    value: number;
    investmentType: InvestmentTypeInput;
    taxStatus: "non-retirement" | "pre-tax" | "after-tax";
    purchasePrice?: number;
}
interface InvestmentTypeInput {
  id: string;
    _id?: string;
    name: string;
    description: string;
    expectedAnnualReturn: FixedValues | NormalDistributionValues | UniformDistributionValues | null;
    expenseRatio: number;
    expectedAnnualIncome: FixedValues | NormalDistributionValues | UniformDistributionValues | null;
    taxability: boolean;
}
// ─────────────────────────────────────────────
// Helpers: normalize your TS shapes into the
// exact objects your Mongoose schemas expect
// ─────────────────────────────────────────────

function normalizeStartYear(raw: YearInput) {
  switch (raw.type) {
    case "fixed":
      return { type: "fixed", year: raw.year };
    case "uniform":
      return {
        type: "uniform",
        year: { min: raw.year.min, max: raw.year.max }
      };
    case "normal":
      return {
        type: "normal",
        year: { mean: raw.year.mean, stdDev: raw.year.stdDev }
      };
    case "event":
      return {
        type: "event",
        eventTime: raw.eventTime,
        event: new mongoose.Types.ObjectId(raw.eventId)
      };
    default:
      return raw;
  }
}
function extractInvestmentIds(investments: any[]): mongoose.Types.ObjectId[] {
  return investments
    .map(inv => {
      if (!inv) return null;
      if (typeof inv === "string" || inv instanceof mongoose.Types.ObjectId) return inv;
      if (inv._id && mongoose.Types.ObjectId.isValid(inv._id)) return new mongoose.Types.ObjectId(inv._id);
      return null;
    })
    .filter((id): id is mongoose.Types.ObjectId => id !== null);
}

function normalizeDuration(raw: YearInput) {
  switch (raw.type) {
    case "fixed":
      return {
        type: "fixed",
        valueType: "amount",
        value: raw.year
      };
    case "uniform":
      return {
        type: "uniform",
        valueType: "amount",
        year: { min: raw.year.min, max: raw.year.max }
      };
    case "normal":
      return {
        type: "normal",
        valueType: "amount",
        year: { mean: raw.year.mean, stdDev: raw.year.stdDev }
      };
    default:
      return raw;
  }
}

// ─────────────────────────────────────────────
// GET handler
// ─────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const scenarioId = (await params).id;

  if (!scenarioId || !mongoose.Types.ObjectId.isValid(scenarioId)) {
    return NextResponse.json({ success: false, error: "Invalid scenario ID" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const scenario = await Scenario.findById(scenarioId)
      .populate({ path: 'investments', populate: { path: 'investmentType' } })
      .populate('eventSeries')
      .populate('spendingStrategy')
      .populate('expenseWithdrawalStrategy');

    if (!scenario) {
      return NextResponse.json({ success: false, error: 'Scenario not found' }, { status: 404 });
    }

    const isGuest = !scenario.owner || scenario.owner.toString() === "Guest";
    if (isGuest) {
      return NextResponse.json({
        success: true,
        scenario,
        isOwner: false,
        hasEditPermission: true,
        hasViewPermission: true
      }, { status: 200 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    const stateTaxFiles = Object.fromEntries(user.stateTaxFiles || []);

    const isOwner = scenario.owner.toString() === user._id.toString();
    const canEdit = user.readWriteScenarios.some(id => id.toString() === scenarioId);
    const canView = scenario.viewPermissions.some(id => id.toString() === user._id.toString());

    if (!isOwner && !canView && !canEdit) {
      return NextResponse.json({ success: false, error: 'No permission' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      scenario,
      isOwner,
      hasEditPermission: canEdit,
      hasViewPermission: canView,
      stateTaxFiles
    }, { status: 200 });
  } catch (err) {
    console.error('Error fetching scenario:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch scenario' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// PUT handler
// ─────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const scenarioId = (await params).id;

  if (!scenarioId || !mongoose.Types.ObjectId.isValid(scenarioId)) {
    return NextResponse.json({ success: false, error: "Invalid scenario ID" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const scenario = await Scenario.findById(scenarioId);
    if (!scenario) {
      return NextResponse.json({ success: false, error: 'Scenario not found' }, { status: 404 });
    }

    const body: CoupleScenario = await req.json();

    // 1. General info
    scenario.name = body.name;
    scenario.description = body.description;
    scenario.financialGoal = body.financialGoal;
    scenario.residenceState = body.residenceState;
    scenario.inflationRate = body.inflationRate;
    scenario.ownerBirthYear = body.ownerBirthYear;
    scenario.ownerLifeExpectancy = body.ownerLifeExpectancy;
    scenario.type = body.type;
    if (body.type === "couple") {
      scenario.spouseBirthYear = body.spouseBirthYear;
      scenario.spouseLifeExpectancy = body.spouseLifeExpectancy;
    }

    // 2. Investments
    for (const inv of body.investments) {
      let invTypeId: mongoose.Types.ObjectId;
      if (inv.investmentType._id && mongoose.Types.ObjectId.isValid(inv.investmentType._id)) {
        const existingType = await InvestmentType.findById(inv.investmentType._id);
        if (existingType) {
          existingType.name = inv.investmentType.name;
          existingType.description = inv.investmentType.description;
          existingType.expectedAnnualReturn = inv.investmentType.expectedAnnualReturn;
          existingType.expectedAnnualIncome = inv.investmentType.expectedAnnualIncome;
          existingType.taxability = inv.investmentType.taxability;
          existingType.expenseRatio = inv.investmentType.expenseRatio;
          await existingType.save();
          invTypeId = existingType._id;
        } else {
          const newType = new InvestmentType({
            name: inv.investmentType.name,
            description: inv.investmentType.description,
            expectedAnnualReturn: inv.investmentType.expectedAnnualReturn,
            expectedAnnualIncome: inv.investmentType.expectedAnnualIncome,
            taxability: inv.investmentType.taxability,
            expenseRatio: inv.investmentType.expenseRatio
          });
          await newType.save();
          invTypeId = newType._1d;
        }
      } else {
        const newType = new InvestmentType({
          name: inv.investmentType.name,
          description: inv.investmentType.description,
          expectedAnnualReturn: inv.investmentType.expectedAnnualReturn,
          expectedAnnualIncome: inv.investmentType.expectedAnnualIncome,
          taxability: inv.investmentType.taxability,
          expenseRatio: inv.investmentType.expenseRatio
        });
        await newType.save();
        invTypeId = newType._id;
      }

      if (inv._id && mongoose.Types.ObjectId.isValid(inv._id)) {
        const existingInv = await Investment.findById(inv._id);
        if (existingInv) {
          existingInv.investmentType = invTypeId;
          existingInv.value = inv.value;
          existingInv.purchasePrice = inv.purchasePrice;
          existingInv.taxStatus = inv.taxStatus;
          await existingInv.save();
        }
      } else {
        const newInv = new Investment({
          investmentType: invTypeId,
          value: inv.value,
          purchasePrice: inv.purchasePrice,
          taxStatus: inv.taxStatus
        });
        await newInv.save();
        scenario.investments.push(newInv._id);
      }
    }

    // 3. Events
    for (const evt of body.eventSeries) {
      if (evt._id && mongoose.Types.ObjectId.isValid(evt._id)) {
        const existingEvt = await Event.findById(evt._id);
        if (!existingEvt) continue;

        // normalize
        existingEvt.startYear = normalizeStartYear(evt.startYear);
        existingEvt.duration  = normalizeDuration(evt.duration);

        const et = evt.eventType;
        switch (et.type) {
          case "investment": {
            const a = Array.isArray(et.assetAllocation) ? et.assetAllocation[0] : et.assetAllocation;
            if (a.type === "fixed") {
              a.percentages = a.percentages || [];
            } else {
              a.initialPercentages = a.initialPercentages || [];
              a.finalPercentages   = a.finalPercentages   || [];
            }
            a.investments = extractInvestmentIds(a.investments);
            existingEvt.eventType.assetAllocation = a;
            existingEvt.eventType.inflationAdjustment = et.inflationAdjustment;
            existingEvt.eventType.maxCash             = et.maxCash;
            break;
          }
          case "rebalance": {
            const p = Array.isArray(et.portfolioDistribution) ? et.portfolioDistribution[0] : et.portfolioDistribution;
            if (p.type === "fixed") {
              p.percentages = p.percentages || [];
            } else {
              p.initialPercentages = p.initialPercentages || [];
              p.finalPercentages   = p.finalPercentages   || [];
            }
            existingEvt.eventType.portfolioDistribution = p;
            break;
          }
          case "income": {
            existingEvt.eventType.amount               = et.amount;
            existingEvt.eventType.inflationAdjustment  = et.inflationAdjustment;
            existingEvt.eventType.socialSecurity       = et.socialSecurity;
            existingEvt.eventType.wage                 = et.wage;
            existingEvt.eventType.expectedAnnualChange = et.expectedAnnualChange;
            if (et.percentageOfIncome !== undefined) {
              existingEvt.eventType.percentageOfIncome = et.percentageOfIncome;
            }
            break;
          }
          case "expense": {
            existingEvt.eventType.discretionary        = et.discretionary;
            existingEvt.eventType.amount               = et.amount;
            existingEvt.eventType.inflationAdjustment  = et.inflationAdjustment;
            existingEvt.eventType.expectedAnnualChange = et.expectedAnnualChange;
            if (et.percentageOfIncome !== undefined) {
              existingEvt.eventType.percentageOfIncome = et.percentageOfIncome;
            }
            break;
          }
        }

        existingEvt.name        = evt.name;
        existingEvt.description = evt.description;
        await existingEvt.save();

      } else {
        const data: any = { ...evt };
        data.startYear = normalizeStartYear(evt.startYear);
        data.duration  = normalizeDuration(evt.duration);

        if (evt.eventType.type === "investment") {
          const a = Array.isArray(evt.eventType.assetAllocation)
            ? evt.eventType.assetAllocation[0]
            : evt.eventType.assetAllocation;
          if (a.type === "fixed") {
            a.percentages = a.percentages || [];
          } else {
            a.initialPercentages = a.initialPercentages || [];
            a.finalPercentages   = a.finalPercentages   || [];
          }
          a.investments = extractInvestmentIds(a.investments);
          data.eventType = { ...evt.eventType, assetAllocation: a };

        } else if (evt.eventType.type === "rebalance") {
          const p = Array.isArray(evt.eventType.portfolioDistribution)
            ? evt.eventType.portfolioDistribution[0]
            : evt.eventType.portfolioDistribution;
          if (p.type === "fixed") {
            p.percentages = p.percentages || [];
          } else {
            p.initialPercentages = p.initialPercentages || [];
            p.finalPercentages   = p.finalPercentages   || [];
          }
          data.eventType = { ...evt.eventType, portfolioDistribution: p };
        } else {
          data.eventType = evt.eventType;
        }

        delete data._id;
        delete data.id;

        const newEvt = new Event(data);
        await newEvt.save();
        scenario.eventSeries.push(newEvt._id);
      }
    }

    // 4. Spending strategy
    scenario.spendingStrategy = [];
    if (Array.isArray(body.spendingStrategy)) {
      for (const e of body.spendingStrategy) {
        if (e._id && mongoose.Types.ObjectId.isValid(e._id) && await Event.findById(e._id)) {
          scenario.spendingStrategy.push(e._id);
        }
      }
    }

    // 5. Expense withdrawal
    scenario.expenseWithdrawalStrategy = [];
    if (Array.isArray(body.expenseWithdrawalStrategy)) {
      for (const inv of body.expenseWithdrawalStrategy) {
        if (inv._id && mongoose.Types.ObjectId.isValid(inv._id) && await Investment.findById(inv._id)) {
          scenario.expenseWithdrawalStrategy.push(inv._id);
        }
      }
    }

    // 6. RMD strategy
    scenario.RMDStrategy = [];
    if (Array.isArray(body.RMDStrategy)) {
      for (const inv of body.RMDStrategy) {
        if (inv._id && mongoose.Types.ObjectId.isValid(inv._id) && await Investment.findById(inv._id)) {
          scenario.RMDStrategy.push(inv._id);
        }
      }
    }

    // 7. Roth conversion strategy
    scenario.RothConversionStrategy = [];
    if (Array.isArray(body.RothConversionStrategy)) {
      for (const inv of body.RothConversionStrategy) {
        if (inv._id && mongoose.Types.ObjectId.isValid(inv._id) && await Investment.findById(inv._id)) {
          scenario.RothConversionStrategy.push(inv._id);
        }
      }
    }

    scenario.rothConversion = (body as any).rothConversion || null;
    scenario.inflationRate  = body.inflationRate;

    await scenario.save();

    return NextResponse.json({
      success: true,
      message: "Scenario updated successfully",
      scenarioId: scenario._id
    });
  } catch (err) {
    console.error('Error updating scenario:', err);
    return NextResponse.json({
      success: false,
      error: 'Failed to update scenario',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
