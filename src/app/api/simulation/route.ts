// import { NextRequest, NextResponse } from 'next/server'
// import { ObjectId } from 'mongodb'
// import { Scenario } from '@/types/scenario'
// import client from '@/lib/db'
// import { simulation } from './simulation'


// export async function POST(req: NextRequest) {
//     // Expects the POST request to send {"id": id} as a body to the server
//     // Expects raw JSON file from body of the request (not form-data)
//     try{
//         const data = await req.json(); // Assuming body is never null
//         const scenario = await getScenario(data.id);
//         // console.log(scenario);
//         if (scenario !== null){
//             console.log("Scenario found, running simulation...");
//             const scenarioData: Scenario = {
//                 id: scenario._id.toString(),
//                 name: scenario.name,
//                 description: scenario.description,
//                 financialGoal: scenario.financialGoal,
//                 investments: scenario.investments,
//                 eventSeries: scenario.eventSeries,
//                 spendingStrategy: scenario.spendingStrategy,
//                 expenseWithdrawalStrategy: scenario.expenseWithdrawalStrategy,
//                 inflationRate: scenario.inflationRate,
//                 RothConversionStrategy: scenario.RothConversionStrategy,
//                 RMDStrategy: scenario.RMDStrategy,
//                 rothConversion: scenario.rothConversion,
//                 residenceState: scenario.residenceState,
//                 owner: scenario.owner,
//                 ownerBirthYear: scenario.userBirthYear,
//                 ownerLifeExpectancy: scenario.userLifeExpectancy,
//                 viewPermissions: scenario.viewPermissions,
//                 editPermissions: scenario.editPermissions,
//                 type: scenario.type,
//                 spouseBirthYear: scenario.spouseBirthYear,
//                 spouseLifeExpectancy: scenario.spouseLifeExpectancy
//             };
//             // console.log(scenarioData);
//             await simulation(scenarioData);
//         }
//         else{
//             return NextResponse.json({ message: "Error: Scenario Not Found" });
//         }
        
//         return NextResponse.json(scenario); // Placeholder, debug
//     } catch(e) {
//         return NextResponse.json({ message: "Error: Invalid Request", error: e })
//     }
// }

// async function getScenario(id: string) {
//     const targetId = new ObjectId(id);
//     console.log(targetId);
//     const db = client.db("main");
//     const targetScenario = db.collection("scenarios").findOne({_id: targetId });
//     return targetScenario
// }

