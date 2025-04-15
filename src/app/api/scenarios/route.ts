import {NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/dbConnect';
import "@/models/Investment";
import "@/models/Event";
import "@/models/User";
import "@/models/InvestmentType";
import Scenario from '@/models/Scenario';
import { authOptions } from '@/lib/auth';
import User from "@/models/User";
import InvestmentType from '@/models/InvestmentType';
import Investment from '@/models/Investment';

export async function GET() {
  try {
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

    // First find the user by email
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
    .populate('editPermissions', 'name email');

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
    .populate('editPermissions', 'name email');
    
    const responsePayload = {
      success: true,
      createdScenarios: createdScenarios || [],
      readScenarios: readScenarios || [],
      readWriteScenarios: readWriteScenarios || []
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    console.error('Error fetching user scenarios:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to fetch user scenarios: ${error instanceof Error ? error.message : 'Unknown error'}`,
        createdScenarios: [],
        readScenarios: [],
        readWriteScenarios: [] 
      }, 
      { status: 500 }
    );
  }
}


export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    // Get the user session
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // Find the user by email
    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' }, 
        { status: 404 }
      );
    }

    const { name, description } = await request.json();
    
    try {
      const cashInvestmentType = await InvestmentType.create({
        name: "Cash Account",
        description: "Default cash investment",
        expectedAnnualReturn: {
          type: "fixed",
          valueType: "percentage",
          value: 100
        },
        expenseRatio: 0,
        expectedAnnualIncome: {
          type: "fixed",
          valueType: "amount",
          value: 0
        },
        taxability: true
      });

      const cashInvestment = await Investment.create({
        value: 10000,
        investmentType: cashInvestmentType._id,
        taxStatus: "non-retirement",
        purchasePrice: 0,
      });

      // Create the scenario with all required nested fields
      const scenario = await Scenario.create({ 
        name,
        description: description || "",
        owner: user._id,
        // Initialize the nested objects with default values
        inflationRate: {
          type: "fixed",
          valueType: "percentage",
          value: 2.5
        },
        ownerLifeExpectancy: {
          type: "fixed",
          valueType: "amount",
          value: 90
        },
        // Initialize arrays as empty
        investments: [cashInvestment._id],
        eventSeries: [],
        spendingStrategy: [],
        expenseWithdrawalStrategy: [],
        RothConversionStrategy: [],
        viewPermissions: [],
        editPermissions: []
      });
      
      // Add this scenario to the user's createdScenarios array
      user.createdScenarios.push(scenario._id);
      await user.save();

      return NextResponse.json({ success: true, scenario }, { status: 201 });
    } catch (createError) {
      console.error('Detailed creation error:', JSON.stringify(createError, null, 2));
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to create scenario: ${createError instanceof Error ? createError.message : 'Unknown error'}`,
          details: createError instanceof Error ? createError.toString() : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in scenario creation process:', error);
    return NextResponse.json(
      { success: false, error: `Failed to create scenario: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}