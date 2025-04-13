import { /*NextRequest, */NextResponse } from 'next/server'
import { promises as fs } from "fs"
// import { ObjectId } from 'mongodb'
import { Scenario } from '@/types/scenario'
// import client from '@/lib/db'
import { simulation } from './simulation'
// import { Investment, InvestmentType } from '@/types/investment'
// import { parseFixedValue, parseNormalDistribution } from './parseValues'
// import { Event } from '@/types/event'
// import { FixedValues, NormalDistributionValues } from '@/types/utils'
// import { FixedYear, UniformYear, NormalYear, EventYear } from '@/types/event'


export async function POST(/*req: NextRequest*/) {
    // Expects the POST request to send {"id": id} as a body to the server
    // Expects raw JSON file from body of the request (not form-data)
    try{
        // const data = await req.json(); // Assuming body is never null
        // const scenario = await getScenario(data.id);
        const scenario = await loadScenario(); // Placeholder to load scenario data from JSON
        // console.log("LOADSCENARIO RESPONSE:")
        // console.log(scenario);
        if (scenario !== null){
            console.log("Scenario found, running simulation...");
            // console.log(scenario);
            await simulation(scenario);
        }
        else{
            return NextResponse.json({ message: "Error: Scenario Not Found" });
        }
        
        return NextResponse.json(scenario); // Placeholder, debug
    } catch(e) {
        return NextResponse.json({ message: "Error: Invalid Request", error: e })
    }
}

async function loadScenario(filepath:string="src/data/jsonScenarios/scenario1.json"): Promise<Scenario | null> { // placeholder to load scenario data from JSON
    try {
        const data = await fs.readFile(filepath, 'utf8');
        const scenario = JSON.parse(data) as Scenario;
        console.log("Scenario loaded successfully:", scenario);
        return scenario;
    } catch (err) {
        console.error("Error reading or parsing file:", err);
        return null;
    }
}

// async function getScenario(id: string): Promise<Scenario | null> {
//     // Query mongoDB
//     const targetId = new ObjectId(id);
//     console.log(targetId);
//     const db = client.db("main");
//     const targetScenario = await db.collection("scenarios").findOne({_id: targetId });

//     // Parse response from mongoDB
//     if (targetScenario === null) {
//         console.log("Error: Scenario not found");
//         return null;
//     }
//     else {
//         // Parse investments
//         const investments = await parseInvestments(targetScenario.investments);
//         if (investments === null) {
//             console.log("Error: Investments could not be parsed");
//             return null;
//         }

//         // Parse expense withdrawal strategy
//         const expenseWithdrawalStrategy = await parseEvents(targetScenario.expenseWithdrawalStrategy);
//         if (expenseWithdrawalStrategy === null) {
//             console.log("Error: Expense Withdrawal Strategy could not be parsed");
//             return null;
//         }

//         // Parse Roth conversion strategy
//         const RothConversionStrategy = await parseEvents(targetScenario.RothConversionStrategy);
//         if (RothConversionStrategy === null) {
//             console.log("Error: Roth Conversion Strategy could not be parsed");
//             return null;
//         }

//         // Parse RMD strategy
//         const RMDStrategy = await parseEvents(targetScenario.RMDStrategy);
//         if (RMDStrategy === null) {
//             console.log("Error: RMD Strategy could not be parsed");
//             return null;
//         }

