import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import "@/models/Investment";
import "@/models/Event";
import "@/models/User";
import "@/models/InvestmentType";
import Scenario from '@/models/Scenario';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import Investment from "@/models/Investment";
import InvestmentType from "@/models/InvestmentType";
import Event from "@/models/Event";
import User from "@/models/User";
import type { ScenarioFormData } from "@/app/scenarios/create/page";


export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const scenarioId = (await params).id; 

  if (!scenarioId || !mongoose.Types.ObjectId.isValid(scenarioId)) {
    return NextResponse.json({ success: false, error: "Invalid scenario ID" }, { status: 400 });
  }

  try {
    const scenario = await Scenario.findById(scenarioId)
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

    if (!scenario) {
      return NextResponse.json({ success: false, error: 'Scenario not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: scenario }, { status: 200 });
  } catch (error) {
    console.error('Error fetching scenario:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch scenario' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const scenarioId = (await params).id;

  if (!scenarioId || !mongoose.Types.ObjectId.isValid(scenarioId)) {
    return NextResponse.json({ success: false, error: "Invalid scenario ID" }, { status: 400 });
  }

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
    // Find the scenario
    const scenario = await Scenario.findById(scenarioId);
    
    if (!scenario) {
      return NextResponse.json({ success: false, error: 'Scenario not found' }, { status: 404 });
    }

    // Check if user has permission to edit this scenario
    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Check if user is the owner or has edit permissions
    const isOwner = scenario.owner.toString() === user._id.toString();
    const hasEditPermission = user.readWriteScenarios.some(
      (id: mongoose.Types.ObjectId) => id.toString() === scenarioId
    );

    if (!isOwner && !hasEditPermission) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to edit this scenario' }, 
        { status: 403 }
      );
    }

    // Parse the request body
    const body: ScenarioFormData = await req.json();

    // Update scenario with new data
    // 1. Update basic information
    scenario.name = body.generalInformation.scenarioName;
    scenario.description = body.generalInformation.scenarioDescription;
    scenario.type = body.generalInformation.scenarioType.toLowerCase();
    scenario.financialGoal = body.generalInformation.financialGoal;
    scenario.residenceState = body.generalInformation.residenceState;
    scenario.userBirthYear = body.generalInformation.userBirthYear;
    scenario.userLifeExpectancy = {
      type: "fixed",
      valueType: "year",
      value: body.generalInformation.userLifeExpectancy
    };
    
    if (body.generalInformation.scenarioType === 'Married') {
      scenario.spouseBirthYear = body.generalInformation.spouseBirthYear;
      scenario.spouseLifeExpectancy = {
        type: "fixed",
        valueType: "year",
        value: body.generalInformation.spouseLifeExpectancy
      };
    } else {
      // Remove spouse data if scenario type is Single
      scenario.spouseBirthYear = undefined;
      scenario.spouseLifeExpectancy = undefined;
    }

    // 2. Handle investments
    // First clear existing investments 
    await Investment.deleteMany({ _id: { $in: scenario.investments } });
    await InvestmentType.deleteMany({ _id: { $in: scenario.investments.map((inv: Investment) => inv.investmentType) } });
    
    // Then add new investments
    const investmentIds: mongoose.Types.ObjectId[] = [];
    const investmentIdMap: Record<string, mongoose.Types.ObjectId> = {};

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
    
    scenario.investments = investmentIds;

    // 3. Handle events
    // Clear existing events
    await Event.deleteMany({ _id: { $in: scenario.eventSeries } });
    
    // Add new events
    const eventIdMap: Record<string, mongoose.Types.ObjectId> = {};
    for (const evt of body.eventSeries.events) {
      const event = structuredClone(evt);
      const createdEvent = await Event.create(event);
      eventIdMap[evt.id] = createdEvent._id;
    }
    
    scenario.eventSeries = Object.values(eventIdMap);

    // 4. Update spending strategy and withdrawal strategy
    scenario.spendingStrategy = body.spendingStrategy.expensePriorityOrder.map(id => eventIdMap[id]);
    scenario.expenseWithdrawalStrategy = body.expenseWithdrawalStrategy.withdrawalOrder.map(id => {
      const mappedId = investmentIdMap[id];
      if (!mappedId) throw new Error(`Investment ${id} not found`);
      return mappedId;
    });

    // 5. Update inflation rate and other settings
    scenario.inflationRate = body.rothAndRMD.inflationRate;

    // Save the updated scenario
    await scenario.save();

    return NextResponse.json({
      success: true,
      message: "Scenario updated successfully",
      scenarioId: scenario._id
    });
  } catch (error) {
    console.error('Error updating scenario:', error);
    return NextResponse.json({ success: false, error: 'Failed to update scenario' }, { status: 500 });
  }
}
