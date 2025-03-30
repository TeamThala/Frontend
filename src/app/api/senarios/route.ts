import {NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/dbConnect';
import "@/models/Investment";
import "@/models/Event";
import "@/models/User";
import "@/models/InvestmentType";
import Scenario from  '@/models/Scenario';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth';
import User from "@/models/User";
import Investment from "@/models/Investment";
import InvestmentType from "@/models/InvestmentType";
import Event from "@/models/Event";
import type { ScenarioFormData } from "@/app/scenarios/create/page";



export async function GET() {
  await dbConnect();

  // Get the user session
  const session = await getServerSession(authOptions);
  // Check if user is authenticated
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' }, 
      { status: 401 }
    );
  }

  try {
    // First find the user by email
    const User = mongoose.model('User');
    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' }, 
        { status: 404 }
      );
    }

    // Find scenarios where the user is the owner or has permissions
    const createdScenarios = await Scenario.find({
      _id: { $in: user.createdScenarios }
    })
    .populate({
      path: 'investments',
      populate: { path: 'investmentType' }
    })
    .populate('eventSeries')
    .populate('spendingStrategy')
    .populate('expenseWithdrawalStrategy')
    .populate('owner', 'name email')
    .populate('viewPermissions', 'name email')
    .populate('editPermissions', 'name email');

    // Find scenarios where the user has read permissions
    const readScenarios = await Scenario.find({
      _id: { $in: user.readScenarios }
    })
    .populate({
      path: 'investments',
      populate: { path: 'investmentType' }
    })
    .populate('eventSeries')
    .populate('spendingStrategy')
    .populate('expenseWithdrawalStrategy')
    .populate('owner', 'name email')
    .populate('viewPermissions', 'name email')
    .populate('editPermissions', 'name email')

    // Find scenarios where the user has read and write permissions
    const readWriteScenarios = await Scenario.find({
      _id: { $in: user.readWriteScenarios }
    })
    .populate({
      path: 'investments',
      populate: { path: 'investmentType' }
    })
    .populate('eventSeries')
    .populate('spendingStrategy')
    .populate('expenseWithdrawalStrategy')
    .populate('owner', 'name email')
    .populate('viewPermissions', 'name email')
    .populate('editPermissions', 'name email')
    
    const responsePayload = {
      "createdScenarios": createdScenarios,
      "readScenarios": readScenarios,
      "readWriteScenarios": readWriteScenarios
    }

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    console.error('Error fetching user scenarios:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user scenarios' }, 
      { status: 500 }
    );
  }
}


// export async function POST(request: NextRequest) {
//   await dbConnect();

//   const session = await getServerSession(authOptions);
//   if (!session || !session.user?.email) {
//     return NextResponse.json(
//       { success: false, error: "Authentication required" },
//       { status: 401 }
//     );
//   }

//   const user = await User.findOne({ email: session.user.email });

//   const body: ScenarioFormData = await request.json();

//   try {
//     const investmentIds: mongoose.Types.ObjectId[] = [];
//     const investmentIdMap: Record<string, mongoose.Types.ObjectId> = {};

//     // Store Investments
//     for (const inv of body.investments.investments) {
//       const invTypeDoc = await InvestmentType.create(inv.investmentType);
//       const investmentDoc = await Investment.create({
//         value: inv.value,
//         taxStatus: inv.taxStatus,
//         investmentType: invTypeDoc._id,
//       });
//       investmentIds.push(investmentDoc._id);
//       investmentIdMap[inv.id] = investmentDoc._id;
//     }

//     // Store Events
//     const eventIdMap: Record<string, mongoose.Types.ObjectId> = {};
//     for (const evt of body.eventSeries.events) {
//       const event = structuredClone(evt) ;

//       // Remap investments inside InvestmentEvent
//       if (event.eventType.type === "investment") {
//         const allocation = event.eventType.assetAllocation as AssetAllocationFixed;
//         allocation.investment.id = investmentIdMap[allocation.investment.id].toString();
//       }
      

//       const createdEvent = await Event.create(event);
//       eventIdMap[evt.id] = createdEvent._id;
//     }

