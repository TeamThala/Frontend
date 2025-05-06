import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from "fs"
import { Scenario } from '@/types/scenario'
import { simulation } from './simulation'
import os from 'os'
import { WorkerPool, SimulationResult as WorkerSimulationResult } from './batch/workerPool'
import dbConnect from '@/lib/dbConnect'
import mongoose from 'mongoose'
import ScenarioModel from '@/models/Scenario'
import path from 'path'

// Use available CPUs for parallelization (but limit to a reasonable number)
const MAX_CONCURRENT = Math.min(os.cpus().length, 4);

export async function POST(req: NextRequest) {
    // Expects the POST request to send {"scenarioId": id} or {"filepath": path} as a body to the server
    try {
        const data = await req.json();
        const scenarioId = data.scenarioId;
        const filepath = data.filepath;
        const simulationCount = data.simulationCount || 1;
        const parameterExploration = data.parameterExploration || null;
        const twoDimensionalExploration = data.twoDimensionalExploration || null;

        console.log("SCENARIO ID:", scenarioId);
        console.log("FILEPATH:", filepath);
        console.log("SIMULATION COUNT:", simulationCount);
        console.log("MAX CONCURRENT:", MAX_CONCURRENT);
        
        // Load scenario either from MongoDB using scenarioId or from file using filepath
        let scenario: Scenario | null = null;
        
        if (scenarioId) {
            // Fetch directly from MongoDB
            console.log("Fetching scenario from database with ID:", scenarioId);
            scenario = await getScenarioFromDatabase(scenarioId);
            
            // Save the scenario to a JSON file for testing/debugging purposes
            if (scenario) {
                await saveScenarioToFile(scenario, 'test_scenario.json');
                console.log("Scenario saved to test_scenario.json for testing");
            }
        } else if (filepath) {
            // Fallback to loading from file
            console.log("Loading scenario from file:", filepath);
            scenario = await loadScenario(filepath);
        } else {
            return NextResponse.json({ message: "Error: No scenarioId or filepath provided" }, { status: 400 });
        }
        
        if (scenario !== null) {
            console.log("Scenario found, running simulations...");
            
            // Handle two-dimensional parameter exploration
            if (twoDimensionalExploration && 
                twoDimensionalExploration.parameter1 && 
                twoDimensionalExploration.parameter2) {
                
                console.log("2D PARAMETER EXPLORE:", {
                    param1: twoDimensionalExploration.parameter1,
                    param2: twoDimensionalExploration.parameter2
                });
                
                const typedExploration1 = twoDimensionalExploration.parameter1 as {
                    eventSeriesId: string;
                    parameterType: "duration" | "amount" | "startYear" | "allocation";
                    parameterValues: number[];
                };
                
                const typedExploration2 = twoDimensionalExploration.parameter2 as {
                    eventSeriesId: string;
                    parameterType: "duration" | "amount" | "startYear" | "allocation";
                    parameterValues: number[];
                };
                
                const param1Values = typedExploration1.parameterValues;
                const param2Values = typedExploration2.parameterValues;
                
                // Create a grid of results for all parameter combinations
                const resultsGrid: Array<{
                    parameter1Value: number;
                    parameter2Value: number;
                    simulations: WorkerSimulationResult[];
                }> = [];
                
                // Run batches for each combination
                for (const param1Value of param1Values) {
                    for (const param2Value of param2Values) {
                        // Create scenarios with this specific parameter combination
                        const currentScenarios = Array.from({ length: simulationCount }, () => {
                            const clonedScenario = JSON.parse(JSON.stringify(scenario)) as Scenario;
                            
                            // Apply both parameter values to the cloned scenario
                            applyParameterValue(clonedScenario, typedExploration1, param1Value);
                            applyParameterValue(clonedScenario, typedExploration2, param2Value);
                            
                            return clonedScenario;
                        });
                        
                        // Run the batch for this parameter combination
                        const workerPool = new WorkerPool(MAX_CONCURRENT);
                        const batchResults = await workerPool.runBatch(currentScenarios);
                        
                        // Store the results for this parameter combination
                        resultsGrid.push({
                            parameter1Value: param1Value,
                            parameter2Value: param2Value,
                            simulations: batchResults.map((result, idx) => ({
                                simulationId: idx,
                                ...result,
                            }))
                        });
                        
                        console.log(`Completed ${batchResults.length} simulations for parameter values (${param1Value}, ${param2Value})`);
                    }
                }
                
                return NextResponse.json({
                    success: true,
                    twoDimensionalExploration: true,
                    data: resultsGrid,
                    parameter1Values: param1Values,
                    parameter2Values: param2Values,
                    totalCombinations: param1Values.length * param2Values.length,
                    simulationsPerCombination: simulationCount,
                });
            }
            // Handle one-dimensional parameter exploration
            else if (parameterExploration && parameterExploration.parameterValues && Array.isArray(parameterExploration.parameterValues)) {
                const typedExploration = parameterExploration as {
                    eventSeriesId: string;
                    parameterType: "duration" | "amount" | "startYear" | "allocation";
                    parameterValues: number[];
                };

                console.log("PARAMETER EXPLORE:", typedExploration);
                const parameterValues = typedExploration.parameterValues;
                const resultsArray: Array<{
                    parameterValue: number;
                    simulations: WorkerSimulationResult[];
                }> = [];
                
                // Run separate batches for each parameter value
                for (const paramValue of parameterValues) {
                    // Create scenarios array with this specific parameter value
                    const scenarios = Array.from({ length: simulationCount }, () => {
                        const clonedScenario = JSON.parse(JSON.stringify(scenario)) as Scenario;
                        applyParameterValue(clonedScenario, typedExploration, paramValue);
                        return clonedScenario;
                    });
                    
                    // Run the batch for this parameter value
                    const workerPool = new WorkerPool(MAX_CONCURRENT);
                    const batchResults = await workerPool.runBatch(scenarios);
                    
                    // Store the results for this parameter value in array format
                    resultsArray.push({
                        parameterValue: paramValue,
                        simulations: batchResults.map((result, index) => ({
                            simulationId: index,
                            ...result,
                        }))
                    });
                    
                    console.log(`Completed ${batchResults.length} simulations for parameter value ${paramValue}`);
                }
                
                return NextResponse.json({
                    success: true,
                    parameterExploration: true,
                    data: resultsArray,
                    totalValues: parameterValues.length,
                    simulationsPerValue: simulationCount,
                });
            } else if (simulationCount === 1) {
                // For a single simulation without parameter exploration
                const result = await simulation(scenario);
                console.log("Simulation result:", result);
                
                if (result === null) {
                    return NextResponse.json({ message: "Error: Simulation failed" });
                }
                
                return NextResponse.json(result);
            } else {
                // For multiple simulations without parameter exploration
                console.log(`Running ${simulationCount} simulations in parallel using workers...`);
                
                // Create scenarios array (deep clones of the original scenario)
                const scenarios = Array.from({ length: simulationCount }, () => 
                    JSON.parse(JSON.stringify(scenario)) as Scenario
                );

                // Apply random parameter values if exploration is enabled
                if (parameterExploration && parameterExploration.parameterValues && Array.isArray(parameterExploration.parameterValues)) {
                    const typedExploration = parameterExploration as {
                        eventSeriesId: string;
                        parameterType: "duration" | "amount" | "startYear" | "allocation";
                        parameterValues: number[];
                    };
                    
                    scenarios.forEach(scenario => {
                        const randomValue = typedExploration.parameterValues[
                            Math.floor(Math.random() * typedExploration.parameterValues.length)
                        ];
                        applyParameterValue(scenario, typedExploration, randomValue);
                    });
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
                
                return NextResponse.json({
                    success: true,
                    data: results.map((result, index) => ({
                        simulationId: index,
                        ...result,
                    })),
                    errors: workerPool.errors,
                    totalSimulations: simulationCount,
                    completedSimulations: results.length,
                    failedSimulations: simulationCount - results.length,
                    errorSummary: simulationCount - results.length > 0 ? 
                        `${simulationCount - results.length} simulation(s) failed. Check the 'errors' field for details.` : 
                        null
                });
            }
        } else {
            return NextResponse.json({ message: "Error: Scenario Not Found" }, { status: 404 });
        }
    } catch(e) {
        console.error("Error in simulation route:", e);
        return NextResponse.json({ message: "Error: Invalid Request", error: e }, { status: 500 });
    }
}

// Function to get scenario directly from MongoDB database
async function getScenarioFromDatabase(scenarioId: string): Promise<Scenario | null> {
    try {
        // Connect to the database
        await dbConnect();
        
        // Validate the scenario ID
        if (!mongoose.Types.ObjectId.isValid(scenarioId)) {
            console.error("Invalid scenario ID format:", scenarioId);
            return null;
        }
        
        // Query the database directly
        const scenario = await ScenarioModel.findById(scenarioId)
            .populate({ path: "investments", populate: { path: "investmentType" } })
            .populate({ path: "eventSeries", populate: { path: "eventType", populate: { path: "assetAllocation", populate: { path: "investments", populate: { path: "investmentType" } } } } })
            .populate({ path: "eventSeries", populate: { path: "eventType", populate: { path: "portfolioDistribution", populate: { path: "investments", populate: { path: "investmentType" } } } } })
            .populate("spendingStrategy")
            .populate("expenseWithdrawalStrategy")
            .populate("RMDStrategy")
            .populate("RothConversionStrategy")
            .populate("owner");
            
        if (!scenario) {
            console.error("Scenario not found in database:", scenarioId);
            return null;
        }
        
        // Convert Mongoose document to plain object
        const scenarioData = scenario.toObject();
        
        // Convert all _id fields to id fields throughout the entire object
        convertMongoIds(scenarioData);
        
        // Transform startYear fields in eventSeries
        transformStartYearFields(scenarioData);

        return scenarioData as Scenario;
    } catch (error) {
        console.error("Error fetching scenario from database:", error);
        return null;
    }
}

// Recursive function to convert all _id fields to id fields in an object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertMongoIds(obj: any): void {
    if (!obj || typeof obj !== 'object') return;
    
    // If the object is an array, process each item
    if (Array.isArray(obj)) {
        obj.forEach(item => convertMongoIds(item));
        return;
    }
    
    // Process the object's properties
    for (const key in obj) {
        // If the property is _id, add a new id property with the same value
        if (key === '_id') {
            const idValue = typeof obj[key] === 'object' && obj[key] !== null 
                ? String(obj[key]) 
                : obj[key];
            
            obj.id = idValue;
        }
        
        // Recursively process nested objects
        if (obj[key] && typeof obj[key] === 'object') {
            convertMongoIds(obj[key]);
        }
    }
}