//         const ans: Scenario = {
//             id: targetScenario._id.toString(),
//             name: targetScenario.name,
//             description: targetScenario.description,
//             financialGoal: targetScenario.financialGoal,
//             investments: investments,
//             eventSeries: targetScenario.eventSeries,
//             spendingStrategy: targetScenario.spendingStrategy, // expenses
//             expenseWithdrawalStrategy: expenseWithdrawalStrategy, // investment events
//             inflationRate: targetScenario.inflationRate,
//             RothConversionStrategy: RothConversionStrategy, // investment events
//             RMDStrategy: RMDStrategy, // investment events
//             rothConversion: targetScenario.rothConversion.rothConversion,
//             residenceState: targetScenario.residenceState,
//             owner: targetScenario.owner,
//             ownerBirthYear: targetScenario.userBirthYear,
//             ownerLifeExpectancy: targetScenario.userLifeExpectancy,
//             viewPermissions: targetScenario.viewPermissions,
//             editPermissions: targetScenario.editPermissions,
//             type: targetScenario.type,
//             spouseBirthYear: targetScenario.spouseBirthYear,
//             spouseLifeExpectancy: targetScenario.spouseLifeExpectancy,
//             updatedAt: new Date()
//         }
//         return ans;
//     }
// }

// async function parseInvestments(ids: string[]): Promise<Investment[] | null>{
//     const db = client.db("main");
//     const ans = [] as Investment[];
//     for (let i=0; i<ids.length; i++){
//         const id = ids[i];
//         // Find investment from db
//         const investment = await db.collection("investments").findOne({ _id: new ObjectId(id) });
//         if (investment === null) {
//             console.log("Error: Investment not found");
//             return null;
//         }
//         // Parse investmentType
//         const investmentType = await parseInvestmentType(investment.investmentType);
//         if (investmentType === null) {
//             console.log("Error: Investment Type could not be parsed");
//             return null;
//         }
//         // Parse investment
//         if (investment !== null) {
//             const parsedInvestment: Investment = {
//                 id: investment._id.toString(),
//                 value: investment.value,
//                 investmentType: investmentType,
//                 taxStatus: investment.taxStatus,
//             }
//             ans.push(parsedInvestment);
//         }
//         else {
//             console.log("Error: Investment not found");
//             return null;
//         }
//     }
//     return ans;
// }

// async function parseInvestmentType(id: string): Promise<InvestmentType | null> {
//     const db = client.db("main");
//     const investmentType = await db.collection("investmentTypes").findOne({ _id: new ObjectId(id) });
//     if (investmentType === null) {
//         console.log("Error: Investment Type not found");
//         return null;
//     }
//     else {
//         // Parse expectedAnnualReturn based on its type
//         let expectedAnnualReturn: FixedValues | NormalDistributionValues | null = null;
//         if (investmentType.type === "fixed") {
//             expectedAnnualReturn = parseFixedValue(investmentType.expectedAnnualReturn.valueType, investmentType.expectedAnnualReturn.value);
//         }
//         else if (investmentType.type === "normal") {
//             expectedAnnualReturn = parseNormalDistribution(investmentType.expectedAnnualReturn.valueType, investmentType.expectedAnnualReturn.mean, investmentType.expectedAnnualReturn.stdDev);
//         }
//         else {
//             console.log("Error: Invalid expectedAnnualReturn type");
//             return null;
//         }

//         // Parse expectedAnnualIncome based on its type
//         let expectedAnnualIncome: FixedValues | NormalDistributionValues | null = null;
//         if (investmentType.expectedAnnualIncome.type === "fixed") {
//             expectedAnnualIncome = parseFixedValue(investmentType.expectedAnnualIncome.valueType, investmentType.expectedAnnualIncome.value);
//         }
//         else if (investmentType.expectedAnnualIncome.type === "normal") {
//             expectedAnnualIncome = parseNormalDistribution(investmentType.expectedAnnualIncome.valueType, investmentType.expectedAnnualIncome.mean, investmentType.expectedAnnualIncome.stdDev);
//         }
//         else {
//             console.log("Error: Invalid expectedAnnualIncome type");
//             return null;
//         }

        
//         const parsedInvestmentType: InvestmentType = {
//             id: investmentType._id.toString(),
//             name: investmentType.name,
//             description: investmentType.description,
//             expectedAnnualReturn: expectedAnnualReturn,
//             expenseRatio: investmentType.expenseRatio,
//             expectedAnnualIncome: expectedAnnualIncome,
//             taxability: investmentType.taxability
//         }
//         return parsedInvestmentType;
//     }
// }