//     // Build Scenario with references
//     const scenario = await Scenario.create({
//       type: body.generalInformation.scenarioType.toLowerCase(),
//       name: body.generalInformation.scenarioName,
//       description: body.generalInformation.scenarioDescription,
//       financialGoal: body.generalInformation.financialGoal,
//       residenceState: body.generalInformation.residenceState,
//       investments: investmentIds,
//       eventSeries: Object.values(eventIdMap),
//       spendingStrategy: body.spendingStrategy.expensePriorityOrder.map(id => eventIdMap[id]),
//       expenseWithdrawalStrategy: body.expenseWithdrawalStrategy.withdrawalOrder.map(id => {
//         const mappedId = investmentIdMap[id];
//         if (!mappedId) throw new Error(`Investment ${id} not found`);
//         return mappedId;
//       }),
//       inflationRate: body.rothAndRMD.inflationRate,
//       rothConversion: {
//         rothConversion: false, //TODO: Add roth conversion
//       },
//       rmdEnabled: false, //TODO: Add RMD
//       owner: user._id,
//       userBirthYear: body.generalInformation.userBirthYear,
//       userLifeExpectancy: {
//         type: "fixed",
//         valueType: "year",
//         value: body.generalInformation.userLifeExpectancy,
//       },
//       spouseBirthYear: body.generalInformation.spouseBirthYear,
//       spouseLifeExpectancy: body.generalInformation.spouseLifeExpectancy
//         ? {
//             type: "fixed",
//             valueType: "year",
//             value: body.generalInformation.spouseLifeExpectancy
//           }
//         : undefined,
//     });

//     // Link scenario to user
//     if (!user) {
//       return NextResponse.json(
//         // TODO: Store in local storage
//         { success: false, error: "User not found" },
//         { status: 404 }
//       );
//     }

//     user.createdScenarios.push(scenario._id);
//     await user.save();

//     return NextResponse.json({
//       success: true,
//       message: "Scenario created successfully",
//       scenarioId: scenario._id
//     });
//   } catch (error) {
//     console.error("Scenario creation failed:", error);
//     return NextResponse.json(
//       { success: false, error: "Scenario creation failed" },
//       { status: 500 }
//     );
//   }
// }



// import { NextResponse } from 'next/server';
// import dbConnect from '@/lib/dbConnect';
// import "@/models/Investment";
// import "@/models/Event";
// import "@/models/User";
// import "@/models/InvestmentType";
// import Scenario from '@/models/Scenario';

// export async function GET() {
//   await dbConnect();

//   try {
//     const scenarios = await Scenario.find({})
//       .populate({
//         path: 'investments',
//         populate: { path: 'investmentType' }
//       })
//       .populate('eventSeries')
//       .populate('spendingStrategy')
//       .populate('expenseWithdrawalStrategy')
//       .populate('owner', 'name email')
//       .populate('viewPermissions', 'name email')
//       .populate('editPermissions', 'name email');

