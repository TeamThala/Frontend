"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Scenario } from "@/types/scenario";

// Step components
import GeneralInformation from "./components/general-information";
import React from "react";
import Stepper from "./components/stepper";
import Investments from "./components/investments";
import EventSeries from "./components/event-series";
import SpendingStrategy from "./components/spending-strategy";
import ExpenseWithdrawalStrategy from "./components/expense-withdrawal-strategy";
// import RothAndRMD from "./components/roth-and-rmd";
// import Summary from "./components/summary";


export default function ScenarioPage() {
  const params = useParams();
  const router = useRouter();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    "General Info",
    "Investments",
    "Event Series",
    "Spending Strategy",
    "Expense Withdrawal",
    "Roth and RMD",
    "Summary"
  ];

  useEffect(() => {
    // Ensure the page has a black background
    if (document) {
      document.body.classList.add("bg-black");
    }
    
    const fetchScenario = async () => {
      try {
        const id = params.id as string;
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
          throw new Error("Failed to fetch scenario");
        }
        
        const data = await response.json();
        setScenario(data.scenario);
        
        // Determine if user can edit this scenario
        setCanEdit(data.isOwner || data.hasEditPermission);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching scenario:", error);
        setError("An error occurred while fetching the scenario");
        setLoading(false);
      }
    };

    fetchScenario();
    
    // Cleanup function
    return () => {
      if (document) {
        document.body.classList.remove("bg-black");
      }
    };
  }, [params.id]);

  const handleStepClick = (step: number) => {
    if (step <= currentStep) {
      setCurrentStep(step);
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      // Move to next step
      setCurrentStep(currentStep + 1);
      console.log("updatedScenario", scenario);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveCurrentStepData = async (updatedScenario: Scenario) => {
    // Will implement saving logic for each step
    try {
      const response = await fetch(`/api/scenarios/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedScenario),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save step data');
      }
      
    } catch (error) {
      console.error('Error saving step data:', error);
    }
  };

  // If loading, show skeleton
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="w-full h-10 bg-gray-800 rounded-md animate-pulse mb-8"></div>
        <div className="w-full h-64 bg-gray-800 rounded-md animate-pulse"></div>
      </div>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-900 text-white p-4 rounded-md">
          <p>{error}</p>
          <button 
            onClick={() => router.push('/scenarios')}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md"
          >
            Back to Scenarios
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 text-white">
      <h1 className="text-3xl font-bold mb-6">{scenario?.name || "Scenario"}</h1>
      
      <Stepper 
        currentStep={currentStep} 
        steps={steps} 
        onStepClick={handleStepClick}
      />
      
      <div className="mt-8 bg-zinc-900 rounded-lg p-6">
        {currentStep === 0 && (
          <GeneralInformation 
            scenario={scenario} 
            canEdit={canEdit}
            onUpdate={(updatedScenario) => {
              setScenario(updatedScenario);
              if (canEdit) {
                saveCurrentStepData(updatedScenario);
              }
            }}
            handleNext={handleNext}
          />
        )}
        {currentStep === 1 && (
          <Investments 
            scenario={scenario} 
            canEdit={canEdit}
            onUpdate={(updatedScenario) => {
              setScenario(updatedScenario);
              if (canEdit) {
                saveCurrentStepData(updatedScenario);
              }
            }}
            handleNext={handleNext}
            handlePrevious={handlePrevious}
          />
        )}
        {currentStep === 2 && (
          <EventSeries   
            scenario={scenario} 
            canEdit={canEdit}
            onUpdate={(updatedScenario) => {
              setScenario(updatedScenario);
              if (canEdit) {
                saveCurrentStepData(updatedScenario);
              }
            }}
            handleNext={handleNext}
            handlePrevious={handlePrevious}
          />
        )}
        {currentStep === 3 && (
          <SpendingStrategy 
            scenario={scenario} 
            canEdit={canEdit}
            onUpdate={(updatedScenario) => {
              setScenario(updatedScenario);
              if (canEdit) {
                saveCurrentStepData(updatedScenario);
              }
            }}
            handleNext={handleNext}
            handlePrevious={handlePrevious}
          />
        )}
        {currentStep === 4 && (
          <ExpenseWithdrawalStrategy 
            scenario={scenario} 
            canEdit={canEdit}
            onUpdate={(updatedScenario) => {
              setScenario(updatedScenario);
              if (canEdit) {
                saveCurrentStepData(updatedScenario);
              }
            }}
            handleNext={handleNext}
            handlePrevious={handlePrevious}
          />
        )}
        {/* {currentStep === 5 && (
          <RothAndRMD 
            scenario={scenario} 
            canEdit={canEdit}
            onUpdate={(updatedScenario) => setScenario(updatedScenario)}
          />
        )}
        {currentStep === 6 && (
          <Summary 
            scenario={scenario} 
            canEdit={canEdit}
          />
        )} */}
        
      </div>
    </div>
  );
}

