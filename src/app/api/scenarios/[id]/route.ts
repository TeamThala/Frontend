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
import Event from "@/models/Event";
import User from "@/models/User";
import { CoupleScenario } from "@/types/scenario";
import InvestmentType from '@/models/InvestmentType';
import Investment from '@/models/Investment';


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
    scenario.customStateTaxYaml = body.customStateTaxYaml;
    if (scenario.type === "couple") {
      scenario.spouseBirthYear = body.spouseBirthYear;
      scenario.spouseLifeExpectancy = body.spouseLifeExpectancy;
    }
    
    // 2. Update Investments
    for (const investment of body.investments) {
      // Check if this is an existing investment from MongoDB (has valid ObjectId in _id)
      if(investment._id && mongoose.Types.ObjectId.isValid(investment._id)) {
        // Update existing investment with valid MongoDB ObjectId
        const existingInvestment = await Investment.findById(investment._id);
        
        if(!existingInvestment) continue;
        
        let investmentTypeId;
        
        // Check if investment type has a valid MongoDB _id
        if(investment.investmentType._id && mongoose.Types.ObjectId.isValid(investment.investmentType._id)) {
          const existingInvestmentType = await InvestmentType.findById(investment.investmentType._id);
          
          if(existingInvestmentType) {
            // Update existing investment type
            existingInvestmentType.name = investment.investmentType.name;
            existingInvestmentType.description = investment.investmentType.description;
            existingInvestmentType.expectedAnnualReturn = investment.investmentType.expectedAnnualReturn;
            existingInvestmentType.expectedAnnualIncome = investment.investmentType.expectedAnnualIncome;
            existingInvestmentType.taxability = investment.investmentType.taxability;
            existingInvestmentType.expenseRatio = investment.investmentType.expenseRatio;
            
            await existingInvestmentType.save();
            investmentTypeId = existingInvestmentType._id;
          }
        } else {
          // Create new investment type since the existing one doesn't have a valid MongoDB _id
          const investmentTypeData = { 
            name: investment.investmentType.name,
            description: investment.investmentType.description,
            expectedAnnualReturn: investment.investmentType.expectedAnnualReturn,
            expectedAnnualIncome: investment.investmentType.expectedAnnualIncome,
            taxability: investment.investmentType.taxability,
            expenseRatio: investment.investmentType.expenseRatio
          };
          
          const newInvestmentType = new InvestmentType(investmentTypeData);
          await newInvestmentType.save();
          investmentTypeId = newInvestmentType._id;
        }
        
        // Update the investment
        existingInvestment.investmentType = investmentTypeId;
        existingInvestment.purchasePrice = investment.purchasePrice;
        existingInvestment.value = investment.value;
        existingInvestment.taxStatus = investment.taxStatus;
        await existingInvestment.save();
      } else {
        // Create new investment type
        const investmentTypeData = { 
          name: investment.investmentType.name,
          description: investment.investmentType.description,
          expectedAnnualReturn: investment.investmentType.expectedAnnualReturn,
          expectedAnnualIncome: investment.investmentType.expectedAnnualIncome,
          taxability: investment.investmentType.taxability,
          expenseRatio: investment.investmentType.expenseRatio
        };
        
        const newInvestmentType = new InvestmentType(investmentTypeData);
        await newInvestmentType.save();
        
        // Create new investment
        const newInvestment = new Investment({
          value: investment.value,
          purchasePrice: investment.purchasePrice,
          taxStatus: investment.taxStatus,
          investmentType: newInvestmentType._id
        });
        
        await newInvestment.save();
        scenario.investments.push(newInvestment._id);
      }
    }
    
    // 3. Update Events
    for (const event of body.eventSeries) {
      // Check if this is an existing event with a valid MongoDB ObjectId
      if (event._id && mongoose.Types.ObjectId.isValid(event._id)) {
        // This is an existing event with a valid MongoDB _id
        const existingEvent = await Event.findById(event._id);
        if (!existingEvent) continue;

        // Process event data before saving
        const eventToSave = { ...event };
        
        // Handle special event types with investment references
        if (eventToSave.eventType.type === "investment" && eventToSave.eventType.assetAllocation) {
          // Fix investment event's assetAllocation
          const assetAllocation = { ...eventToSave.eventType.assetAllocation };
          
          // Update asset allocation investments
          if (assetAllocation.investments && Array.isArray(assetAllocation.investments)) {
            // Convert the client-side investments array to proper MongoDB references
            if (assetAllocation.type === "fixed") {
              assetAllocation.percentages = assetAllocation.percentages || [];
            } else if (assetAllocation.type === "glidePath") {
              assetAllocation.initialPercentages = assetAllocation.initialPercentages || [];
              assetAllocation.finalPercentages = assetAllocation.finalPercentages || [];
            }
          }
          
          eventToSave.eventType.assetAllocation = assetAllocation;
        } 
        else if (eventToSave.eventType.type === "rebalance" && eventToSave.eventType.portfolioDistribution) {
          // Fix rebalance event's portfolioDistribution
          const portfolioDistribution = { ...eventToSave.eventType.portfolioDistribution };
          
          // Update portfolio distribution investments
          if (portfolioDistribution.investments && Array.isArray(portfolioDistribution.investments)) {
            // Convert the client-side investments array to proper MongoDB references
            if (portfolioDistribution.type === "fixed") {
              portfolioDistribution.percentages = portfolioDistribution.percentages || [];
            } else if (portfolioDistribution.type === "glidePath") {
              portfolioDistribution.initialPercentages = portfolioDistribution.initialPercentages || [];
              portfolioDistribution.finalPercentages = portfolioDistribution.finalPercentages || [];
            }
          }
          
          eventToSave.eventType.portfolioDistribution = portfolioDistribution;
        }

        // Update the existing event with the processed data
        existingEvent.name = eventToSave.name;
        existingEvent.description = eventToSave.description;
        existingEvent.startYear = eventToSave.startYear;
        existingEvent.duration = eventToSave.duration;
        existingEvent.eventType = eventToSave.eventType;
        await existingEvent.save();
      } else {
        // Create new event - strip any existing id or _id values
        const eventData = { ...event } as Record<string, unknown>;
        
        // Process event data before creating a new document
        if (event.eventType.type === "investment" && event.eventType.assetAllocation) {
          // Fix investment event's assetAllocation
          const assetAllocation = { ...event.eventType.assetAllocation };
          
          // Ensure percentages are initialized
          if (assetAllocation.type === "fixed") {
            assetAllocation.percentages = assetAllocation.percentages || [];
          } else if (assetAllocation.type === "glidePath") {
            assetAllocation.initialPercentages = assetAllocation.initialPercentages || [];
            assetAllocation.finalPercentages = assetAllocation.finalPercentages || [];
          }
          
          eventData.eventType = {
            ...event.eventType,
            assetAllocation
          };
        } 
        else if (event.eventType.type === "rebalance" && event.eventType.portfolioDistribution) {
          // Fix rebalance event's portfolioDistribution
          const portfolioDistribution = { ...event.eventType.portfolioDistribution };
          
          // Ensure percentages are initialized
          if (portfolioDistribution.type === "fixed") {
            portfolioDistribution.percentages = portfolioDistribution.percentages || [];
          } else if (portfolioDistribution.type === "glidePath") {
            portfolioDistribution.initialPercentages = portfolioDistribution.initialPercentages || [];
            portfolioDistribution.finalPercentages = portfolioDistribution.finalPercentages || [];
          }
          
          eventData.eventType = {
            ...event.eventType,
            portfolioDistribution
          };
        }
        
        // Remove client-side ids that could cause MongoDB validation errors
        delete eventData._id;
        delete eventData.id;  // Remove the UUID from the client side
        
        // Create and save the event
        const newEvent = new Event(eventData);
        console.log("newEvent", newEvent);
        console.log("newEventType", JSON.stringify(newEvent.eventType, null, 2));
        await newEvent.save();
        scenario.eventSeries.push(newEvent._id);
      }
    }
    // 4. Update Spending Strategy
    // Clear existing spending strategy
    scenario.spendingStrategy = [];
    
    // Update spending strategy if it exists in request body
    if (body.spendingStrategy && Array.isArray(body.spendingStrategy)) {
      for (const expenseEvent of body.spendingStrategy) {
        // Only include events that have valid MongoDB IDs
        if (expenseEvent._id && mongoose.Types.ObjectId.isValid(expenseEvent._id)) {
          // Verify the event exists
          const eventExists = await Event.findById(expenseEvent._id);
          if (eventExists) {
            scenario.spendingStrategy.push(expenseEvent._id);
          }
        }
      }
    }
    
    // 5. Update Expense Withdrawal Strategy
    // Clear existing expense withdrawal strategy
    scenario.expenseWithdrawalStrategy = [];
    
    // Update expense withdrawal strategy if it exists in request body
    if (body.expenseWithdrawalStrategy && Array.isArray(body.expenseWithdrawalStrategy)) {
      for (const investmentItem of body.expenseWithdrawalStrategy) {
        // Only include investments that have valid MongoDB IDs
        if (investmentItem._id && mongoose.Types.ObjectId.isValid(investmentItem._id)) {
          // Verify the investment exists
          const investmentExists = await Investment.findById(investmentItem._id);
          if (investmentExists) {
            scenario.expenseWithdrawalStrategy.push(investmentItem._id);
          }
        }
      }
    }
    
    // 6. Update Inflation Rate
    scenario.inflationRate = body.inflationRate;

    // Save the updated scenario
    await scenario.save();

    return NextResponse.json({
      success: true,
      message: "Scenario updated successfully",
      scenarioId: scenario._id
    });
  } catch (error) {
    console.error('Error updating scenario:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update scenario', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
