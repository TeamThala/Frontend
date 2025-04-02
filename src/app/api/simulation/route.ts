import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { Scenario } from '@/types/scenario'
import client from '@/lib/db'
// import { simulation } from './simulation'
import { Investment, InvestmentType } from '@/types/investment'
import { parseFixedValue, parseNormalDistribution } from './parseValues'
import { Event } from '@/types/event'
import { FixedValues, NormalDistributionValues } from '@/types/utils'
import { FixedYear, UniformYear, NormalYear, EventYear } from '@/types/event'


export async function POST(req: NextRequest) {
    // Expects the POST request to send {"id": id} as a body to the server
    // Expects raw JSON file from body of the request (not form-data)
    try{
        const data = await req.json(); // Assuming body is never null
        const scenario = await getScenario(data.id);
        // console.log(scenario);
        if (scenario !== null){
            console.log("Scenario found, running simulation...");
            // console.log(scenario);
            // await simulation(scenario);
            console.log(typeof scenario);
        }
        else{
            return NextResponse.json({ message: "Error: Scenario Not Found" });
        }
        
        return NextResponse.json(scenario); // Placeholder, debug
    } catch(e) {
        return NextResponse.json({ message: "Error: Invalid Request", error: e })
    }
}

async function getScenario(id: string): Promise<Scenario | null> {
    // Query mongoDB
    const targetId = new ObjectId(id);
    console.log(targetId);
    const db = client.db("main");
    const targetScenario = await db.collection("scenarios").findOne({_id: targetId });

    // Parse response from mongoDB
    if (targetScenario === null) {
        console.log("Error: Scenario not found");
        return null;
    }
    else {
        // Parse investments
        const investments = await parseInvestments(targetScenario.investments);
        if (investments === null) {
            console.log("Error: Investments could not be parsed");
            return null;
        }

        // Parse expense withdrawal strategy
        const expenseWithdrawalStrategy = await parseEvents(targetScenario.expenseWithdrawalStrategy);
        if (expenseWithdrawalStrategy === null) {
            console.log("Error: Expense Withdrawal Strategy could not be parsed");
            return null;
        }

        // Parse Roth conversion strategy
        const RothConversionStrategy = await parseEvents(targetScenario.RothConversionStrategy);
        if (RothConversionStrategy === null) {
            console.log("Error: Roth Conversion Strategy could not be parsed");
            return null;
        }

        // Parse RMD strategy
        const RMDStrategy = await parseEvents(targetScenario.RMDStrategy);
        if (RMDStrategy === null) {
            console.log("Error: RMD Strategy could not be parsed");
            return null;
        }

        const ans: Scenario = {
            id: targetScenario._id.toString(),
            name: targetScenario.name,
            description: targetScenario.description,
            financialGoal: targetScenario.financialGoal,
            investments: investments,
            eventSeries: targetScenario.eventSeries,
            spendingStrategy: targetScenario.spendingStrategy, // expenses
            expenseWithdrawalStrategy: expenseWithdrawalStrategy, // investment events
            inflationRate: targetScenario.inflationRate,
            RothConversionStrategy: RothConversionStrategy, // investment events
            RMDStrategy: RMDStrategy, // investment events
            rothConversion: targetScenario.rothConversion.rothConversion,
            residenceState: targetScenario.residenceState,
            owner: targetScenario.owner,
            ownerBirthYear: targetScenario.userBirthYear,
            ownerLifeExpectancy: targetScenario.userLifeExpectancy,
            viewPermissions: targetScenario.viewPermissions,
            editPermissions: targetScenario.editPermissions,
            type: targetScenario.type,
            spouseBirthYear: targetScenario.spouseBirthYear,
            spouseLifeExpectancy: targetScenario.spouseLifeExpectancy,
            updatedAt: new Date()
        }
        return ans;
    }
}

async function parseInvestments(ids: string[]): Promise<Investment[] | null>{
    const db = client.db("main");
    const ans = [] as Investment[];
    for (let i=0; i<ids.length; i++){
        const id = ids[i];
        // Find investment from db
        const investment = await db.collection("investments").findOne({ _id: new ObjectId(id) });
        if (investment === null) {
            console.log("Error: Investment not found");
            return null;
        }
        // Parse investmentType
        const investmentType = await parseInvestmentType(investment.investmentType);
        if (investmentType === null) {
            console.log("Error: Investment Type could not be parsed");
            return null;
        }
        // Parse investment
        if (investment !== null) {
            const parsedInvestment: Investment = {
                id: investment._id.toString(),
                value: investment.value,
                investmentType: investmentType,
                taxStatus: investment.taxStatus,
            }
            ans.push(parsedInvestment);
        }
        else {
            console.log("Error: Investment not found");
            return null;
        }
    }
    return ans;
}

