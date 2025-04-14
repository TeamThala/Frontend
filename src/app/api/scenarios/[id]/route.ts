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
// import Investment from "@/models/Investment";
// import InvestmentType from "@/models/InvestmentType";
// import Event from "@/models/Event";
import User from "@/models/User";
import { CoupleScenario } from "@/types/scenario";


export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const scenario = await Scenario.findById(scenarioId)
    // Local storage for guest user
      .populate({
        path: 'investments',
        populate: { path: 'investmentType' }
      })
      .populate('eventSeries')
      .populate('spendingStrategy')
      .populate('expenseWithdrawalStrategy')

    if (!scenario) {
      return NextResponse.json({ success: false, error: 'Scenario not found' }, { status: 404 });
    }

    // Check if this is a guest scenario (no owner or owner is "Guest")
    const isGuestScenario = !scenario.owner || scenario.owner.toString() === "Guest";
    
    if (isGuestScenario) {
      // For guest scenarios, anyone with the session can view
      return NextResponse.json({ 
        success: true, 
        scenario, 
        isOwner: false, 
        hasEditPermission: true,  // Allow editing for guest scenarios
        hasViewPermission: true 
      }, { status: 200 });
    }

    // For non-guest scenarios, check permissions
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Check if user has permission to view this scenario
    const isOwner = scenario.owner.toString() === user._id.toString();
    const hasEditPermission = user.readWriteScenarios.some(
      (id: mongoose.Types.ObjectId) => id.toString() === scenarioId
    );
    const hasViewPermission = scenario.viewPermissions.some(
      (id: mongoose.Types.ObjectId) => id.toString() === user._id.toString()
    );

    if (!isOwner && !hasViewPermission && !hasEditPermission) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to view this scenario' }, 
        { status: 401 }
      );
    }

    

    return NextResponse.json({ success: true, scenario, isOwner, hasEditPermission, hasViewPermission }, { status: 200 });
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

    // Parse the request body
    const body: CoupleScenario = await req.json();
    // 1. Update General Information
    scenario.name = body.name;
    scenario.description = body.description;
    scenario.financialGoal = body.financialGoal;
    scenario.residenceState = body.residenceState;
    scenario.inflationRate = body.inflationRate;
    scenario.ownerBirthYear = body.ownerBirthYear;
    scenario.ownerLifeExpectancy = body.ownerLifeExpectancy;
    scenario.type = body.type;
    if (scenario.type === "couple") {
      scenario.spouseBirthYear = body.spouseBirthYear;
      scenario.spouseLifeExpectancy = body.spouseLifeExpectancy;
    }
    // 2. Update Investments

    // 3. Update Events

    // 4. Update Spending Strategy

    // 5. Update Expense Withdrawal Strategy

    // 6. Update Inflation Rate

    // 7. Update Roth and RMD

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
