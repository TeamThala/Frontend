import { parentPort, workerData } from 'worker_threads';
import { simulation } from '../simulation';
import { Scenario } from '@/types/scenario';

// Worker receives scenario data and runs a single simulation
async function runSimulation() {
  try {
    // Extract the scenario from worker data
    const scenario = workerData.scenario as Scenario;
    
    // Run the simulation
    const result = await simulation(scenario);
    
    // Send the result back to the main thread
    if (result) {
      parentPort?.postMessage({ success: true, result });
    } else {
      parentPort?.postMessage({ success: false, error: 'Simulation returned null' });
    }
  } catch (error) {
    // Handle any errors and send them back to the main thread
    parentPort?.postMessage({ success: false, error: String(error) });
  }
}

// Start the simulation
runSimulation(); 