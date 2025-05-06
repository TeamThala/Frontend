/* eslint-disable @typescript-eslint/no-explicit-any */
import { Worker } from 'worker_threads';
import path from 'path';
import os from 'os';
import { Scenario } from '@/types/scenario';
import { simulation } from '../simulation';

// Maximum number of worker threads to use (limited to available CPUs)
const MAX_WORKERS = Math.min(os.cpus().length, 4);

export interface SimulationResult {
  yearlyResults: Record<string, unknown>[];
  success?: boolean;
  data?: any[];
  [key: string]: unknown;
}

interface WorkerMessage {
  type: string;
  success?: boolean;
  result?: SimulationResult;
  error?: string;
  simulationId?: number;
  scenario?: Scenario;
}

/**
 * WorkerPool manages a pool of worker threads for parallel simulation execution
 */
export class WorkerPool {
  private workers: Map<number, Worker> = new Map();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private taskQueue: { scenario: Scenario; simulationId: number; resolve: Function; reject: Function }[] = [];
  private activeWorkers = 0;
  private workerErrors: Map<number, string> = new Map();

  constructor(private maxWorkers: number = MAX_WORKERS) {}

  // Getter for worker errors
  get errors(): Record<string, string> {
    const errorObj: Record<string, string> = {};
    this.workerErrors.forEach((errorMsg, simId) => {
      errorObj[`simulation_${simId}`] = errorMsg;
    });
    return errorObj;
  }

  /**
   * Run a batch of simulations in parallel using worker threads
   * @param scenarios Array of scenario objects to simulate
   * @returns Promise that resolves to an array of simulation results
   */
  runBatch(scenarios: Scenario[]): Promise<SimulationResult[]> {
    return new Promise((resolve, reject) => {
      const results: SimulationResult[] = [];
      let completed = 0;
      let errors = 0;

      // Create a promise for each scenario
      const promises = scenarios.map((scenario, index) => {
        return new Promise<SimulationResult | null>((resolveTask, rejectTask) => {
          this.taskQueue.push({
            scenario,
            simulationId: index,
            resolve: resolveTask,
            reject: rejectTask
          });
        }).then(result => {
          if (result) {
            // Ensure yearlyResults is properly included
            if (!result.yearlyResults && result.data) {
              // If result has data but no yearlyResults, use data as yearlyResults
              result.yearlyResults = result.data;
            }
            
            // Check if the result has investment data
            if (result.yearlyResults && 
                Array.isArray(result.yearlyResults) && 
                result.yearlyResults.length > 0 &&
                result.yearlyResults[result.yearlyResults.length - 1].investments) {
            }
            
            results[index] = result;
            completed++;
          } else {
            errors++;
          }
          return result;
        }).catch(err => {
          console.error(`Error in simulation ${index}:`, err);
          // Store detailed error information
          this.workerErrors.set(index, JSON.stringify({
            message: err.message || String(err),
            stack: err.stack,
            simulationId: index
          }));
          errors++;
          return null;
        });
      });

      // Start processing the queue
      this.processQueue();

      // When all promises are settled, resolve the main promise
      Promise.allSettled(promises).then(() => {
        console.log(`Simulations completed: ${completed}, errors: ${errors}`);
        // Filter out null results and resolve
        resolve(results.filter(Boolean) as SimulationResult[]);
      }).catch(reject);
    });
  }

  /**
   * Process the task queue by creating workers and assigning tasks
   */
  private processQueue() {
    // While we have tasks and can create more workers
    while (this.taskQueue.length > 0 && this.activeWorkers < this.maxWorkers) {
      const task = this.taskQueue.shift();
      if (!task) break;

      this.runWorker(task.scenario, task.simulationId, task.resolve, task.reject);
    }
  }

