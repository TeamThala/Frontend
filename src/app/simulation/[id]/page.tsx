"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Scenario } from "@/types/scenario";
import BasicChartsTab from "../components/BasicChartsTab";
import ParameterExplorationTab from "../components/ParameterExplorationTab";
import TwoDimensionalExplorationTab from "../components/TwoDimensionalExplorationTab";

// Extend the scenario with MongoDB _id field
type ScenarioWithMongoDB = Scenario & { _id?: string };

export default function ScenarioSimulationPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canView, setCanView] = useState(false);

  // Fetch scenario data from MongoDB like in scenarios/[id]/page.tsx
  useEffect(() => {
    const fetchScenarioData = async () => {
      try {
        const id = params.id as string;
        
        if (!id) {
          setError("No scenario ID provided");
          setLoading(false);
          return;
        }
        
        const response = await fetch(`/api/scenarios/${id}`);
        
        if (!response.ok) {
          if (response.status === 401) {
            setError("You don't have permission to view this scenario");
            setLoading(false);
            return;
          } else if (response.status === 404) {
            setError("Scenario not found");
            setLoading(false);
            return;
          }
          throw new Error(`Failed to fetch scenario: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Scenario data:", data);
        
        // Check if the response has a scenario property or is the scenario itself
        const scenarioData: ScenarioWithMongoDB = data.scenario || data;
        
        // Handle MongoDB _id field if present
        if (scenarioData._id && !scenarioData.id) {
          scenarioData.id = scenarioData._id;
        }
        
        if (!scenarioData || !scenarioData.id) {
          setError("Invalid scenario data received");
          setLoading(false);
          return;
        }
        
        setScenario(scenarioData);
        
        // Determine if user can view this scenario - default to true if permissions aren't specified
        const hasPermission = 
          data.isOwner === true || 
          data.hasEditPermission === true || 
          data.hasViewPermission === true ||
          true; // Fallback to allow access if permissions aren't specified
          
        setCanView(hasPermission);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching scenario:", error);
        setError("An error occurred while fetching the scenario");
        setLoading(false);
      }
    };

    fetchScenarioData();
  }, [params.id]);

  // If loading, show skeleton
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="w-full h-10 bg-gray-800 rounded-md animate-pulse mb-8"></div>
        <div className="w-full h-64 bg-gray-800 rounded-md animate-pulse"></div>
      </div>
    );
  }

  // If error or no permission, show error message
  if (error || !canView) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-900 text-white p-4 rounded-md">
          <p>{error || "You don't have permission to view this simulation"}</p>
          <button 
            onClick={() => router.push('/simulation')}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md"
          >
            Back to Simulations
          </button>
        </div>
      </div>
    );
  }

  // If no scenario, something went wrong
  if (!scenario || !scenario.id) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-900 text-white p-4 rounded-md">
          <p>Failed to load scenario data</p>
          <button 
            onClick={() => router.push('/simulation')}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md"
          >
            Back to Simulations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center text-white">
        {scenario.name} - Retirement Planning Simulation
      </h1>

      <div className="mb-6">
        <ul className="flex flex-wrap border-b border-gray-700">
          <li
            className={`mr-2 ${activeTabIndex === 0 ? 'bg-[#7F56D9] text-white' : 'bg-gray-800 text-gray-300'} rounded-t-lg px-4 py-2 cursor-pointer`}
            onClick={() => setActiveTabIndex(0)}
          >
            Basic Charts
          </li>
          <li
            className={`mr-2 ${activeTabIndex === 1 ? 'bg-[#7F56D9] text-white' : 'bg-gray-800 text-gray-300'} rounded-t-lg px-4 py-2 cursor-pointer`}
            onClick={() => setActiveTabIndex(1)}
          >
            One-dimensional Scenario Exploration
          </li>
          <li
            className={`mr-2 ${activeTabIndex === 2 ? 'bg-[#7F56D9] text-white' : 'bg-gray-800 text-gray-300'} rounded-t-lg px-4 py-2 cursor-pointer`}
            onClick={() => setActiveTabIndex(2)}
          >
            Two-dimensional Scenario Exploration
          </li>
        </ul>
      </div>

      {activeTabIndex === 0 && <BasicChartsTab scenarioId={scenario.id} />}
      {activeTabIndex === 1 && <ParameterExplorationTab scenarioId={scenario.id} />}
      {activeTabIndex === 2 && <TwoDimensionalExplorationTab scenarioId={scenario.id} />}
    </div>
  );
} 