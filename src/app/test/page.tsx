"use client";
import { useEffect, useState } from "react";
import { calculateSuccessProbability } from "../simulation/functions/calculateProbabilityOverTime";
import { SimulationResult } from "@/types/simulationResult";

export default function TestPage() {
    const [simulationData, setSimulationData] = useState<SimulationResult[]>([]);
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/simulation', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                            filepath: "src/data/jsonScenarios/scenario2.json",
                            simulationCount: 10
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`API call failed with status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('API response:', data);
                setSimulationData(data.data);
                
                // Calculate probability and log the result
                if (data.data && data.data.length > 0) {
                    const probabilityOverTime = calculateSuccessProbability(data.data);
                    console.log('Probability of success over time:', probabilityOverTime);
                }
            } catch (error) {
                console.error('Error making API call:', error);
            }
        };
        
        fetchData();
    }, []);
    
    return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Simulation Test</h1>
      <button 
        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md"
        onClick={() => {
          if (simulationData.length > 0) {
            const probabilityOverTime = calculateSuccessProbability(simulationData);
            console.log('Probability of success over time:', probabilityOverTime);
          } else {
            console.log('No simulation data available');
          }
        }}
      >
        Calculate Probability
      </button>
    </div>
  );
}