  /**
   * Run a single worker with the given scenario
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private runWorker(scenario: Scenario, simulationId: number, resolve: Function, reject: Function) {
    // Increment active workers count
    this.activeWorkers++;

    try {
      
      // Resolve the worker file path - use .cjs file for CommonJS
      const workerPath = path.resolve(process.cwd(), 'src/app/api/simulation/batch/simulationWorker.cjs');

      // Deep clone the scenario to ensure isolation
      const scenarioClone = JSON.parse(JSON.stringify(scenario));
      
      // Create a new worker
      const worker = new Worker(workerPath, {
        workerData: { 
          scenario: scenarioClone,
          simulationId
        }
      });

      // Add worker to our tracking Map with its simulation ID
      this.workers.set(simulationId, worker);

      // Handle messages from the worker
      worker.on('message', async (message: WorkerMessage) => {
        if (message.type === 'ready') {
          // Worker is ready to run simulation
          
          // Run the simulation in the main thread to avoid module loading issues
          try {
            // Create another deep clone to ensure isolation for simulation
            const simulationScenario = JSON.parse(JSON.stringify(message.scenario!));
            
            
            const result = await simulation(simulationScenario);
            
            // Send result back to worker
            worker.postMessage({ 
              type: 'result',
              result
            });
          } catch (error) {
            // Capture full error details
            const errorDetails = {
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
              name: error instanceof Error ? error.name : 'UnknownError',
              simulationId: simulationId
            };
            
            console.error(`Simulation error in worker ${simulationId}:`, errorDetails);
            
            // Store the detailed error
            this.workerErrors.set(simulationId, JSON.stringify(errorDetails));
            
            // Send error back to worker
            worker.postMessage({ 
              type: 'error',
              error: JSON.stringify(errorDetails)
            });
          }
        }
        else if (message.type === 'complete') {
          if (message.success && message.result) {
            // Make sure the result has all necessary properties
            const processedResult = message.result;
            
            // If the result doesn't have yearlyResults but has data, use data as yearlyResults
            if (!processedResult.yearlyResults && processedResult.data) {
              processedResult.yearlyResults = processedResult.data;
            }
            
            // DEBUG: Check final result from worker
            if (processedResult.yearlyResults && 
                Array.isArray(processedResult.yearlyResults) && 
                processedResult.yearlyResults.length > 0) {
              
              }
            
            resolve(processedResult);
          } else {
            console.error(`Worker #${simulationId} error:`, message.error);
            if (message.error) {
              // Store the error with more context
              const errorInfo = typeof message.error === 'string' 
                ? message.error 
                : JSON.stringify(message.error);
                
              this.workerErrors.set(simulationId, `Worker #${simulationId} error details: ${errorInfo}`);
            } else {
              // Provide a fallback message when error is undefined
              this.workerErrors.set(simulationId, `Worker #${simulationId} failed with an unknown error`);
              console.warn(`Worker #${simulationId} had undefined error message`);
            }
            resolve(null); // Resolve with null instead of rejecting to continue batch processing
          }

          // Clean up
          this.terminateWorker(worker, simulationId);
        }
      });

      // Handle worker errors
      worker.on('error', (err) => {
        console.error(`Worker ${simulationId} error:`, err);
        this.workerErrors.set(simulationId, err.message || String(err));
        reject(err);
        this.terminateWorker(worker, simulationId);
      });

      // Handle worker exit
      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`Worker ${simulationId} exited with code ${code}`);
          const errorMsg = `Worker exited with code ${code}`;
          this.workerErrors.set(simulationId, errorMsg);
          reject(new Error(errorMsg));
        }
        this.terminateWorker(worker, simulationId);
      });
    } catch (error) {
      console.error(`Error creating worker for simulation ${simulationId}:`, error);
      this.activeWorkers--;
      reject(error);
      this.processQueue();
    }
  }

  /**
   * Terminate a worker and process the next task in queue
   */
  private terminateWorker(worker: Worker, simulationId: number) {
    // Remove worker from tracking map
    this.workers.delete(simulationId);
    
    try {
      worker.terminate();
    } catch (e) {
      console.error(`Error terminating worker ${simulationId}:`, e);
    }

    // Decrement active workers count
    this.activeWorkers--;

    // Process next task if any
    this.processQueue();
  }

  /**
   * Terminate all workers in the pool
   */
  terminateAll() {
    for (const [id, worker] of this.workers.entries()) {
      try {
        worker.terminate();
      } catch (e) {
        console.error(`Error terminating worker ${id}:`, e);
      }
    }
    this.workers.clear();
    this.activeWorkers = 0;
  }
} 