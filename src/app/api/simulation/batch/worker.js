const { parentPort, workerData } = require('worker_threads');
const path = require('path');

// Worker receives scenario data and runs a single simulation
async function runSimulation() {
  try {
    // First, try to dynamically import the simulation module
    // This approach works better with TypeScript/ESM modules
    const simulationModule = await import('../simulation.js');
    const simulation = simulationModule.simulation;
    
    // Extract the scenario from worker data
    const scenario = workerData.scenario;
    
    // Run the simulation
    const result = await simulation(scenario);
    
    // Send the result back to the main thread
    if (result) {
      parentPort.postMessage({ success: true, result });
    } else {
      parentPort.postMessage({ success: false, error: 'Simulation returned null' });
    }
  } catch (error) {
    console.error('Worker error:', error);
    // Handle any errors and send them back to the main thread
    parentPort.postMessage({ 
      success: false, 
      error: `Error in worker: ${error.message}\nStack: ${error.stack}` 
    });
  }
}

// Start the simulation
runSimulation().catch(err => {
  console.error('Unhandled worker error:', err);
  parentPort.postMessage({ success: false, error: String(err) });
  process.exit(1);
}); 