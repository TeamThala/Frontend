"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import ShadedProbabilityChart from "@/app/simulation/components/ShadedProbabilityChart";
import StackedBarChart from "@/app/simulation/components/StackedBarChart";
import ParamVsResultChart from "@/app/simulation/components/ParamVsResultChart";
import { calculateSuccessProbability } from "@/app/simulation/functions/calculateProbabilityOverTime";

import { 
  ParamVsResultPoint
} from "@/app/simulation/sample-data/sampleData";
import { transformToShadedChartData } from "./functions/calculateShadedProbability";
import { SimulationResult } from "@/types/simulationResult";
import { ShadedDataPoint } from "./components/ShadedProbabilityChart";
import { transformToStackedBarChartData } from "./functions/transformToStackedBarChartData";
import { transformToScenarioLineData } from "./functions/transformToScenarioLineData";
import scenarioData from "@/data/jsonScenarios/scenario2.json";

// Define our own interfaces to avoid conflicts
interface BarSegment {
  id: string;
  name?: string;
  value: number;
  taxStatus?: "pre-tax" | "after-tax" | "non-retirement";
}

interface ChartDataEntry {
  year: number;
  median: BarSegment[];
  average: BarSegment[];
}

// Event series interface - made more permissive to match actual JSON structure
interface EventSeries {
  id: string;
  name: string;
  description: string;
  startYear: {
    type: string;
    year: number;
  };
  duration: {
    type: string;
    year: number;
  };
  eventType: {
    type: string;
    // Using any since the event type structure varies significantly in the JSON
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any; 
  };
}

// Helper function to check if an investment event has exactly 2 investments
const hasExactlyTwoInvestments = (event: EventSeries | undefined): boolean => {
  if (!event || event.eventType.type !== "investment") return false;
  
  const assetAllocation = event.eventType.assetAllocation;
  return assetAllocation && 
         assetAllocation.investments && 
         assetAllocation.investments.length === 2;
};

// Get the current allocation percentage for the first investment in a dual-investment event
const getFirstInvestmentAllocationPercentage = (event: EventSeries | undefined): number => {
  if (!hasExactlyTwoInvestments(event)) return 50; // Default to 50% if not applicable
  
  const percentages = event?.eventType.assetAllocation.percentages;
  if (Array.isArray(percentages) && percentages.length === 2) {
    return percentages[0];
  }
  
  return 50; // Default to 50% if percentages not found
};

// Helper function to get the investment names for display
const getInvestmentNames = (event: EventSeries | undefined): { first: string, second: string } => {
  if (!hasExactlyTwoInvestments(event)) {
    return { first: "First Investment", second: "Second Investment" };
  }
  
  const investments = event?.eventType.assetAllocation?.investments;
  if (investments && investments.length === 2) {
    const firstInvestmentName = investments[0].investmentType?.name || "First Investment";
    const secondInvestmentName = investments[1].investmentType?.name || "Second Investment";
    return { first: firstInvestmentName, second: secondInvestmentName };
  }
  
  return { first: "First Investment", second: "Second Investment" };
};

// Define graph types and metrics
interface GraphConfig {
  id: string;
  type: "multi-line" | "parameter-impact";
  metric: "success-probability" | "total-investments";
}

// Define the expected API response structure
interface SimulationAPIResult {
  successProbability: number;
  medianTotalInvestments: number;
  // Allow for additional properties with explicit typing
  [key: string]: number | string | boolean | object | undefined;
}