// Function to transform startYear fields in scenario
function transformStartYearFields(scenario: Scenario): void {


    if (!scenario?.eventSeries || !Array.isArray(scenario.eventSeries)) return;
    
    scenario.eventSeries.forEach((event) => {
        if (event.duration.type === "fixed") 
        {
            event.duration.year = event.duration.value!;
        }
    });
    
    scenario.eventSeries.forEach((event) => {
        if (event.startYear) {
            if (event.startYear.type === "uniform" && event.startYear.year?.min !== undefined && event.startYear.year?.max !== undefined) {
                event.startYear = {
                    type: "uniform",
                    year: {
                        type: "uniform",
                        valueType: "amount",
                        min: event.startYear.year.min,
                        max: event.startYear.year.max
                    }
                };
            } else if (event.startYear.type === "normal" && event.startYear.year?.mean !== undefined && event.startYear.year?.stdDev !== undefined) {
                event.startYear = {
                    type: "normal",
                    year: {
                        type: "normal",
                        valueType: "amount",
                        mean: event.startYear.year.mean,
                        stdDev: event.startYear.year.stdDev
                    }
                };
            }
        }
    });
    
    // Also transform spendingStrategy if it exists
    if (scenario?.spendingStrategy && Array.isArray(scenario.spendingStrategy)) {
        scenario.spendingStrategy.forEach((strategy) => {
            if (strategy.startYear) {
                if (strategy.startYear.type === "uniform" && strategy.startYear.year?.min !== undefined && strategy.startYear.year?.max !== undefined) {
                    strategy.startYear = {
                        type: "uniform",
                        year: {
                            type: "uniform",
                            valueType: "amount",
                            min: strategy.startYear.year.min,
                            max: strategy.startYear.year.max
                        }
                    };
                } else if (strategy.startYear.type === "normal" && strategy.startYear.year?.mean !== undefined && strategy.startYear.year?.stdDev !== undefined) {
                    strategy.startYear = {
                        type: "normal",
                        year: {
                            type: "normal",
                            valueType: "amount",
                            mean: strategy.startYear.year.mean,
                            stdDev: strategy.startYear.year.stdDev
                        }
                    };
                }
            }
        });
    }
}

