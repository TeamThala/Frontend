import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'

import client from '@/lib/db'
import { Scenario } from '@/app/types/scenario';

export async function POST(req: NextRequest) {
    // Expects the POST request to send {"id": id} as a body to the server
    // Expects raw JSON file from body of the request (not form-data)
    try{
        const data = await req.json(); // Assuming body is never null
        const scenario = await getScenario(data.id);
        // console.log(scenario);
        if (scenario !== null){
            const scenarioData: Scenario = {
                id: scenario._id,
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
                editPermissions: scenario.editPermissions
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
    for(var age = currentYear - scenario.ownerBirthYear; age < scenario.ownerLifeExpectancy; age++){
        // Simulation logic
        console.log(age);
    }
    console.log(currentYear);
    return;
}

