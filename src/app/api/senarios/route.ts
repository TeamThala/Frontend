import {NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/dbConnect';
import "@/models/Investment";
import "@/models/Event";
import "@/models/User";
import "@/models/InvestmentType";
import Scenario from '@/models/Scenario';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth';
import User from "@/models/User";
import Investment from "@/models/Investment";
import InvestmentType from "@/models/InvestmentType";
import Event from "@/models/Event";
import type { ScenarioFormData } from "@/app/scenarios/create/page";
import { Event as EventType } from '@/types/event';

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

    // Generate unique IDs for investments and events
    const generateUniqueId = () => new mongoose.Types.ObjectId().toString();

    const investmentIds: mongoose.Types.ObjectId[] = [];
    const investmentIdMap: Record<string, mongoose.Types.ObjectId> = {};

    // Store Investments
    for (const inv of body.investments.investments) {
      const clientInvId = inv.id;
      const uniqueId = generateUniqueId();

      // Create InvestmentType with ID
      const invTypeDoc = await InvestmentType.create({
        id: generateUniqueId(),
        name: inv.investmentType.name,
        description: inv.investmentType.description || 'No description',
        expectedAnnualReturn: inv.investmentType.expectedAnnualReturn,
        expenseRatio: inv.investmentType.expenseRatio,
        expectedAnnualIncome: inv.investmentType.expectedAnnualIncome,
        taxability: inv.investmentType.taxability
      });

      // Create Investment with ID
      const investmentDoc = await Investment.create({
        id: uniqueId,
        value: inv.value,
        taxStatus: inv.taxStatus,
        investmentType: invTypeDoc._id,
      });

      investmentIds.push(investmentDoc._id);
      investmentIdMap[clientInvId] = investmentDoc._id;
    }

    // Store Events
    const eventIdMap: Record<string, mongoose.Types.ObjectId> = {};
    for (const evt of body.eventSeries.events) {
      const clientEventId = evt.id;
      const uniqueId = generateUniqueId();
      
      // Create a deep clone to avoid modifying the original
      const eventData: any = structuredClone(evt);
      
      // Set the ID field required by our schema
      eventData.id = uniqueId;
      
      // Ensure we have the durationType field
      if (!eventData.durationType) {
        eventData.durationType = 'years';
      }

      // Process investment references in event types
      if (eventData.eventType.type === "investment") {
        if (eventData.eventType.assetAllocation) {
          const assetAllocation = eventData.eventType.assetAllocation;
          
          // Process fixed asset allocation
          if (assetAllocation.type === "fixed" && assetAllocation.investments) {
            const investmentRefs: any[] = [];
            for (const investment of assetAllocation.investments) {
              const investmentId = typeof investment === 'string' ? investment : investment.id;
              if (investmentIdMap[investmentId]) {
                investmentRefs.push(investmentIdMap[investmentId]);
              }
            }
            assetAllocation.investments = investmentRefs;
          } 
          // Process glidePath asset allocation
          else if (assetAllocation.type === "glidePath" && assetAllocation.investments) {
            const investmentRefs: any[] = [];
            for (const investment of assetAllocation.investments) {
              const investmentId = typeof investment === 'string' ? investment : investment.id;
              if (investmentIdMap[investmentId]) {
                investmentRefs.push(investmentIdMap[investmentId]);
              }
            }
            assetAllocation.investments = investmentRefs;
          }
        }
      } 
      // Process rebalance event
      else if (eventData.eventType.type === "rebalance") {
        if (eventData.eventType.portfolioDistribution) {
          const distribution = eventData.eventType.portfolioDistribution;
          
          // Process fixed distribution
          if (distribution.type === "fixed" && distribution.investments) {
            const investmentRefs: any[] = [];
            for (const investment of distribution.investments) {
              const investmentId = typeof investment === 'string' ? investment : investment.id;
              if (investmentIdMap[investmentId]) {
                investmentRefs.push(investmentIdMap[investmentId]);
              }
            }
            distribution.investments = investmentRefs;
          } 
          // Process glidePath distribution
          else if (distribution.type === "glidePath" && distribution.investments) {
            const investmentRefs: any[] = [];
            for (const investment of distribution.investments) {
              const investmentId = typeof investment === 'string' ? investment : investment.id;
              if (investmentIdMap[investmentId]) {
                investmentRefs.push(investmentIdMap[investmentId]);
              }
            }
            distribution.investments = investmentRefs;
          }
        }
      }
      
      // Handle EventYear type references for startYear
      if (eventData.startYear && eventData.startYear.type === "event" && eventData.startYear.eventId) {
        const mappedEventId = eventIdMap[eventData.startYear.eventId];
        if (mappedEventId) {
          eventData.startYear.eventId = mappedEventId.toString();
        }
      }

      try {
        const createdEvent = await Event.create(eventData);
        eventIdMap[clientEventId] = createdEvent._id;
      } catch (error) {
        console.error(`Failed to create event ${clientEventId}:`, error);
        console.error(`Event data:`, JSON.stringify(eventData, null, 2));
        throw error;
      }
    }

    // Create unique scenario ID
    const scenarioId = generateUniqueId();
    
    // Extract scenario type from form data, defaulting to "individual" 
    // Convert the scenario type to match our database enum values
    let scenarioType = "individual";
    
    if (body.generalInformation.scenarioType) {
      const type = body.generalInformation.scenarioType.toLowerCase();
      if (type === "married" || type === "couple") {
        scenarioType = "couple";
      } else if (type === "single") {
        scenarioType = "individual";
      } else {
        scenarioType = type; // Keep whatever it is
      }
    }
    
    // Prepare scenario data
    const scenarioData: any = {
      id: scenarioId,
      type: scenarioType,
      name: body.generalInformation.scenarioName || 'Untitled Scenario',
      description: body.generalInformation.scenarioDescription || '',
      financialGoal: body.generalInformation.financialGoal || 0,
      investments: investmentIds,
      eventSeries: Object.values(eventIdMap),
      spendingStrategy: (body.spendingStrategy?.expensePriorityOrder || [])
        .filter(id => eventIdMap[id])
        .map(id => eventIdMap[id]),
      expenseWithdrawalStrategy: (body.expenseWithdrawalStrategy?.withdrawalOrder || [])
        .filter(id => investmentIdMap[id])
        .map(id => investmentIdMap[id]),
      inflationRate: body.rothAndRMD?.inflationRate || {
        type: "fixed",
        valueType: "percentage",
        value: 0.02
      },
      RothConversionStrategy: [],
      RMDStrategy: [],
      // Set a default value for rothConversion to avoid validation errors
      rothConversion: {
        rothConversion: false,
        RothConversionStartYear: null,
        RothConversionEndYear: null
      },
      residenceState: body.generalInformation.residenceState || 'Default State',
      owner: user._id,
      userBirthYear: body.generalInformation.userBirthYear || 1980,
      userLifeExpectancy: {
        type: "fixed",
        valueType: "percentage",
        value: body.generalInformation.userLifeExpectancy || 85,
      },
      viewPermissions: [],
      editPermissions: [],
      updatedAt: new Date()
    };

    // Add spouse data if scenario type is couple or married
    if (scenarioType === "couple" || scenarioType === "married") {
      scenarioData.spouseBirthYear = body.generalInformation.spouseBirthYear;
      scenarioData.spouseLifeExpectancy = body.generalInformation.spouseLifeExpectancy
        ? {
            type: "fixed",
            valueType: "percentage",
            value: body.generalInformation.spouseLifeExpectancy
          }
        : undefined;
    }

    // Create and save the scenario
    const scenario = await Scenario.create(scenarioData);

    // Link scenario to user
    user.createdScenarios.push(scenarioId);
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