// async function parseEvents(ids: string[]): Promise<Event[] | null> {
//     const db = client.db("main");
//     const ans = [] as Event[];
//     for (let i=0; i<ids.length; i++){
//         const id = ids[i];
//         // Find event from db
//         const event = await db.collection("events").findOne({ _id: new ObjectId(id) });
//         if (event === null) {
//             console.log("Error: Investment not found");
//             return null;
//         }
//         if (event.eventType.type === "investment"){
//             const parsedInvestments: Investment[] = [];
//             const parsedPercentages: number[] = [];
//             const parsedInitialPercentages: number[] = [];
//             const parsedFinalPercentages: number[] = [];

//             for (const asset of event.eventType.assetAllocation) {
//                 const parsedInvestment = await parseInvestments([asset.investment]);
//                 if (parsedInvestment === null) {
//                     console.log("Error: Investment not found");
//                     return null;
//                 }
//                 parsedInvestments.push(parsedInvestment[0]); // There should only be one investment per asset object
//                 parsedPercentages.push(asset.percentage);
//                 parsedInitialPercentages.push(asset.initialPercentage);
//                 parsedFinalPercentages.push(asset.finalPercentage);
//             }



//             // Parse investment event
//             const parsedInvestmentEvent: Event = {
//                 id: event._id.toString(),
//                 name: event.name,
//                 description: event.description,
//                 startYear: parseStartYear(event.startYear),
//                 duration: parseDuration(event.duration),
//                 durationType: 'years', // TODO: deal with duration type not being years later, hardcoded
//                 eventType: {
//                     type: "investment",
//                     amount: event.eventType.amount,
//                     inflationAdjustment: event.eventType.inflationAdjustment,
//                     assetAllocation: {
//                         // Assuming all asset allocation elements are of the same type
//                         type: event.eventType.assetAllocation[0].type,
//                         investments: parsedInvestments,
//                         percentages: parsedPercentages,
//                         initialPercentages: parsedInitialPercentages,
//                         finalPercentages: parsedFinalPercentages
//                         },
//                         maxCash: event.eventType.maximumCash,
//                     // targetAsset: investmentEvent.eventType.targetAsset
//                 }
//             };
//             ans.push(parsedInvestmentEvent);
//         }
//         else if (event.eventType.type === "rebalance"){ // TODO: check rebalance event
//             // Parse rebalance event
//             const parsedRebalanceEvent: Event = {
//                 id: event._id.toString(),
//                 name: event.name,
//                 description: event.description,
//                 startYear: parseStartYear(event.startYear),
//                 duration: parseDuration(event.duration),
//                 durationType: 'years', // TODO: deal with duration type not being years later, hardcoded
//                 eventType: {
//                     type: "rebalance",
//                     portfolioDistribution: {
//                         type: event.eventType.assetAllocation[0].type, // Assuming all asset allocation elements are of the same type
//                         investments: await parseInvestments(event.eventType.assetAllocation.map((asset) => asset.investment)),
//                         percentages: event.eventType.assetAllocation.map((asset: any) => asset.percentage),
//                         initialPercentages: event.eventType.assetAllocation.map((asset: any) => asset.initialPercentage),
//                         finalPercentages: investmentEvent.eventType.assetAllocation.map((asset: any) => asset.finalPercentage)
//                     }
//                 }
//             };
//             ans.push(parsedRebalanceEvent);
//         }
//         else if (event.eventType.type === "income"){
//             // Parse income event
//             const parsedIncomeEvent: Event = {
//                 id: event._id.toString(),
//                 name: event.name,
//                 description: event.description,
//                 startYear: parseStartYear(event.startYear),
//                 duration: parseDuration(event.duration),
//                 durationType: 'years', // TODO: deal with duration type not being years later, hardcoded
//                 eventType: {
//                     type: "income",
//                     amount: event.eventType.amount,
//                     inflationAdjustment: event.eventType.inflationAdjustment,
//                     socialSecurity: event.eventType.socialSecurity,
//                     wage: event.eventType.wage,
//                     expectedAnnualChange: {
//                         type: event.eventType.expectedAnnualChange.type,
//                         valueType: event.eventType.expectedAnnualChange.valueType,
//                         value: event.eventType.expectedAnnualChange.value,
//                         mean: event.eventType.expectedAnnualChange.mean,
//                         stdDev: event.eventType.expectedAnnualChange.stdDev,
//                         min: event.eventType.expectedAnnualChange.min,
//                         max: event.eventType.expectedAnnualChange.max
//                     },
//                     percentageOfIncome: event.eventType.percentageOfIncome
//                 }
//             };
//             ans.push(parsedIncomeEvent);
//         }
//         else { // expense event
//             // Parse expense event
//             const parsedExpenseEvent: Event = {
//                 id: event._id.toString(),
//                 name: event.name,
//                 description: event.description,
//                 startYear: parseStartYear(event.startYear),
//                 duration: parseDuration(event.duration),
//                 durationType: 'years', // TODO: deal with duration type not being years later, hardcoded
//                 eventType: {
//                     type: "expense",
//                     discretionary: event.eventType.discretionary,
//                     amount: event.eventType.amount,
//                     inflationAdjustment: event.eventType.inflationAdjustment,
//                     expectedAnnualChange: {
//                         type: event.eventType.expectedAnnualChange.type,
//                         valueType: event.eventType.expectedAnnualChange.valueType,
//                         value: event.eventType.expectedAnnualChange.value,
//                         mean: event.eventType.expectedAnnualChange.mean,
//                         stdDev: event.eventType.expectedAnnualChange.stdDev,
//                         min: event.eventType.expectedAnnualChange.min,
//                         max: event.eventType.expectedAnnualChange.max
//                     },
//                     percentageOfIncome: event.eventType.percentageOfIncome
//                 }
//             };
//             ans.push(parsedExpenseEvent);
//         }
//     }
//     return ans;
// }