export default function ScenarioExplorationPage() {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [simulationCount, setSimulationCount] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [simulationData, setSimulationData] = useState<{data: SimulationResult[]} | null>(null);
  const [successProbabilityData, setSuccessProbabilityData] = useState<ParamVsResultPoint[]>([]);
  
  // Chart selection state
  const [showSuccessProbabilityChart, setShowSuccessProbabilityChart] = useState(false);
  const [selectedCharts, setSelectedCharts] = useState<{
    successProbability: boolean;
    shadedCharts: {id: string, metric: string}[];
    stackedCharts: {id: string, type: "investments" | "income" | "expenses"}[];
  }>({
    successProbability: false,
    shadedCharts: [],
    stackedCharts: []
  });
  
  // Visualization configuration
  const [isSelectingCharts, setIsSelectingCharts] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string>("totalInvestments");
  const [selectedStackedType, setSelectedStackedType] = useState<"investments" | "income" | "expenses">("investments");
  const [aggregationThreshold, setAggregationThreshold] = useState<number>(5000);
  const [shadedChartData, setShadedChartData] = useState<Record<string, ShadedDataPoint[]>>({});
  const [stackedChartData, setStackedChartData] = useState<Record<string, ChartDataEntry[]>>({});
  
  // One-dimensional simulation state
  const [parameterMin, setParameterMin] = useState<number>(55);
  const [parameterMax, setParameterMax] = useState<number>(75);
  const [parameterStep, setParameterStep] = useState<number>(1);
  const [isRunningScenario, setIsRunningScenario] = useState(false);
  const [scenarioResults, setScenarioResults] = useState<{
    parameter: string;
    values: number[];
    probabilities: number[];
    medianOutcomes: number[];
  } | null>(null);
  
  // Scenario exploration specific state
  const [eventSeries, setEventSeries] = useState<EventSeries[]>([]);
  const [selectedEventSeries, setSelectedEventSeries] = useState<string>("");
  const [parameterType, setParameterType] = useState<"startYear" | "duration" | "amount" | "allocation">("startYear");
  // Visualization type is hardcoded for now but kept for future enhancement
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [visualizationType, setVisualizationType] = useState<"investments" | "income" | "expenses">("investments");
  
  // Graph configuration state
  const [graphConfigs, setGraphConfigs] = useState<GraphConfig[]>([]);
  const [selectedGraphType, setSelectedGraphType] = useState<"multi-line" | "parameter-impact">("parameter-impact");
  const [selectedGraphMetric, setSelectedGraphMetric] = useState<"success-probability" | "total-investments">("success-probability");
  
  // New state variable for scenario simulation count
  const [scenarioSimulationCount, setScenarioSimulationCount] = useState<number>(100);
  
  // Load event series from scenario data
  useEffect(() => {
    if (scenarioData && scenarioData.eventSeries) {
      setEventSeries(scenarioData.eventSeries as EventSeries[]);
      if (scenarioData.eventSeries.length > 0) {
        setSelectedEventSeries(scenarioData.eventSeries[0].id);
      }
    }
  }, []);
  
  // Parameters array kept for reference - examples of retirement parameters
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const parameters = [
    { label: "Retirement Age", value: "retirementAge", min: 55, max: 75, step: 1 },
    { label: "Savings Rate", value: "savingsRate", min: 5, max: 25, step: 1 },
    { label: "Withdrawal Rate", value: "withdrawalRate", min: 2, max: 6, step: 0.25 },
    { label: "Stock Allocation", value: "stockAllocation", min: 10, max: 90, step: 5 },
    { label: "Social Security Age", value: "socialSecurityAge", min: 62, max: 70, step: 1 }
  ];
  
  const metrics = [
    { label: "Total Investments", value: "totalInvestments" },
    { label: "Total Income", value: "totalIncome" },
    { label: "Total Expenses", value: "totalExpenses" },
    { label: "Early Withdrawal Tax", value: "earlyWithdrawalTax" },
    { label: "Discretionary Expense %", value: "discretionaryExpensePct" }
  ];
  
  const stackedChartTypes = [
    { label: "Investments Breakdown", value: "investments" as const },
    { label: "Income Breakdown", value: "income" as const },
    { label: "Expenses Breakdown", value: "expenses" as const }
  ];

  // Simulation function: Here we call the API endpoint
  const runSimulation = async () => {
    setIsLoading(true);
    setSelectedCharts({
      successProbability: false,
      shadedCharts: [],
      stackedCharts: []
    });
    setShadedChartData({});
    setStackedChartData({});
    
    try {
      // Call the simulation API endpoint
      const response = await fetch('/api/simulation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filepath: "src/data/jsonScenarios/scenario2.json",
          simulationCount
        })
      });
      
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Simulation API response:', data);
      setSimulationData(data);

      const scenarioLineData = transformToScenarioLineData(data.data);
      console.log('Scenario line data:', scenarioLineData);
      
      // Calculate probability of success over time using the actual data
      const probabilities = calculateSuccessProbability(data.data);
      setSuccessProbabilityData(probabilities.map(item => ({
        parameterValue: item.year,
        finalResult: item.successRate
      })));
      
      // Show chart selection interface
      setIsSelectingCharts(true);
    } catch (error) {
      console.error("Error running simulation:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to run one-dimensional scenario exploration
  const runScenarioExploration = async () => {
    setIsRunningScenario(true);
    
    try {
      // Generate parameter values based on min, max, step
      const values: number[] = [];
      for (let i = parameterMin; i <= parameterMax; i += parameterStep) {
        values.push(Math.round(i * 100) / 100); // Round to 2 decimal places
      }
      
      // Get the selected event and create the parameter variation payload
      const selectedEvent = eventSeries.find(e => e.id === selectedEventSeries);
      if (!selectedEvent) {
        throw new Error("No event selected");
      }
      
      // Create parameter variation scenarios for each value
      const parameterVariations = values.map(paramValue => {
        // Clone the scenario2.json data
        const modifiedScenario = { ...scenarioData };
        
        // Find the event series that needs to be modified
        const eventIndex = modifiedScenario.eventSeries.findIndex(e => e.id === selectedEventSeries);
        if (eventIndex === -1) {
          throw new Error("Selected event not found in scenario data");
        }
        
        // Create a deep copy of the event to modify
        const eventToModify = JSON.parse(JSON.stringify(modifiedScenario.eventSeries[eventIndex]));
        
        // Modify the parameter based on its type
        if (parameterType === "startYear") {
          eventToModify.startYear.year = paramValue;
        } else if (parameterType === "duration") {
          eventToModify.duration.year = paramValue;
        } else if (parameterType === "amount" && 
                  (selectedEvent.eventType.type === "income" || selectedEvent.eventType.type === "expense")) {
          eventToModify.eventType.amount = paramValue;
        } else if (parameterType === "allocation" && selectedEvent.eventType.type === "investment") {
          if (eventToModify.eventType.assetAllocation && 
              Array.isArray(eventToModify.eventType.assetAllocation.percentages) && 
              eventToModify.eventType.assetAllocation.percentages.length === 2) {
            // Update the first percentage and set the second to be the complement
            eventToModify.eventType.assetAllocation.percentages[0] = paramValue;
            eventToModify.eventType.assetAllocation.percentages[1] = 100 - paramValue;
          }
        }
        
        // Update the event in the modified scenario
        modifiedScenario.eventSeries[eventIndex] = eventToModify;
        
        return {
          scenarioData: modifiedScenario,
          parameterValue: paramValue
        };
      });
      
      // In a real implementation, we would call the API for each parameter variation
      console.log("Sending parameter variations to API:", parameterVariations);
      
      // For now, we're sending a single API call with the parameter variations
      try {
        const response = await fetch('/api/simulation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filepath: "src/data/jsonScenarios/scenario2.json", // Base scenario path
            parameterExploration: {
              eventSeriesId: selectedEventSeries,
              parameterType: parameterType,
              parameterValues: values,
              scenarios: parameterVariations.map(pv => pv.scenarioData)
            },
            simulationCount: scenarioSimulationCount // Use the user-specified simulation count
          })
        });
        
        if (!response.ok) {
          throw new Error(`API call failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Parameter exploration API response:', data);
        
        // Process the results (for now using mock data as fallback)
        // This would be replaced with actual data from the API
        if (data && data.results) {
          // Use actual API results if available
          setScenarioResults({
            parameter: parameterType,
            values: values,
            probabilities: data.results.map((r: SimulationAPIResult) => r.successProbability),
            medianOutcomes: data.results.map((r: SimulationAPIResult) => r.medianTotalInvestments)
          });
        } else {
          // Generate mock data for demonstration
          const probabilities = mockProbabilitiesForParameter(parameterType, selectedEvent, values);
          const medianOutcomes = mockOutcomesForParameter(parameterType, selectedEvent, values);
          
          setScenarioResults({
            parameter: parameterType,
            values,
            probabilities,
            medianOutcomes
          });
        }
      } catch (error) {
        console.error("Error calling simulation API:", error);
        // Fall back to mock data on API failure
        const probabilities = mockProbabilitiesForParameter(parameterType, selectedEvent, values);
        const medianOutcomes = mockOutcomesForParameter(parameterType, selectedEvent, values);
        
        setScenarioResults({
          parameter: parameterType,
          values,
          probabilities,
          medianOutcomes
        });
      }
      
    } catch (error) {
      console.error("Error running scenario exploration:", error);
    } finally {
      setIsRunningScenario(false);
    }
  };
  
  // Helper function to generate mock probability data based on parameter type
  const mockProbabilitiesForParameter = (
    paramType: string, 
    event: EventSeries | undefined, 
    values: number[]
  ): number[] => {
    return values.map(val => {
      // Mock formula to generate different probabilities based on parameter type and event
      let base = 0;
      
      if (!event) return Math.random() * 100;
      
      if (paramType === "startYear") {
        // Earlier start years for income events improve success
        // Later start years for expense events improve success
        const eventType = event.eventType.type;
        if (eventType === "income") {
          base = 90 - ((val - parameterMin) * 2);
        } else if (eventType === "expense") {
          base = 40 + ((val - parameterMin) * 2);
        } else {
          base = 60 + (Math.random() * 20 - 10);
        }
      } else if (paramType === "duration") {
        // Longer duration for income events improves success
        // Shorter duration for expense events improves success
        const eventType = event.eventType.type;
        if (eventType === "income") {
          base = 60 + ((val - parameterMin) * 1.5);
        } else if (eventType === "expense") {
          base = 80 - ((val - parameterMin) * 1.5);
        } else {
          base = 60 + (Math.random() * 20 - 10);
        }
      } else if (paramType === "amount") {
        // Higher amount for income events improves success
        // Lower amount for expense events improves success
        const eventType = event.eventType.type;
        if (eventType === "income") {
          base = 50 + ((val - parameterMin) * 2);
        } else if (eventType === "expense") {
          base = 90 - ((val - parameterMin) * 2);
        } else {
          base = 60 + (Math.random() * 20 - 10);
        }
      } else if (paramType === "allocation") {
        // Asset allocation has a peaked curve
        const optimalValue = (parameterMin + parameterMax) / 2;
        const distance = Math.abs(val - optimalValue);
        base = 85 - distance * 0.7;
      }
      
      // Add some randomization
      return Math.max(0, Math.min(100, base + (Math.random() * 10 - 5)));
    });
  };

  // Helper function to generate mock outcome data based on parameter type
  const mockOutcomesForParameter = (
    paramType: string, 
    event: EventSeries | undefined, 
    values: number[]
  ): number[] => {
    return values.map(val => {
      // Mock formula for median portfolio value based on parameter type and event
      let base = 1000000;
      
      if (!event) return base + Math.random() * 100000;
      
      if (paramType === "startYear") {
        const eventType = event.eventType.type;
        if (eventType === "income") {
          base -= ((val - parameterMin) * 50000);
        } else if (eventType === "expense") {
          base += ((val - parameterMin) * 25000);
        }
      } else if (paramType === "duration") {
        const eventType = event.eventType.type;
        if (eventType === "income") {
          base += ((val - parameterMin) * 60000);
        } else if (eventType === "expense") {
          base -= ((val - parameterMin) * 40000);
        }
      } else if (paramType === "amount") {
        const eventType = event.eventType.type;
        if (eventType === "income") {
          base += ((val - parameterMin) * 30000);
        } else if (eventType === "expense") {
          base -= ((val - parameterMin) * 20000);
        }
      } else if (paramType === "allocation") {
        // More balanced allocations generally mean more stable returns
        const optimalValue = (parameterMin + parameterMax) / 2;
        const distance = Math.abs(val - optimalValue);
        base = 1200000 - distance * 20000;
      }
      
      // Add some randomization
      return Math.max(0, base + (Math.random() * 100000 - 50000));
    });
  };
  
  const addShadedChart = () => {
    const newId = `shaded-${Date.now()}`;
    setSelectedCharts(prev => ({
      ...prev,
      shadedCharts: [...prev.shadedCharts, { id: newId, metric: selectedMetric }]
    }));
  };
  
  const removeShadedChart = (id: string) => {
    setSelectedCharts(prev => ({
      ...prev,
      shadedCharts: prev.shadedCharts.filter(chart => chart.id !== id)
    }));
  };
  
  const addStackedChart = () => {
    const newId = `stacked-${Date.now()}`;
    setSelectedCharts(prev => ({
      ...prev,
      stackedCharts: [...prev.stackedCharts, { id: newId, type: selectedStackedType }]
    }));
  };
  
  const removeStackedChart = (id: string) => {
    setSelectedCharts(prev => ({
      ...prev,
      stackedCharts: prev.stackedCharts.filter(chart => chart.id !== id)
    }));
  };
  
  const generateVisualizations = () => {
    // Process shaded charts for each selected metric
    const newShadedChartData: Record<string, ShadedDataPoint[]> = {};
    const newStackedChartData: Record<string, ChartDataEntry[]> = {};
    
    for (const chart of selectedCharts.shadedCharts) {
      newShadedChartData[chart.id] = transformToShadedChartData(simulationData!.data, chart.metric);
    }
    
    for (const chart of selectedCharts.stackedCharts) {
      newStackedChartData[chart.id] = transformToStackedBarChartData(simulationData!.data, chart.type) as ChartDataEntry[];
    }
    
    setShadedChartData(newShadedChartData);
    setStackedChartData(newStackedChartData);
    setShowSuccessProbabilityChart(selectedCharts.successProbability);
    setIsSelectingCharts(false);
  };

  // Get parameter label based on event and parameter type
  const getParameterLabel = () => {
    const event = eventSeries.find(e => e.id === selectedEventSeries);
    if (!event) return parameterType;
    
    if (parameterType === "startYear") {
      return `Start Year for "${event.name}"`;
    } else if (parameterType === "duration") {
      return `Duration for "${event.name}"`;
    } else if (parameterType === "amount") {
      return `Amount for "${event.name}"`;
    } else if (parameterType === "allocation") {
      // For allocation, include the investment names if available
      const investments = event.eventType.assetAllocation?.investments;
      if (investments && investments.length === 2) {
        const firstInvestmentName = investments[0].investmentType?.name || "First Investment";
        const secondInvestmentName = investments[1].investmentType?.name || "Second Investment";
        return `${firstInvestmentName} allocation (${secondInvestmentName} = 100% - value)`;
      }
      return "Investment Allocation";
    }
    
    return parameterType;
  };
  
  // Update parameter settings when changing the event series or parameter type
  const handleEventSeriesChange = (eventId: string) => {
    setSelectedEventSeries(eventId);
    const event = eventSeries.find(e => e.id === eventId);
    
    if (!event) return;
    
    // Check if current parameter type is valid for the new event, reset if not
    const eventType = event.eventType.type;
    if (parameterType === "amount" && eventType !== "income" && eventType !== "expense") {
      // If amount is selected but event is not income or expense, reset to startYear
      setParameterType("startYear");
    } else if (parameterType === "allocation" && (eventType !== "investment" || !hasExactlyTwoInvestments(event))) {
      // If allocation is selected but event is not an investment with exactly 2 investments, reset to startYear
      setParameterType("startYear");
    }
    
    // Update parameter ranges based on selected parameter type
    if (parameterType === "startYear") {
      const startYear = event.startYear.year;
      setParameterMin(startYear - 5);
      setParameterMax(startYear + 5);
      setParameterStep(1);
    } else if (parameterType === "duration") {
      const duration = event.duration.year;
      setParameterMin(Math.max(1, duration - 10));
      setParameterMax(duration + 10);
      setParameterStep(1);
    } else if (parameterType === "amount" && event.eventType.amount) {
      const amount = event.eventType.amount;
      setParameterMin(Math.max(1000, amount * 0.5));
      setParameterMax(amount * 1.5);
      setParameterStep(1000);
    } else if (parameterType === "allocation" && eventType === "investment" && hasExactlyTwoInvestments(event)) {
      // For asset allocation, we're working with percentages (0-100)
      setParameterMin(0);
      setParameterMax(100);
      setParameterStep(5);
    }
  };
  
  const handleParameterTypeChange = (type: "startYear" | "duration" | "amount" | "allocation") => {
    setParameterType(type);
    const event = eventSeries.find(e => e.id === selectedEventSeries);
    
    if (!event) return;
    
    if (type === "startYear") {
      const startYear = event.startYear.year;
      setParameterMin(startYear - 5);
      setParameterMax(startYear + 5);
      setParameterStep(1);
    } else if (type === "duration") {
      const duration = event.duration.year;
      setParameterMin(Math.max(1, duration - 10));
      setParameterMax(duration + 10);
      setParameterStep(1);
    } else if (type === "amount" && event.eventType.amount) {
      const amount = event.eventType.amount;
      setParameterMin(Math.max(1000, amount * 0.5));
      setParameterMax(amount * 1.5);
      setParameterStep(1000);
    } else if (type === "allocation" && hasExactlyTwoInvestments(event)) {
      // For asset allocation, get the current percentage of the first investment
      const currentPercentage = getFirstInvestmentAllocationPercentage(event);
      
      // Allow exploring a range of percentages around the current value
      setParameterMin(Math.max(0, currentPercentage - 30));
      setParameterMax(Math.min(100, currentPercentage + 30));
      setParameterStep(5);
    }
  };

  // Add a new graph configuration
  const addGraphConfig = () => {
    const newId = `graph-${Date.now()}`;
    setGraphConfigs([
      ...graphConfigs,
      {
        id: newId,
        type: selectedGraphType,
        metric: selectedGraphMetric
      }
    ]);
  };
  
  // Remove a graph configuration
  const removeGraphConfig = (id: string) => {
    setGraphConfigs(graphConfigs.filter(config => config.id !== id));
  };
  
  // Get the title for a graph based on its config
  const getGraphTitle = (config: GraphConfig) => {
    const metricName = config.metric === "success-probability" 
      ? "Probability of Success" 
      : "Total Investments";
      
    if (config.type === "multi-line") {
      return `${metricName} Over Time for Different ${getParameterLabel()} Values`;
    } else {
      return `Impact of ${getParameterLabel()} on ${metricName}`;
    }
  };
  
  // Get the description for a graph based on its config
  const getGraphDescription = (config: GraphConfig) => {
    const metricName = config.metric === "success-probability" 
      ? "probability of success" 
      : "total investments";
      
    if (config.type === "multi-line") {
      return `This chart shows how ${metricName} changes over time for different values of ${getParameterLabel().toLowerCase()}.`;
    } else {
      return `This chart shows how different values of ${getParameterLabel().toLowerCase()} affect your ${metricName}.`;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center text-white">
        Retirement Planning Simulation Tool
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
        </ul>
      </div>

      {activeTabIndex === 0 && (
        <div className="space-y-8">
          <Card className="text-white rounded-xl border border-[#7F56D9] shadow-lg bg-gray-900 p-4">
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="simulationCount" className="text-gray-300">Number of Simulations</Label>
                  <Input 
                    id="simulationCount"
                    type="number" 
                    value={simulationCount} 
                    onChange={(e) => setSimulationCount(parseInt(e.target.value) || 10)} 
                    className="mt-1 bg-gray-800 text-white"
                    min={10}
                    max={1000}
                  />
                </div>
                <Button 
                  onClick={runSimulation} 
                  className="bg-[#7F56D9] hover:bg-[#6941C6] text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Running Simulations..." : `Run ${simulationCount} Simulations`}
                </Button>
              </div>
            </CardContent>
          </Card>

          {isSelectingCharts && (
            <Card className="text-white rounded-xl border border-[#7F56D9] shadow-lg bg-gray-900 p-4">
              <CardContent>
                <h2 className="text-xl font-semibold mb-4">Select Visualizations</h2>
                <div className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="success-probability" 
                      checked={selectedCharts.successProbability}
                      onCheckedChange={(checked) => 
                        setSelectedCharts(prev => ({...prev, successProbability: checked === true}))
                      }
                    />
                    <label 
                      htmlFor="success-probability" 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Probability of Success Over Time
                    </label>
                  </div>

                  {/* Shaded Probability Charts Section */}
                  <div className="space-y-2 pt-4 border-t border-gray-700">
                    <h3 className="text-lg font-medium">Shaded Probability Charts</h3>
                    
                    {selectedCharts.shadedCharts.map((chart) => (
                      <div key={chart.id} className="flex items-center space-x-2 p-2 bg-gray-800 rounded">
                        <div className="flex-1">
                          {metrics.find(m => m.value === chart.metric)?.label || chart.metric}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeShadedChart(chart.id)}
                          className="h-7 text-xs"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    
                    <div className="flex gap-2 mt-2">
                      <Select value={selectedMetric} onValueChange={(value: string) => setSelectedMetric(value)}>
                        <SelectTrigger className="w-[240px] bg-gray-800">
                          <SelectValue placeholder="Select metric" />
                        </SelectTrigger>
                        <SelectContent>
                          {metrics.map((metric) => (
                            <SelectItem key={metric.value} value={metric.value}>
                              {metric.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={addShadedChart} variant="outline">
                        Add Chart
                      </Button>
                    </div>
                  </div>
                  
                  {/* Stacked Bar Charts Section */}
                  <div className="space-y-2 pt-4 border-t border-gray-700">
                    <h3 className="text-lg font-medium">Stacked Bar Charts</h3>
                    
                    {selectedCharts.stackedCharts.map((chart) => (
                      <div key={chart.id} className="flex items-center space-x-2 p-2 bg-gray-800 rounded">
                        <div className="flex-1">
                          {stackedChartTypes.find(t => t.value === chart.type)?.label || chart.type}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeStackedChart(chart.id)}
                          className="h-7 text-xs"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    
                    <div className="flex gap-2 mt-2">
                      <Select value={selectedStackedType} onValueChange={(value: "investments" | "income" | "expenses") => setSelectedStackedType(value)}>
                        <SelectTrigger className="w-[240px] bg-gray-800">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {stackedChartTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={addStackedChart} variant="outline">
                        Add Chart
                      </Button>
                    </div>
                    
                    <div className="mt-3">
                      <Label htmlFor="aggregation-threshold" className="text-sm text-gray-300">
                        Aggregation Threshold: ${aggregationThreshold.toLocaleString()}
                      </Label>
                      <Slider
                        min={0}
                        max={100000}
                        step={1000}
                        value={[aggregationThreshold]}
                        onValueChange={(values) => setAggregationThreshold(values[0])}
                        className="mt-2"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Values below this threshold will be aggregated into an &quot;Other&quot; category
                      </p>
                    </div>
                  </div>

                  <Button 
                    onClick={generateVisualizations} 
                    className="bg-[#7F56D9] hover:bg-[#6941C6] text-white w-full mt-4"
                  >
                    Generate Visualizations
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {showSuccessProbabilityChart && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Probability of Success Over Time</h2>
              <p className="text-gray-300">
                This chart shows the probability of success over time across {simulationCount} simulations.
                For each year, it shows the percentage of simulations where financial goals were met.
              </p>
              <ParamVsResultChart
                data={successProbabilityData}
                parameterName="Year"
                yLabel="Probability of Success (%)"
              />
            </div>
          )}

          {Object.entries(shadedChartData).map(([chartId, data]) => {
            const chartInfo = selectedCharts.shadedCharts.find(c => c.id === chartId);
            if (!chartInfo) return null;
            
            const metricLabel = metrics.find(m => m.value === chartInfo.metric)?.label || chartInfo.metric;
            
            return (
              <div key={chartId} className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">{metricLabel} Over Time</h2>
                <p className="text-gray-300">
                  This chart shows the range of {metricLabel.toLowerCase()} values across {simulationCount} simulations.
                  The colored bands represent different percentile ranges.
                </p>
                <ShadedProbabilityChart 
                  data={data} 
                  chartTitle={`${metricLabel} Range Over Time`}
                />
              </div>
            );
          })}
          
          {Object.entries(stackedChartData).map(([chartId, data]) => {
            const chartInfo = selectedCharts.stackedCharts.find(c => c.id === chartId);
            if (!chartInfo) return null;
            
            const typeLabel = stackedChartTypes.find(t => t.value === chartInfo.type)?.label || chartInfo.type;
            
            return (
              <div key={chartId} className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">{typeLabel}</h2>
                <p className="text-gray-300">
                  This chart shows the breakdown of {chartInfo.type} across {simulationCount} simulations.
                  Each segment represents a different {chartInfo.type === "investments" ? "investment account" : 
                    chartInfo.type === "income" ? "income source" : "expense category"}.
                </p>
                <StackedBarChart 
                  data={data} 
                  chartType={chartInfo.type}
                  title={typeLabel}
                />
              </div>
            );
          })}
        </div>
      )}

      {activeTabIndex === 1 && (
        <div className="space-y-8">
          <Card className="text-white rounded-xl border border-[#7F56D9] shadow-lg bg-gray-900 p-4">
            <CardContent>
              <h2 className="text-xl font-semibold mb-4">One-dimensional Parameter Analysis</h2>
              <p className="text-gray-300 mb-6">
                Explore how changing event series parameters affects your financial outcomes.
                Select an event series, parameter type, and range to analyze.
              </p>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="eventSeries" className="text-gray-300">Event Series</Label>
                  <Select value={selectedEventSeries} onValueChange={handleEventSeriesChange}>
                    <SelectTrigger className="mt-1 bg-gray-800 text-white w-full">
                      <SelectValue placeholder="Select event series" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventSeries.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.name} ({event.eventType.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400 mt-1">
                    {eventSeries.find(e => e.id === selectedEventSeries)?.description || ''}
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="parameterType" className="text-gray-300">Parameter to Vary</Label>
                  <Select 
                    value={parameterType} 
                    onValueChange={(value: "startYear" | "duration" | "amount" | "allocation") => handleParameterTypeChange(value)}
                  >
                    <SelectTrigger className="mt-1 bg-gray-800 text-white w-full">
                      <SelectValue placeholder="Select parameter type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="startYear">Start Year</SelectItem>
                      <SelectItem value="duration">Duration</SelectItem>
                      {/* Only show Amount option for income or expense events */}
                      {eventSeries.find(e => e.id === selectedEventSeries)?.eventType.type === "income" || 
                       eventSeries.find(e => e.id === selectedEventSeries)?.eventType.type === "expense" ? (
                        <SelectItem value="amount">Amount</SelectItem>
                      ) : null}
                      {/* Only show Asset Allocation option for investment events with exactly 2 investments */}
                      {hasExactlyTwoInvestments(eventSeries.find(e => e.id === selectedEventSeries)) ? (
                        <SelectItem value="allocation">
                          Asset Allocation - {getInvestmentNames(eventSeries.find(e => e.id === selectedEventSeries)).first} %
                        </SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                  {parameterType === "allocation" && (
                    <>
                      <p className="text-sm text-gray-400 mt-2">
                        Adjust the percentage allocation for <strong className="text-white">{getInvestmentNames(eventSeries.find(e => e.id === selectedEventSeries)).first}</strong>.
                      </p>
                      <p className="text-sm text-gray-400">
                        The allocation for <strong className="text-white">{getInvestmentNames(eventSeries.find(e => e.id === selectedEventSeries)).second}</strong> will automatically be set to (100% - {getInvestmentNames(eventSeries.find(e => e.id === selectedEventSeries)).first} %).
                      </p>
                    </>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="parameterMin" className="text-gray-300">Minimum Value</Label>
                    <Input 
                      id="parameterMin"
                      type="number" 
                      value={parameterMin} 
                      onChange={(e) => setParameterMin(parseFloat(e.target.value) || 0)} 
                      className="mt-1 bg-gray-800 text-white"
                      step={parameterStep}
                    />
                  </div>
                  <div>
                    <Label htmlFor="parameterMax" className="text-gray-300">Maximum Value</Label>
                    <Input 
                      id="parameterMax"
                      type="number" 
                      value={parameterMax} 
                      onChange={(e) => setParameterMax(parseFloat(e.target.value) || 0)} 
                      className="mt-1 bg-gray-800 text-white"
                      step={parameterStep}
                    />
                  </div>
                  <div>
                    <Label htmlFor="parameterStep" className="text-gray-300">Step Size</Label>
                    <Input 
                      id="parameterStep"
                      type="number" 
                      value={parameterStep} 
                      onChange={(e) => setParameterStep(parseFloat(e.target.value) || 1)} 
                      className="mt-1 bg-gray-800 text-white"
                      min={0.01}
                      step={0.01}
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <Label htmlFor="simulationCount" className="text-gray-300">Number of Simulations</Label>
                  <div className="flex items-center mt-1">
                    <Input 
                      id="simulationCount"
                      type="number" 
                      value={scenarioSimulationCount} 
                      onChange={(e) => setScenarioSimulationCount(parseInt(e.target.value) || 100)} 
                      className="bg-gray-800 text-white w-full"
                      min={10}
                      max={1000}
                    />
                    <div className="ml-2 text-xs text-gray-400 w-32">
                      (10-1000)
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Higher counts provide more accurate results but take longer to process.
                  </p>
                </div>
                
                {/* Graph Configuration */}
                <div className="mt-4 border-t border-gray-700 pt-4">
                  <h3 className="text-lg font-medium mb-3">Graph Configuration</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="graphType" className="text-gray-300">Graph Type</Label>
                      <Select value={selectedGraphType} onValueChange={(value: "multi-line" | "parameter-impact") => setSelectedGraphType(value)}>
                        <SelectTrigger className="mt-1 bg-gray-800 text-white w-full">
                          <SelectValue placeholder="Select graph type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multi-line">Multi-line chart over time</SelectItem>
                          <SelectItem value="parameter-impact">Parameter impact line chart</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-400 mt-1">
                        {selectedGraphType === "multi-line" 
                          ? "Shows how values change over time for different parameter values"
                          : "Shows how final values change based on different parameter values"
                        }
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="metric" className="text-gray-300">Metric to Display</Label>
                      <Select value={selectedGraphMetric} onValueChange={(value: "success-probability" | "total-investments") => setSelectedGraphMetric(value)}>
                        <SelectTrigger className="mt-1 bg-gray-800 text-white w-full">
                          <SelectValue placeholder="Select metric" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="success-probability">Probability of Success</SelectItem>
                          <SelectItem value="total-investments">Total Investments</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={addGraphConfig} 
                    className="mt-4 bg-gray-800 hover:bg-gray-700 text-white"
                    variant="outline"
                  >
                    Add Graph
                  </Button>
                  
                  {graphConfigs.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <Label className="text-gray-300">Configured Graphs:</Label>
                      {graphConfigs.map(config => (
                        <div key={config.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                          <div className="text-sm text-gray-300">
                            {config.type === "multi-line" ? "Multi-line chart" : "Parameter impact chart"} - {config.metric === "success-probability" ? "Probability of Success" : "Total Investments"}
                          </div>
                          <Button 
                            onClick={() => removeGraphConfig(config.id)}
                            variant="ghost" 
                            size="sm"
                            className="h-7 text-xs text-gray-400 hover:text-white"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <Button 
                  onClick={runScenarioExploration} 
                  className="bg-[#7F56D9] hover:bg-[#6941C6] text-white w-full mt-4"
                  disabled={isRunningScenario || !selectedEventSeries}
                >
                  {isRunningScenario ? "Running Analysis..." : "Analyze Parameter Impact"}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {scenarioResults && (
            <>
              {/* Show all configured graphs */}
              {graphConfigs.map(config => (
                <div key={config.id} className="space-y-4">
                  <h2 className="text-2xl font-semibold text-white">
                    {getGraphTitle(config)}
                  </h2>
                  <p className="text-gray-300">
                    {getGraphDescription(config)}
                  </p>
                  
                  {/* Render the appropriate chart based on the configuration */}
                  {config.type === "parameter-impact" && (
                    <ParamVsResultChart
                      data={scenarioResults.values.map((value, index) => ({
                        parameterValue: value,
                        finalResult: config.metric === "success-probability" 
                          ? scenarioResults.probabilities[index]
                          : scenarioResults.medianOutcomes[index]
                      }))}
                      parameterName={getParameterLabel()}
                      yLabel={config.metric === "success-probability" 
                        ? "Probability of Success (%)" 
                        : "Median Total Investments ($)"}
                    />
                  )}
                  
                  {config.type === "multi-line" && (
                    <div className="text-gray-400 italic text-center p-8 border border-gray-700 rounded">
                      Multi-line time chart would be rendered here, showing {config.metric === "success-probability" ? "probability of success" : "total investments"} 
                      over time for different values of {getParameterLabel().toLowerCase()}.
                    </div>
                  )}
                </div>
              ))}
              
              {/* Show stacked bar visualization if no graphs are configured */}
              {graphConfigs.length === 0 && (
                <div className="p-4 bg-gray-900 rounded-lg border border-[#7F56D9]">
                  <h2 className="text-2xl font-semibold text-white mb-4">
                    {visualizationType === "investments" ? "Investment Breakdown" : 
                     visualizationType === "income" ? "Income Breakdown" : "Expense Breakdown"}
                  </h2>
                  <p className="text-gray-300 mb-6">
                    This stacked bar chart shows the median values of {visualizationType} breakdown over time.
                    Each bar represents a year, and the segments show the breakdown by {
                      visualizationType === "investments" ? "investment account" : 
                      visualizationType === "income" ? "income source" : "expense category"
                    }.
                  </p>
                  <div className="text-gray-400 italic text-center">
                    [Stacked bar chart visualization would appear here for the selected parameter value]
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
