import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { Scenario } from '@/types/scenario'
import client from '@/lib/db'
import { randomNormal } from 'd3-random'
import { getTaxData } from '@/types/taxScraper'
import { FixedValues, NormalDistributionValues, UniformDistributionValues } from '@/types/utils'

export async function POST(req: NextRequest) {
    // Expects the POST request to send {"id": id} as a body to the server
    // Expects raw JSON file from body of the request (not form-data)
    try{
        const data = await req.json(); // Assuming body is never null
        const scenario = await getScenario(data.id);
        // console.log(scenario);
        if (scenario !== null){
            const scenarioData: Scenario = {
                id: scenario._id.toString(),
                name: scenario.name,
                description: scenario.description,
                financialGoal: scenario.financialGoal,
                investments: scenario.investments,
                eventSeries: scenario.eventSeries,
                spendingStrategy: scenario.spendingStrategy,
                expenseWithdrawalStrategy: scenario.expenseWithdrawalStrategy,
                inflationRate: scenario.inflationRate,
                RothConversionStrategy: scenario.RothConversionStrategy,
                RMDStrategy: scenario.RMDStrategy,
                rothConversion: scenario.rothConversion,
                residenceState: scenario.residenceState,
                owner: scenario.owner,
                ownerBirthYear: scenario.ownerBirthYear,
                ownerLifeExpectancy: scenario.ownerLifeExpectancy,
                viewPermissions: scenario.viewPermissions,
                editPermissions: scenario.editPermissions,
                type: scenario.type,
                spouseBirthYear: scenario.spouseBirthYear,
                spouseLifeExpectancy: scenario.spouseLifeExpectancy
            };
            // console.log(scenarioData);
        }
        else{
            return NextResponse.json({ message: "Error: Scenario Not Found" });
        }
        await simulation(scenario);
        return NextResponse.json(scenario); // Placeholder, debug
    } catch(e) {
        return NextResponse.json({ message: "Error: Invalid Request", error: e })
    }
}

async function getScenario(id: string) {
    const targetId = new ObjectId(id);
    console.log(targetId);
    const db = client.db("main");
    const targetScenario = db.collection("scenarios").findOne({_id: targetId });
    return targetScenario
}

async function simulation(scenario: Scenario){
    const currentYear = new Date().getFullYear();
    var age = currentYear - scenario.ownerBirthYear;
    console.log(scenario.ownerBirthYear);
    console.log(typeof scenario.ownerBirthYear);

    // Sample life expectancy
    var ownerLifeExpectancy = null;
    if (scenario.ownerLifeExpectancy.type === "fixed"){
        ownerLifeExpectancy = scenario.ownerLifeExpectancy.value;
    }
    else{
        const normal = randomNormal(scenario.ownerLifeExpectancy.mean, scenario.ownerLifeExpectancy.stdDev);
        ownerLifeExpectancy = Math.floor(normal()); // Life expectancy should be a whole number for the loop
    }

    // Obtain initial tax brackets with which to use for simulation
    const initialTaxBrackets = await getTaxData(currentYear, scenario.residenceState);
    var prevTaxBrackets = initialTaxBrackets;
    console.log(`Fetched initial tax brackets for ${scenario.residenceState} in ${currentYear}`);

    // Simulation loop
    for(var age = currentYear - scenario.ownerBirthYear; age < ownerLifeExpectancy; age++){
        // Simulation logic

        // Inflation assumption calculation for this year
        const inflation = getInflationRate(scenario.inflationRate);
        console.log(`Inflation rate for age ${age} calculated to be ${inflation}`);

        // Adjust this year's tax brackets for inflation
        var taxBrackets = updateTaxBrackets(prevTaxBrackets, inflation);
        console.log(`Adjusted tax brackets for age ${age}`);

        // Update previous tax brackets for next iteration
        prevTaxBrackets = taxBrackets;

        console.log(age);
    }
    console.log("=====================SIMULATION FINISHED=====================");
    return;
}

function getInflationRate(inflationRate: FixedValues | NormalDistributionValues | UniformDistributionValues){
    if (inflationRate.type === "fixed"){
        return inflationRate.value;
    }
    else if (inflationRate.type === "normal"){
        const normal = randomNormal(inflationRate.mean, inflationRate.stdDev);
        return normal();
    }
    else {
        const uniform = Math.random() * (inflationRate.max - inflationRate.min) + inflationRate.min;
        return uniform;
    }
}

function updateTaxBrackets(taxBrackets: any, inflationRate: number){
    // MATH CURRENTLY ASSUMES INFLATION INCREASES ARE VALUES > 1
    // (IF NOT, CHANGE TRUEINFLATION TO 1 + INFLATIONRATE)
    const trueInflation = inflationRate;

    taxBrackets.federal.incomeBrackets.lower *= trueInflation;
    taxBrackets.federal.incomeBrackets.upper *= trueInflation;
    taxBrackets.federal.incomeBrackets.rate *= trueInflation;

    taxBrackets.state.incomeBrackets.lower *= trueInflation;
    taxBrackets.state.incomeBrackets.upper *= trueInflation;
    taxBrackets.state.incomeBrackets.rate *= trueInflation;

    return taxBrackets;
}