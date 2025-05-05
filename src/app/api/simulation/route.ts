import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from "fs"
// import { ObjectId } from 'mongodb'
import { Scenario } from '@/types/scenario'
// import client from '@/lib/db'
import { simulation } from './simulation'
import os from 'os'
import { WorkerPool } from './batch/workerPool'
// import { Investment, InvestmentType } from '@/types/investment'
// import { parseFixedValue, parseNormalDistribution } from './parseValues'
// import { Event } from '@/types/event'
// import { FixedValues, NormalDistributionValues } from '@/types/utils'
// import { FixedYear, UniformYear, NormalYear, EventYear } from '@/types/event'

// Use available CPUs for parallelization (but limit to a reasonable number)
const MAX_CONCURRENT = Math.min(os.cpus().length, 4);

export async function POST(req: NextRequest) {
    // Expects the POST request to send {"id": id} as a body to the server
    // Expects raw JSON file from body of the request (not form-data)
    try {
        const data = await req.json(); // Assuming body is never null
        const filepath = data.filepath;
        const simulationCount = data.simulationCount || 1;
        const parameterExploration = data.parameterExploration || null;

        console.log("FILEPATH:", filepath);
        console.log("SIMULATION COUNT:", simulationCount);
        console.log("MAX CONCURRENT:", MAX_CONCURRENT);
        
        // const scenario = await getScenario(data.id);
        const scenario = await loadScenario(filepath); // Placeholder to load scenario data from JSON
        
        if (scenario !== null) {
            console.log("Scenario found, running simulations...");
            
            if (simulationCount === 1) {
                // For a single simulation, just run it directly without workers
                const result = await simulation(scenario);
                console.log("Simulation result:", result);
                
                if (result === null) {
                    return NextResponse.json({ message: "Error: Simulation failed" });
                }
                
                return NextResponse.json(result);
            } else {
                // For multiple simulations, use worker threads for true parallelization
                console.log(`Running ${simulationCount} simulations in parallel using workers...`);
                
                // Create scenarios array (deep clones of the original scenario)
                const scenarios = Array.from({ length: simulationCount }, () => 
                    JSON.parse(JSON.stringify(scenario)) as Scenario
                );

                if (parameterExploration !== null) {
                    console.log("PARAMETER EXPLORE:", parameterExploration);
                    
                }
                
                // Create a worker pool and run the batch
                const workerPool = new WorkerPool(MAX_CONCURRENT);
                const results = await workerPool.runBatch(scenarios);
                
                console.log(`Completed ${results.length} simulations out of ${simulationCount} requested`);
                
                if (results.length === 0) {
                    return NextResponse.json({ 
                        message: "Warning: All simulations failed",
                        scenario: scenario,
                        simulationResults: []
                    });
                }
                
                // Format the response to match the single simulation format
                // But include all simulation results with their IDs
                return NextResponse.json({
                    success: true,
                    data: results.map((result, index) => ({
                        simulationId: index,
                        ...result, // Include all result properties
                    }))
                });
            }
        } else {
            return NextResponse.json({ message: "Error: Scenario Not Found" });
        }
    } catch(e) {
        console.error("Error in simulation route:", e);
        return NextResponse.json({ message: "Error: Invalid Request", error: e })
    }
}

async function loadScenario(filepath:string="src/data/jsonScenarios/scenario1.json"): Promise<Scenario | null> { // placeholder to load scenario data from JSON
    try {
        const data = await fs.readFile(filepath, 'utf8');
        const scenario = JSON.parse(data) as Scenario;
        //console.log("Scenario loaded successfully:", scenario);
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
