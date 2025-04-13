"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import ScenarioCard from "./components/ScenarioCard";
import ScenarioSkeleton from "./components/ScenarioSkeleton";
import { Scenario } from "@/types/scenario"; 
import ImportScenarioDialog from "@/components/import-scenario-dialog";
import CreateScenarioDialog from "@/components/create-scenario-dialog";

export default function ScenariosPage() {
  const [isGuest, setIsGuest] = useState(false);
  const [createdScenarios, setCreatedScenarios] = useState<Scenario[]>([]);
  const [readScenarios, setReadScenarios] = useState<Scenario[]>([]);
  const [readWriteScenarios, setReadWriteScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFirstScenarioDialogOpen, setIsFirstScenarioDialogOpen] = useState(false);
  
  useEffect(() => {
    // Ensure the page has a black background
    if (document) {
      document.body.classList.add('bg-black');
    }
    
    const fetchScenarios = async () => {
      try {
        const response = await fetch('/api/senarios');
        if (!response.ok) {
          if (response.status === 401) {
            // TODO: Get from local storage
            setIsGuest(true);
            setCreatedScenarios([]);
            setReadScenarios([]);
            setReadWriteScenarios([]);
            return;
          }
          else {
            console.error('Failed to fetch scenarios');
            setCreatedScenarios([]);
            setReadScenarios([]);
            setReadWriteScenarios([]);
            return;
          }
        }
        const data = await response.json();
        console.log(data);
        setCreatedScenarios(data.createdScenarios);
        setReadScenarios(data.readScenarios);
        setReadWriteScenarios(data.readWriteScenarios);
      } catch (error) {
        console.error('Error fetching scenarios:', error);
        setCreatedScenarios([]);
        setReadScenarios([]);
        setReadWriteScenarios([]);
      } finally {
        setLoading(false);
      }
    };

    fetchScenarios();
    
    // Cleanup function
    return () => {
      if (document) {
        document.body.classList.remove('bg-black');
      }
    };
  }, []);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-white">Scenarios</h1>
        <div className="flex gap-4">
          <CreateScenarioDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button className="bg-purple-600 hover:bg-purple-700">
              Create a Scenario
            </Button>
          </CreateScenarioDialog>
          <ImportScenarioDialog>
            <Button className="bg-purple-600 hover:bg-purple-700">
              Import a Scenario
            </Button>
          </ImportScenarioDialog>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, index) => (
            <ScenarioSkeleton key={index} />
          ))}
        </div>
      ) : createdScenarios.length === 0 && readScenarios.length === 0 && readWriteScenarios.length === 0 ? (
        <div className="text-center py-12">
          {isGuest ? (
            <p className="text-white text-lg mb-4">No scenarios found. Please login to see your scenarios.</p>
          ) : (
            <p className="text-white text-lg mb-4">No scenarios found.</p>
          )}
          <CreateScenarioDialog 
            open={isFirstScenarioDialogOpen} 
            onOpenChange={setIsFirstScenarioDialogOpen}
            title="Create Your First Scenario"
          >
            <Button className="bg-purple-600 hover:bg-purple-700">
              Create Your First Scenario {isGuest ? "as a guest (won't be saved)" : ""}
            </Button>
          </CreateScenarioDialog>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {createdScenarios.map((scenario, index) => (
            <ScenarioCard key={"created-"+index} scenario={scenario} accessType={"create"}/>
          ))}
          {readScenarios.map((scenario, index) => (
            <ScenarioCard key={"read-"+index} scenario={scenario} accessType={"read"}/>
          ))}
          {readWriteScenarios.map((scenario, index) => (
            <ScenarioCard key={"readWrite-"+index} scenario={scenario} accessType={"readWrite"}/>
          ))}
        </div>
      )}
    </div>
  );
} 