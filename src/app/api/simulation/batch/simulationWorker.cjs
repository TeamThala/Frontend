// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parentPort, workerData } = require('worker_threads');

// This is a simple worker that communicates with the main thread to run simulations
// rather than trying to directly import TypeScript modules
async function runWorkerTask() {
  try {
    // Extract the scenario from worker data
    const { scenario, simulationId } = workerData;

    // We don't directly call the simulation function here
    // Instead, signal back to the main thread that we're ready with our scenario
    parentPort.postMessage({ 
      type: 'ready',
      simulationId,
      scenario
    });

    // The main thread will run the simulation and send back the result
    parentPort.on('message', (message) => {
      if (message.type === 'result') {
        // DEBUG: Check result received from main thread
        if (message.result && 
            message.result.yearlyResults && 
            Array.isArray(message.result.yearlyResults) && 
            message.result.yearlyResults.length > 0) {
        }
        
        // Forward the simulation result back to the main thread as our final result
        parentPort.postMessage({ 
          type: 'complete',
          success: true, 
          result: message.result,
          simulationId
        });

        // Our job is done
        process.exit(0);
      }
      else if (message.type === 'error') {
        
        // Parse the error if it's JSON
        let errorData;
        try {
          errorData = JSON.parse(message.error);
        } catch {
          errorData = message.error;
        }
        
        // Forward the error back to the main thread
        parentPort.postMessage({ 
          type: 'complete',
          success: false, 
          error: errorData,
          simulationId
        });

        // Exit with an error code
        process.exit(1);
      }
    });

  } catch (error) {
    // Create a detailed error object
    const errorDetails = {
      message: error.message || String(error),
      stack: error.stack || "No stack trace available",
      name: error.name || "UnknownError",
      location: "Worker internal error",
      simulationId: workerData.simulationId
    };
    
    // Handle any errors and send them back to the main thread
    parentPort.postMessage({ 
      type: 'complete',
      success: false, 
      error: JSON.stringify(errorDetails),
      simulationId: workerData.simulationId
    });
    process.exit(1);
  }
}

// Start the worker
runWorkerTask().catch(err => {
  const errorDetails = {
    message: err.message || String(err),
    stack: err.stack || "No stack trace available",
    name: err.name || "UnknownError",
    location: "Worker initialization error",
    simulationId: workerData?.simulationId
  };
  
  parentPort.postMessage({ 
    type: 'complete',
    success: false, 
    error: JSON.stringify(errorDetails),
    simulationId: workerData?.simulationId
  });
  process.exit(1);
}); 