// function parseStartYear(startYear: any): FixedYear | UniformYear | NormalYear | EventYear {
//     if (startYear.type === "fixed") {
//         return {
//             type: "fixed",
//             year: startYear.year
//         } as FixedYear;
//     } else if (startYear.type === "uniform") {
//         return {
//             type: "uniform",
//             year: {
//                 type: "uniform",
//                 valueType: "amount", // hardcoded
//                 min: startYear.year.min,
//                 max: startYear.year.max
//             }
//         } as UniformYear;
//     } else if (startYear.type === "normal") {
//         return {
//             type: "normal",
//             year: {
//                 type: "normal",
//                 valueType: "amount", // hardcoded
//                 mean: startYear.year.mean,
//                 stdDev: startYear.year.stdDev
//             }
//         } as NormalYear;
//     } else if (startYear.type === "event") {
//         return {
//             type: "event",
//             eventTime: startYear.eventTime,
//             eventId: startYear.event
//         } as EventYear; // TODO: check if this is correct
//     } else {
//         throw new Error("Invalid start year type");
//     }
// }

// function parseDuration(duration: any): FixedYear | UniformYear | NormalYear {
//     if (duration.type === "fixed") {
//         return {
//             type: "fixed",
//             year: duration.year
//         } as FixedYear;
//     } else if (duration.type === "uniform") {
//         return {
//             type: "uniform",
//             year: {
//                 type: "uniform",
//                 valueType: "amount", // hardcoded
//                 min: duration.year.min,
//                 max: duration.year.max
//             }
//         } as UniformYear;
//     } else if (duration.type === "normal") {
//         return {
//             type: "normal",
//             year: {
//                 type: "normal",
//                 valueType: "amount", // hardcoded
//                 mean: duration.year.mean,
//                 stdDev: duration.year.stdDev
//             }
//         } as NormalYear;
//     } else {
//         throw new Error("Invalid start year type");
//     }
// }