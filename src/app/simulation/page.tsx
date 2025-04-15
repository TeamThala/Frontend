"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import ScenarioExplorer from "@/app/simulation/components/ScenarioExplorer";
import ShadedProbabilityChart from "@/app/simulation/components/ShadedProbabilityChart";
import StackedBarChart from "@/app/simulation/components/StackedBarChart";
import MultiLineScenarioChart from "@/app/simulation/components/MultiLineScenarioChart";
import ParamVsResultChart from "@/app/simulation/components/ParamVsResultChart";

import { 
  LineChartSample, 
  StackedBarChartData, 
  ShadedDataSample, 
  multiLineSampleData, 
  paramVsResultSample 
} from "@/app/simulation/sample-data/sampleData";
import { sampleScenarioParameters } from "@/app/simulation/sample-data/sampleScenarioParameters";

export default function ScenarioExplorationPage() {
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // Simulation function: Here we return a mock result.
  const runSimulation = async (paramValues: Record<string, number>) => {
    console.log("Running simulation with parameters:", paramValues);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      probability: Math.round(70 + Math.random() * 25),
      medianValue: 1000000 + Math.random() * 500000,
      averageValue: 1050000 + Math.random() * 500000,
      detailedData: {} // Explorer will generate mock detailed data if needed.
    };
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center text-white">
        Retirement Planning Scenario Explorer
      </h1>

      <div className="mb-6">
        <ul className="flex flex-wrap border-b border-gray-700">
          <li
            className={`mr-2 ${activeTabIndex === 0 ? 'bg-[#7F56D9] text-white' : 'bg-gray-800 text-gray-300'} rounded-t-lg px-4 py-2 cursor-pointer`}
            onClick={() => setActiveTabIndex(0)}
          >
            One-Dimensional Exploration
          </li>
          <li
            className={`mr-2 ${activeTabIndex === 1 ? 'bg-[#7F56D9] text-white' : 'bg-gray-800 text-gray-300'} rounded-t-lg px-4 py-2 cursor-pointer`}
            onClick={() => setActiveTabIndex(1)}
          >
            Advanced Analysis
          </li>
        </ul>
      </div>

      {activeTabIndex === 0 && (
        <div className="space-y-8">
          <Card className="text-white rounded-xl border border-[#7F56D9] shadow-lg bg-gray-900 p-4">
            <CardContent>
              <p className="text-gray-300 mb-4">
                Explore how changing a single retirement parameter affects your financial outcomes.
                Select a parameter to analyze, adjust values, and see the impact on your retirement success probability.
              </p>
            </CardContent>
          </Card>

          <ScenarioExplorer
            initialParameters={sampleScenarioParameters}
            onRunSimulation={runSimulation}
          />
        </div>
      )}

      {activeTabIndex === 1 && (
        <div className="p-8 bg-black space-y-8 rounded-lg">
          <ParamVsResultChart
            data={LineChartSample}
            parameterName="Year"
            yLabel="Final Probability of Success (%)"
          />
          <ShadedProbabilityChart data={ShadedDataSample} financialGoal={1000000} />
          <StackedBarChart data={StackedBarChartData} />
          <MultiLineScenarioChart data={multiLineSampleData} parameterName="Retirement Age" />
          <ParamVsResultChart
            data={paramVsResultSample}
            parameterName="Retirement Age"
            yLabel="Probability of Success (%)"
          />
        </div>
      )}
    </div>
  );
}