// Function to apply a specific parameter value to a scenario
function applyParameterValue(
    scenario: Scenario, 
    parameterExploration: { 
        eventSeriesId: string;
        parameterType: "duration" | "amount" | "startYear" | "allocation";
        parameterValues: number[];
    }, 
    paramValue: number
) {
    const eventSeriesIndex = scenario.eventSeries.findIndex(event => 
        event.id === parameterExploration.eventSeriesId
    );
    
    const spendingStrategyIndex = scenario.spendingStrategy.findIndex(event => 
        event.id === parameterExploration.eventSeriesId
    );
    
    if (parameterExploration.parameterType === "duration") {
        if (eventSeriesIndex !== -1) {
            scenario.eventSeries[eventSeriesIndex].duration = {
                type: "fixed",
                year: paramValue
            };
        }

        if (spendingStrategyIndex !== -1) {
            scenario.spendingStrategy[spendingStrategyIndex].duration = {
                type: "fixed",
                year: paramValue
            };
        }
    } else if (parameterExploration.parameterType === "amount") {
        if (eventSeriesIndex !== -1) {
            const eventType = scenario.eventSeries[eventSeriesIndex].eventType;
            if (eventType.type === "expense" || eventType.type === "income") {
                eventType.amount = paramValue;
            }
        }

        if (spendingStrategyIndex !== -1) {
            const eventType = scenario.spendingStrategy[spendingStrategyIndex].eventType;
            if (eventType.type === "expense" || eventType.type === "income") {
                eventType.amount = paramValue;
            }
        }
    } else if (parameterExploration.parameterType === "startYear") {
        if (eventSeriesIndex !== -1) {
            scenario.eventSeries[eventSeriesIndex].startYear = {
                type: "fixed",
                year: paramValue
            };
        }

        if (spendingStrategyIndex !== -1) {
            scenario.spendingStrategy[spendingStrategyIndex].startYear = {
                type: "fixed",
                year: paramValue
            };
        }
    } else if (parameterExploration.parameterType === "allocation") {
        if (eventSeriesIndex !== -1) {
            const eventType = scenario.eventSeries[eventSeriesIndex].eventType;
            if (eventType.type === "investment" && eventType.assetAllocation.investments?.length === 2) {
                const fixedAllocation = {
                    type: "fixed" as const,
                    investments: eventType.assetAllocation.investments,
                    percentages: [paramValue, 100 - paramValue]
                };
                
                eventType.assetAllocation = fixedAllocation;
            }
        }
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

// Function to save a scenario to a JSON file for testing purposes
async function saveScenarioToFile(scenario: Scenario, filename: string): Promise<void> {
    try {
        // Create directory if it doesn't exist
        const dir = path.join(process.cwd(), 'src/data/jsonScenarios');
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
        }
        
        // Save the file to the jsonScenarios directory
        const filePath = path.join(dir, filename);
        await fs.writeFile(filePath, JSON.stringify(scenario, null, 2));
        console.log(`Scenario successfully saved to ${filePath}`);
    } catch (error) {
        console.error(`Error saving scenario to file: ${error}`);
    }
}
