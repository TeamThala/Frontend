"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Scenario } from "@/types/scenario";

// Extend the scenario with MongoDB _id field
type ScenarioWithMongoDB = Scenario & { _id?: string };

export default function SimulationSelectPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<ScenarioWithMongoDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const response = await fetch('/api/scenarios');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch scenarios: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("API response:", data);
        
        if (data.success) {
          // Format: { success: true, createdScenarios: [...], readScenarios: [...], readWriteScenarios: [...] }
          const allScenarios = [
            ...(Array.isArray(data.createdScenarios) ? data.createdScenarios : []),
            ...(Array.isArray(data.readScenarios) ? data.readScenarios : []),
            ...(Array.isArray(data.readWriteScenarios) ? data.readWriteScenarios : [])
          ];
          
          // Map _id to id if needed
          const formattedScenarios = allScenarios.map(scenario => {
            if (scenario._id && !scenario.id) {
              return { ...scenario, id: scenario._id };
            }
            return scenario;
          });
          
          setScenarios(formattedScenarios);
        } else if (data.scenarios && Array.isArray(data.scenarios)) {
          // Format: { scenarios: [...] }
          setScenarios(data.scenarios);
        } else if (Array.isArray(data)) {
          // Format: [...]
          setScenarios(data);
        } else if (data.data && Array.isArray(data.data)) {
          // Format: { data: [...] }
          setScenarios(data.data);
        } else {
          console.error("Unexpected response format:", data);
          setScenarios([]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching scenarios:", error);
        setError("Failed to load scenarios. Please try again later.");
        setLoading(false);
      }
    };

    fetchScenarios();
  }, []);

  // Navigate to the simulation page for a specific scenario
  const navigateToSimulation = (scenarioId: string | undefined) => {
    if (!scenarioId) {
      console.error("Cannot navigate: No scenario ID provided");
      return;
    }
    router.push(`/simulation/${scenarioId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-center text-white">
          Retirement Planning Simulation
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="bg-gray-900 border border-gray-700">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 bg-gray-800" />
                <Skeleton className="h-4 w-1/2 mt-2 bg-gray-800" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full bg-gray-800" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full bg-gray-800" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-900 text-white p-6 rounded-lg max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p>{error}</p>
          <Button 
            onClick={() => router.push('/scenarios')}
            className="mt-4 bg-purple-600 hover:bg-purple-700"
          >
            Go to Scenarios
          </Button>
        </div>
      </div>
    );
  }

  // Ensure scenarios exists and is an array before checking length
  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-center text-white">
          Retirement Planning Simulation
        </h1>
        <Card className="bg-gray-900 border border-gray-700 max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-white">No Scenarios Found</CardTitle>
            <CardDescription className="text-gray-400">
              You need to create a scenario before you can run simulations.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              onClick={() => router.push('/scenarios')}
              className="w-full bg-[#7F56D9] hover:bg-[#6941C6]"
            >
              Create a Scenario
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center text-white">
        Retirement Planning Simulation
      </h1>
      
      <p className="text-gray-300 text-center mb-8 max-w-3xl mx-auto">
        Select a scenario below to analyze and explore different retirement planning outcomes through various simulations.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scenarios.map((scenario) => (
          <Card 
            key={scenario.id || scenario._id} 
            className="bg-gray-900 border border-gray-700 hover:border-[#7F56D9] transition-colors"
          >
            <CardHeader>
              <CardTitle className="text-white">{scenario.name}</CardTitle>
              <CardDescription className="text-gray-400">
                {scenario.type === "individual" ? "Individual" : "Couple"} Scenario 
                {scenario.updatedAt && (
                  <> • Created {new Date(scenario.updatedAt).toLocaleDateString()}</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-300">
                <div>
                  <span className="font-medium text-white">Financial Goal:</span> ${scenario.financialGoal?.toLocaleString() || "N/A"}
                </div>
                <div>
                  <span className="font-medium text-white">Investments:</span> {scenario.investments?.length || 0}
                </div>
                <div>
                  <span className="font-medium text-white">Event Series:</span> {scenario.eventSeries?.length || 0}
                </div>
                <div>
                  <span className="font-medium text-white">State:</span> {scenario.residenceState || "Not specified"}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-[#7F56D9] hover:bg-[#6941C6]"
                onClick={() => navigateToSimulation(scenario.id || scenario._id)}
              >
                Run Simulations
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