//     return NextResponse.json({ success: true, data: scenarios }, { status: 200 });
//   } catch (error) {
//     console.error('Error fetching scenarios:', error);
//     return NextResponse.json({ success: false, error: 'Failed to fetch scenarios' }, { status: 500 });
//   }
// }
export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const body: ScenarioFormData = await request.json();
    //console.log("Received scenario form data:", JSON.stringify(body, null, 2));

    const investmentIds: mongoose.Types.ObjectId[] = [];
    const investmentIdMap: Record<string, mongoose.Types.ObjectId> = {};

    // Store Investments
    for (const inv of body.investments.investments) {
      const { id: invTypeId, ...invTypePayload } = inv.investmentType;
       console.log( invTypeId);

      const invTypeDoc = await InvestmentType.create(invTypePayload);

      const investmentDoc = await Investment.create({
        value: inv.value,
        taxStatus: inv.taxStatus,
        investmentType: invTypeDoc._id,
      });

      investmentIds.push(investmentDoc._id);
      investmentIdMap[inv.id] = investmentDoc._id;
    }


    // Store Events
    const eventIdMap: Record<string, mongoose.Types.ObjectId> = {};
    for (const evt of body.eventSeries.events) {
      const event = structuredClone(evt);

      const { id, ...eventWithoutId } = event;
      console.log(id);

      if (eventWithoutId.eventType.type === "investment" || eventWithoutId.eventType.type === "rebalance") {
        // Process investment and rebalance events which have assetAllocation
        // eslint-disable-next-line
        const eventWithInvestments = eventWithoutId.eventType as any;
        
        // Process targetAsset if present
        if (eventWithInvestments.targetAsset && investmentIdMap[eventWithInvestments.targetAsset]) {
          eventWithInvestments.targetAsset = investmentIdMap[eventWithInvestments.targetAsset].toString();
        }
        
        // Deep process assetAllocation array if it exists
        if (eventWithInvestments.assetAllocation && Array.isArray(eventWithInvestments.assetAllocation)) {
          console.log(`Processing asset allocation for event ${id}`);
          
          // Create a new array completely replacing the existing one
          const processedAllocation = [];
          
          for (const allocation of eventWithInvestments.assetAllocation) {
            // Create a new allocation object without investment
            const newAllocation = { ...allocation };
            delete newAllocation.investment;
            
            // Extract investment ID from different possible formats
            let investmentId = null;
            if (typeof allocation.investment === 'string') {
              investmentId = allocation.investment;
            } else if (allocation.investment && typeof allocation.investment === 'object') {
              if ('id' in allocation.investment) {
                investmentId = allocation.investment.id;
              }
            }
            
            // If we found a valid ID that maps to a MongoDB ObjectId, use it
            if (investmentId && investmentIdMap[investmentId]) {
              newAllocation.investment = investmentIdMap[investmentId];
              processedAllocation.push(newAllocation);
            } else {
              console.warn(`Could not map investment ID for allocation: ${JSON.stringify(allocation)}`);
              // Skip invalid allocations to prevent database validation errors
            }
          }
          
          // Replace the original array with our processed version
          eventWithInvestments.assetAllocation = processedAllocation;
        }
      }

      // Handle investment references in any nested fields for all event types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const processNestedInvestments = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        
        // Process arrays recursively
        if (Array.isArray(obj)) {
          obj.forEach(item => processNestedInvestments(item));
          return;
        }
        
        // Process each property in object
        for (const key in obj) {
          const value = obj[key];
          
          // If the key is 'investment' and the value has an 'id' that's mapped
          if (key === 'investment') {
            if (typeof value === 'string' && investmentIdMap[value]) {
              obj[key] = investmentIdMap[value];
            } else if (value && typeof value === 'object' && 'id' in value && investmentIdMap[value.id]) {
              obj[key] = investmentIdMap[value.id];
            }
          } 
          // Process nested objects recursively
          else if (value && typeof value === 'object') {
            processNestedInvestments(value);
          }
        }
      };
      
      // Process the entire event for any investment references
      processNestedInvestments(eventWithoutId);

      try {
        const createdEvent = await Event.create(eventWithoutId);
        eventIdMap[evt.id] = createdEvent._id;
      } catch (error) {
        console.error(`Failed to create event ${id}:`, error);
        console.error(`Event data:`, JSON.stringify(eventWithoutId, null, 2));
        throw error;
      }
    }

    const scenarioData = {
      type: (body.generalInformation.scenarioType || 'default').toLowerCase(),
      name: body.generalInformation.scenarioName || 'Untitled Scenario',
      description: body.generalInformation.scenarioDescription || '',
      financialGoal: body.generalInformation.financialGoal || 0,
      residenceState: body.generalInformation.residenceState || 'Default State',
      inflationRate: body.rothAndRMD?.inflationRate || 0.02,
      rothConversion: {
        rothConversion: false,
        RothConversionStartYear: null,
        RothConversionEndYear: null
      },
      RothConversionStrategy: [],
      RMDStrategy: [],
      rmdEnabled: false,
      owner: user._id,
      userBirthYear: body.generalInformation.userBirthYear || 1980,
      userLifeExpectancy: {
        type: "fixed",
        valueType: "year",
        value: body.generalInformation.userLifeExpectancy || 85,
      },
      spouseBirthYear: body.generalInformation.spouseBirthYear,
      spouseLifeExpectancy: body.generalInformation.spouseLifeExpectancy
        ? {
            type: "fixed",
            valueType: "year",
            value: body.generalInformation.spouseLifeExpectancy
          }
        : undefined,
      viewPermissions: [],
      editPermissions: []
    };

    const scenario = await Scenario.create(scenarioData);
    scenario.investments = investmentIds;
    scenario.eventSeries = Object.values(eventIdMap);
    scenario.spendingStrategy = (body.spendingStrategy?.expensePriorityOrder || [])
      .filter(id => eventIdMap[id])
      .map(id => eventIdMap[id]);
    scenario.expenseWithdrawalStrategy = (body.expenseWithdrawalStrategy?.withdrawalOrder || [])
      .filter(id => investmentIdMap[id])
      .map(id => investmentIdMap[id]);
    await scenario.save();

    // Link scenario to user
    user.createdScenarios.push(scenario._id);
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Scenario created successfully",
      scenarioId: scenario._id
    });
  } catch (error) {
    console.error("Scenario creation failed:", error);
    return NextResponse.json(
      { success: false, error: `Scenario creation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
