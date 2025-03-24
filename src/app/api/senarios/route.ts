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
import { AssetAllocationFixed } from '@/types/event';



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


export async function POST(request: NextRequest) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  const user = await User.findOne({ email: session.user.email });

  const body: ScenarioFormData = await request.json();

  try {
    const investmentIds: mongoose.Types.ObjectId[] = [];
    const investmentIdMap: Record<string, mongoose.Types.ObjectId> = {};

    // Store Investments
    for (const inv of body.investments.investments) {
      const invTypeDoc = await InvestmentType.create(inv.investmentType);
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
      const event = structuredClone(evt) ;

      // Remap investments inside InvestmentEvent
      if (event.eventType.type === "investment") {
        const allocation = event.eventType.assetAllocation as AssetAllocationFixed;
        allocation.investment.id = investmentIdMap[allocation.investment.id].toString();
      }
      

      const createdEvent = await Event.create(event);
      eventIdMap[evt.id] = createdEvent._id;
    }

    // Build Scenario with references
    const scenario = await Scenario.create({
      type: body.generalInformation.scenarioType.toLowerCase(),
      name: body.generalInformation.scenarioName,
      description: body.generalInformation.scenarioDescription,
      financialGoal: body.generalInformation.financialGoal,
      residenceState: body.generalInformation.residenceState,
      investments: investmentIds,
      eventSeries: Object.values(eventIdMap),
      spendingStrategy: body.spendingStrategy.expensePriorityOrder.map(id => eventIdMap[id]),
      expenseWithdrawalStrategy: body.expenseWithdrawalStrategy.withdrawalOrder.map(id => {
        const mappedId = investmentIdMap[id];
        if (!mappedId) throw new Error(`Investment ${id} not found`);
        return mappedId;
      }),
      inflationRate: body.rothAndRMD.inflationRate,
      rothConversion: {
        rothConversion: false, //TODO: Add roth conversion
      },
      rmdEnabled: false, //TODO: Add RMD
      owner: user._id,
      userBirthYear: body.generalInformation.userBirthYear,
      userLifeExpectancy: {
        type: "fixed",
        valueType: "year",
        value: body.generalInformation.userLifeExpectancy,
      },
      spouseBirthYear: body.generalInformation.spouseBirthYear,
      spouseLifeExpectancy: body.generalInformation.spouseLifeExpectancy
        ? {
            type: "fixed",
            valueType: "year",
            value: body.generalInformation.spouseLifeExpectancy
          }
        : undefined,
    });

    // Link scenario to user
    if (!user) {
      return NextResponse.json(
        // TODO: Store in local storage
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

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
      { success: false, error: "Scenario creation failed" },
      { status: 500 }
    );
  }
}



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