async function parseInvestmentType(id: string): Promise<InvestmentType | null> {
    const db = client.db("main");
    const investmentType = await db.collection("investmentTypes").findOne({ _id: new ObjectId(id) });
    if (investmentType === null) {
        console.log("Error: Investment Type not found");
        return null;
    }
    else {
        // Parse expectedAnnualReturn based on its type
        let expectedAnnualReturn: FixedValues | NormalDistributionValues | null = null;
        if (investmentType.type === "fixed") {
            expectedAnnualReturn = parseFixedValue(investmentType.expectedAnnualReturn.valueType, investmentType.expectedAnnualReturn.value);
        }
        else if (investmentType.type === "normal") {
            expectedAnnualReturn = parseNormalDistribution(investmentType.expectedAnnualReturn.valueType, investmentType.expectedAnnualReturn.mean, investmentType.expectedAnnualReturn.stdDev);
        }
        else {
            console.log("Error: Invalid expectedAnnualReturn type");
            return null;
        }

        // Parse expectedAnnualIncome based on its type
        let expectedAnnualIncome: FixedValues | NormalDistributionValues | null = null;
        if (investmentType.expectedAnnualIncome.type === "fixed") {
            expectedAnnualIncome = parseFixedValue(investmentType.expectedAnnualIncome.valueType, investmentType.expectedAnnualIncome.value);
        }
        else if (investmentType.expectedAnnualIncome.type === "normal") {
            expectedAnnualIncome = parseNormalDistribution(investmentType.expectedAnnualIncome.valueType, investmentType.expectedAnnualIncome.mean, investmentType.expectedAnnualIncome.stdDev);
        }
        else {
            console.log("Error: Invalid expectedAnnualIncome type");
            return null;
        }

        
        const parsedInvestmentType: InvestmentType = {
            id: investmentType._id.toString(),
            name: investmentType.name,
            description: investmentType.description,
            expectedAnnualReturn: expectedAnnualReturn,
            expenseRatio: investmentType.expenseRatio,
            expectedAnnualIncome: expectedAnnualIncome,
            taxability: investmentType.taxability
        }
        return parsedInvestmentType;
    }
}

async function parseEvents(ids: string[]): Promise<Event[] | null> {
    const db = client.db("main");
    const ans = [] as Event[];
    for (let i=0; i<ids.length; i++){
        const id = ids[i];
        // Find investment event from db
        const investmentEvent = await db.collection("events").findOne({ _id: new ObjectId(id) });
        if (investmentEvent === null) {
            console.log("Error: Investment not found");
            return null;
        }
        if (investmentEvent.eventType.type === "investment"){
            // Parse investment event
            const parsedInvestmentEvent: Event = {
                id: investmentEvent._id.toString(),
                name: investmentEvent.name,
                description: investmentEvent.description,
                startYear: parseStartYear(investmentEvent.startYear),
                duration: parseDuration(investmentEvent.duration),
                durationType: 'years', // TODO: deal with duration type not being years later, hardcoded
                eventType: {
                    type: "investment",
                    amount: investmentEvent.eventType.amount,
                    inflationAdjustment: investmentEvent.eventType.inflationAdjustment,
                    assetAllocation: {
                        type: investmentEvent.eventType.assetAllocation[0].type, // Assuming all asset allocation elements are of the same type
                        investments: await parseInvestments(investmentEvent.eventType.assetAllocation.map((asset: any) => asset.investment)),
                        percentages: investmentEvent.eventType.assetAllocation.map((asset: any) => asset.percentage),
                        initialPercentages: investmentEvent.eventType.assetAllocation.map((asset: any) => asset.initialPercentage),
                        finalPercentages: investmentEvent.eventType.assetAllocation.map((asset: any) => asset.finalPercentage)
                    },
                    maxCash: investmentEvent.eventType.maximumCash,
                    // targetAsset: investmentEvent.eventType.targetAsset
                }
            };
            ans.push(parsedInvestmentEvent);
        }
        else if (investmentEvent.eventType.type === "rebalance"){ // TODO: check rebalance event
            // Parse rebalance event
            const parsedRebalanceEvent: Event = {
                id: investmentEvent._id.toString(),
                name: investmentEvent.name,
                description: investmentEvent.description,
                startYear: parseStartYear(investmentEvent.startYear),
                duration: parseDuration(investmentEvent.duration),
                durationType: 'years', // TODO: deal with duration type not being years later, hardcoded
                eventType: {
                    type: "rebalance",
                    portfolioDistribution: {
                        type: investmentEvent.eventType.assetAllocation[0].type, // Assuming all asset allocation elements are of the same type
                        investments: await parseInvestments(investmentEvent.eventType.assetAllocation.map((asset) => asset.investment)),
                        percentages: investmentEvent.eventType.assetAllocation.map((asset: any) => asset.percentage),
                        initialPercentages: investmentEvent.eventType.assetAllocation.map((asset: any) => asset.initialPercentage),
                        finalPercentages: investmentEvent.eventType.assetAllocation.map((asset: any) => asset.finalPercentage)
                    }
                }
            };
            ans.push(parsedRebalanceEvent);
        }
        else if (investmentEvent.eventType.type === "income"){
            // Parse income event
            const parsedIncomeEvent: Event = {
                id: investmentEvent._id.toString(),
                name: investmentEvent.name,
                description: investmentEvent.description,
                startYear: parseStartYear(investmentEvent.startYear),
                duration: parseDuration(investmentEvent.duration),
                durationType: 'years', // TODO: deal with duration type not being years later, hardcoded
                eventType: {
                    type: "income",
                    amount: investmentEvent.eventType.amount,
                    inflationAdjustment: investmentEvent.eventType.inflationAdjustment,
                    socialSecurity: investmentEvent.eventType.socialSecurity,
                    wage: investmentEvent.eventType.wage,
                    expectedAnnualChange: {
                        type: investmentEvent.eventType.expectedAnnualChange.type,
                        valueType: investmentEvent.eventType.expectedAnnualChange.valueType,
                        value: investmentEvent.eventType.expectedAnnualChange.value,
                        mean: investmentEvent.eventType.expectedAnnualChange.mean,
                        stdDev: investmentEvent.eventType.expectedAnnualChange.stdDev,
                        min: investmentEvent.eventType.expectedAnnualChange.min,
                        max: investmentEvent.eventType.expectedAnnualChange.max
                    },
                    percentageOfIncome: investmentEvent.eventType.percentageOfIncome
                }
            };
            ans.push(parsedIncomeEvent);
        }
        else { // expense event
            // Parse expense event
            const parsedExpenseEvent: Event = {
                id: investmentEvent._id.toString(),
                name: investmentEvent.name,
                description: investmentEvent.description,
                startYear: parseStartYear(investmentEvent.startYear),
                duration: parseDuration(investmentEvent.duration),
                durationType: 'years', // TODO: deal with duration type not being years later, hardcoded
                eventType: {
                    type: "expense",
                    discretionary: investmentEvent.eventType.discretionary,
                    amount: investmentEvent.eventType.amount,
                    inflationAdjustment: investmentEvent.eventType.inflationAdjustment,
                    expectedAnnualChange: {
                        type: investmentEvent.eventType.expectedAnnualChange.type,
                        valueType: investmentEvent.eventType.expectedAnnualChange.valueType,
                        value: investmentEvent.eventType.expectedAnnualChange.value,
                        mean: investmentEvent.eventType.expectedAnnualChange.mean,
                        stdDev: investmentEvent.eventType.expectedAnnualChange.stdDev,
                        min: investmentEvent.eventType.expectedAnnualChange.min,
                        max: investmentEvent.eventType.expectedAnnualChange.max
                    },
                    percentageOfIncome: investmentEvent.eventType.percentageOfIncome
                }
            };
            ans.push(parsedExpenseEvent);
        }
    }
    return ans;
}

function parseStartYear(startYear: any): FixedYear | UniformYear | NormalYear | EventYear {
    if (startYear.type === "fixed") {
        return {
            type: "fixed",
            year: startYear.year
        } as FixedYear;
    } else if (startYear.type === "uniform") {
        return {
            type: "uniform",
            year: {
                type: "uniform",
                valueType: "amount", // hardcoded
                min: startYear.year.min,
                max: startYear.year.max
            }
        } as UniformYear;
    } else if (startYear.type === "normal") {
        return {
            type: "normal",
            year: {
                type: "normal",
                valueType: "amount", // hardcoded
                mean: startYear.year.mean,
                stdDev: startYear.year.stdDev
            }
        } as NormalYear;
    } else if (startYear.type === "event") {
        return {
            type: "event",
            eventTime: startYear.eventTime,
            eventId: startYear.event
        } as EventYear; // TODO: check if this is correct
    } else {
        throw new Error("Invalid start year type");
    }
}

function parseDuration(duration: any): FixedYear | UniformYear | NormalYear {
    if (duration.type === "fixed") {
        return {
            type: "fixed",
            year: duration.year
        } as FixedYear;
    } else if (duration.type === "uniform") {
        return {
            type: "uniform",
            year: {
                type: "uniform",
                valueType: "amount", // hardcoded
                min: duration.year.min,
                max: duration.year.max
            }
        } as UniformYear;
    } else if (duration.type === "normal") {
        return {
            type: "normal",
            year: {
                type: "normal",
                valueType: "amount", // hardcoded
                mean: duration.year.mean,
                stdDev: duration.year.stdDev
            }
        } as NormalYear;
    } else {
        throw new Error("Invalid start year type");
    }
}