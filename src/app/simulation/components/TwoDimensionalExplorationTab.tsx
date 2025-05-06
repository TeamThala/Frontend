"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SurfacePlot from "./SurfacePlot";
import ContourPlot from "./ContourPlot";
import { transformToTwoDimensionalData, SurfacePlotDataPoint } from "../functions/transformToTwoDimensionalData";
import { YearlyResult } from "@/types/simulationResult";
import { Scenario } from "@/types/scenario";

// Investment interface
interface Investment {
  investmentType?: {
    name?: string;
  };
}

// Asset allocation interface
interface AssetAllocation {
  investments?: Investment[];
  percentages?: number[];
}

// Event type interfaces
interface BaseEventType {
  type: string;
}

interface ExpenseOrIncomeEventType extends BaseEventType {
  type: "income" | "expense";
  amount: number;
}

interface InvestmentEventType extends BaseEventType {
  type: "investment";
  assetAllocation: AssetAllocation;
}

type EventType = ExpenseOrIncomeEventType | InvestmentEventType | BaseEventType;

// Event series interface to match actual JSON structure
interface EventSeries {
  id: string;
  _id?: string; // MongoDB ID that may be present
  name: string;
  description: string;
  startYear: {
    type: string;
    year: number;
  };
  duration: {
    type: string;
    year: number;
    value?: number; // Some events use value instead of year
  };
  eventType: EventType;
}

// API response interfaces
interface SimulationData {
  simulationId: number;
  success: boolean;
  data: YearlyResult[];
  [key: string]: unknown;
}

// Update the simulation result interface to match what our API returns
interface SimulationResult {
  success: boolean;
  twoDimensionalExploration: boolean;
  data: Array<{
    parameter1Value: number;
    parameter2Value: number;
    simulations: SimulationData[];
  }>;
  parameter1Values: number[];
  parameter2Values: number[];
  totalCombinations: number;
  simulationsPerCombination: number;
}

interface TwoDimensionalExplorationTabProps {
  scenarioId: string;
}

// Type guards to check event types
function isIncomeOrExpenseEvent(event: EventSeries | null | undefined): boolean {
  if (!event) return false;
  return event.eventType.type === "income" || event.eventType.type === "expense";
}

function isInvestmentEvent(event: EventSeries | undefined | null): boolean {
  return !!(event && event.eventType && event.eventType.type === "investment");
}

function isRebalanceEvent(event: EventSeries | undefined | null): boolean {
  return !!(event && event.eventType && event.eventType.type === "rebalance");
}

// Helper function to check if an investment event has exactly 2 investments
function hasExactlyTwoInvestments(event: EventSeries | undefined | null): boolean {
  if (!isInvestmentEvent(event)) return false;
  
  // Add null check and type assertion
  const eventType = event!.eventType as InvestmentEventType;
  const assetAllocation = eventType.assetAllocation;
  
  return !!(assetAllocation && 
         assetAllocation.investments && 
         assetAllocation.investments.length === 2);
}

// Function to check if an event has an amount property (for income/expense)
const hasAmountProperty = (event: EventSeries | undefined | null): boolean => {
  if (!event || !event.eventType) return false;
  
  // Check if it's an income/expense type with amount property
  if (event.eventType.type === "income" || event.eventType.type === "expense") {
    return 'amount' in event.eventType;
  }
  
  return false;
};

// Function to safely retrieve an amount from any event
function getEventAmount(event: EventSeries): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyEventType = event.eventType as any;
  return typeof anyEventType.amount === 'number' ? anyEventType.amount : 10000;
}

export default function TwoDimensionalExplorationTab({ scenarioId }: TwoDimensionalExplorationTabProps) {
  // Parameter 1 state
  const [parameter1EventSeries, setParameter1EventSeries] = useState<string>("");
  const [parameter1Type, setParameter1Type] = useState<"startYear" | "duration" | "amount" | "allocation">("startYear");
  const [parameter1Min, setParameter1Min] = useState<number>(55);
  const [parameter1Max, setParameter1Max] = useState<number>(75);
  const [parameter1Step, setParameter1Step] = useState<number>(5);
  
  // Parameter 2 state
  const [parameter2EventSeries, setParameter2EventSeries] = useState<string>("");
  const [parameter2Type, setParameter2Type] = useState<"startYear" | "duration" | "amount" | "allocation">("startYear");
  const [parameter2Min, setParameter2Min] = useState<number>(30000);
  const [parameter2Max, setParameter2Max] = useState<number>(60000);
  const [parameter2Step, setParameter2Step] = useState<number>(10000);
  
  // Simulation state
  const [isRunningScenario, setIsRunningScenario] = useState(false);
  const [simulationCount, setSimulationCount] = useState<number>(50);
  const [eventSeries, setEventSeries] = useState<EventSeries[]>([]);
  const [simulationResults, setSimulationResults] = useState<SimulationResult | null>(null);
  
  // Selected event objects
  const [selectedEvent1, setSelectedEvent1] = useState<EventSeries | null>(null);
  const [selectedEvent2, setSelectedEvent2] = useState<EventSeries | null>(null);
  
  // New visualization state
  const [activeMetric, setActiveMetric] = useState<"success-probability" | "total-investments">("success-probability");
  const [activeVisualization, setActiveVisualization] = useState<"surface" | "contour">("surface");
  const [isLoadingVisualization, setIsLoadingVisualization] = useState(false);
  const [surfacePlotData, setSurfacePlotData] = useState<SurfacePlotDataPoint[] | null>(null);
  
  // Calculate expected simulation count with safety checks
  const expectedSimulationCount = (() => {
    const p1Range = isNaN(parameter1Max) || isNaN(parameter1Min) || isNaN(parameter1Step) || parameter1Step <= 0
      ? 1
      : Math.ceil((parameter1Max - parameter1Min) / parameter1Step) + 1;
      
    const p2Range = isNaN(parameter2Max) || isNaN(parameter2Min) || isNaN(parameter2Step) || parameter2Step <= 0
      ? 1
      : Math.ceil((parameter2Max - parameter2Min) / parameter2Step) + 1;
      
    const simCount = isNaN(simulationCount) ? 50 : simulationCount;
    
    return Math.max(0, p1Range * p2Range * simCount);
  })();
  
  // Fetch scenario data from the API
  useEffect(() => {
    const fetchScenarioData = async () => {
      try {
        const response = await fetch(`/api/scenarios/${scenarioId}`);
        
        if (!response.ok) {
          throw new Error(`API call failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        const scenario = data.scenario as Scenario;
        
        if (scenario && scenario.eventSeries) {
          const seriesData = scenario.eventSeries as unknown as EventSeries[];
          console.log('Event series loaded:', seriesData);
          setEventSeries(seriesData);
          
          if (seriesData.length > 0) {
            // Set first event
            const firstEvent = seriesData[0];
            const firstEventId = firstEvent.id || firstEvent._id || 'event-0';
            console.log('Setting first event:', firstEvent);
            setParameter1EventSeries(firstEventId);
            setSelectedEvent1(firstEvent);
            
            // Set second event if available, otherwise use first event
            if (seriesData.length > 1) {
              const secondEvent = seriesData[1];
              const secondEventId = secondEvent.id || secondEvent._id || 'event-1';
              console.log('Setting second event:', secondEvent);
              setParameter2EventSeries(secondEventId);
              setSelectedEvent2(secondEvent);
            } else {
              setParameter2EventSeries(firstEventId);
              setSelectedEvent2(firstEvent);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching scenario data:", error);
      }
    };

    fetchScenarioData();
  }, [scenarioId]);

  // Debug useEffect to track selected events
  useEffect(() => {
    console.log("Selected event 1:", selectedEvent1);
    console.log("Selected event 1 type:", selectedEvent1?.eventType?.type);
    console.log("Selected event 2:", selectedEvent2);
    console.log("Selected event 2 type:", selectedEvent2?.eventType?.type);
  }, [selectedEvent1, selectedEvent2]);
  
  // Debug useEffect to inspect event series data structure
  useEffect(() => {
    if (eventSeries.length > 0) {
      console.log('Checking event series structure:');
      console.log('First event:', eventSeries[0]);
      
      // Output each event type
      eventSeries.forEach((event, index) => {
        console.log(`Event ${index}: ${event.name}, Type: ${event.eventType?.type}`);
        // Use type assertion to safely check for amount property
        console.log(`Event ${index} has amount:`, 'amount' in (event.eventType as any));
      });
    }
  }, [eventSeries]);

  // Function to run two-dimensional scenario exploration
  const runScenarioExploration = async () => {
    setIsRunningScenario(true);
    setSimulationResults(null);
    setSurfacePlotData(null);
    setIsLoadingVisualization(true);
    
    try {
      // Generate parameter values based on min, max, step for both parameters
      const param1Values: number[] = [];
      for (let i = parameter1Min; i <= parameter1Max; i += parameter1Step) {
        param1Values.push(Math.round(i * 100) / 100); // Round to 2 decimal places
      }
      
      const param2Values: number[] = [];
      for (let i = parameter2Min; i <= parameter2Max; i += parameter2Step) {
        param2Values.push(Math.round(i * 100) / 100); // Round to 2 decimal places
      }
      
      // Send the parameter exploration to the API
      const response = await fetch('/api/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId,
          twoDimensionalExploration: {
            parameter1: {
              eventSeriesId: parameter1EventSeries,
              parameterType: parameter1Type,
              parameterValues: param1Values
            },
            parameter2: {
              eventSeriesId: parameter2EventSeries,
              parameterType: parameter2Type,
              parameterValues: param2Values
            }
          },
          simulationCount
        })
      });
      
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Two-dimensional exploration API response:', data);
      setSimulationResults(data);
      
      // Transform data for surface plot visualization
      if (data.data && Array.isArray(data.data)) {
        const transformedData = transformToTwoDimensionalData(data.data, activeMetric);
        setSurfacePlotData(transformedData);
      }
      
    } catch (error) {
      console.error("Error running 2D scenario exploration:", error);
    } finally {
      setIsRunningScenario(false);
      setIsLoadingVisualization(false);
    }
  };
  
  // Update parameter settings when changing the event series or parameter type
  const handleEventSeriesChange = (eventId: string, paramNum: 1 | 2) => {
    console.log(`Event ID selected for param ${paramNum}:`, eventId);
    console.log('Available events:', eventSeries);
    
    if (!eventId) {
      console.warn(`No event ID provided for parameter ${paramNum}`);
      return;
    }
    
    // Set the selected event series ID
    if (paramNum === 1) {
      setParameter1EventSeries(eventId);
    } else {
      setParameter2EventSeries(eventId);
    }
    
    // Find the event by ID or _id
    const event = eventSeries.find(e => e.id === eventId || e._id === eventId);
    
    console.log(`Event selected for param ${paramNum}:`, event);
    console.log(`Event type for param ${paramNum}:`, event?.eventType?.type);
    
    if (!event) {
      console.warn(`Could not find event with ID ${eventId}`);
      return;
    }
    
    // Store the selected event object in state
    if (paramNum === 1) {
      setSelectedEvent1(event);
    } else {
      setSelectedEvent2(event);
    }
    
    // Update parameter ranges based on the event
    const paramType = paramNum === 1 ? parameter1Type : parameter2Type;
    updateParameterRanges(event, paramType, paramNum);
  };
  
  const handleParameterTypeChange = (
    type: "startYear" | "duration" | "amount" | "allocation", 
    paramNum: 1 | 2
  ) => {
    if (paramNum === 1) {
      setParameter1Type(type);
    } else {
      setParameter2Type(type);
    }
    
    const event = paramNum === 1 ? selectedEvent1 : selectedEvent2;
    if (!event) return;
    
    // Update parameter ranges based on the event and new type
    updateParameterRanges(event, type, paramNum);
  };
  
  // Helper to update parameter ranges
  const updateParameterRanges = (
    event: EventSeries, 
    type: "startYear" | "duration" | "amount" | "allocation",
    paramNum: 1 | 2
  ) => {
    let min: number | undefined, max: number | undefined, step: number | undefined;
    
    if (type === "startYear") {
      const startYear = event.startYear.year;
      min = startYear - 5;
      max = startYear + 5;
      step = 1;
    } else if (type === "duration") {
      const duration = event.duration.year || event.duration.value || 1;
      min = Math.max(1, duration - 10);
      max = duration + 10;
      step = 1;
    } else if (type === "amount") {
      // Use our utility function to get the amount safely
      const amount = getEventAmount(event);
      min = Math.max(1000, amount * 0.5);
      max = amount * 1.5;
      step = amount > 10000 ? 5000 : 1000;
    } else if (type === "allocation" && isInvestmentEvent(event)) {
      // For asset allocation, use a standard range of 0-100%
      min = 0;
      max = 100;
      step = 5;
    }
    
    // Update the state based on which parameter we're updating
    if (paramNum === 1) {
      if (min !== undefined) setParameter1Min(min);
      if (max !== undefined) setParameter1Max(max);
      if (step !== undefined) setParameter1Step(step);
    } else {
      if (min !== undefined) setParameter2Min(min);
      if (max !== undefined) setParameter2Max(max);
      if (step !== undefined) setParameter2Step(step);
    }
  };

  // Update visualization when metric changes
  useEffect(() => {
    if (simulationResults && simulationResults.data && Array.isArray(simulationResults.data)) {
      setIsLoadingVisualization(true);
      // Use setTimeout to prevent UI freezing during transformation
      setTimeout(() => {
        const transformedData = transformToTwoDimensionalData(simulationResults.data, activeMetric);
        setSurfacePlotData(transformedData);
        setIsLoadingVisualization(false);
      }, 0);
    }
  }, [activeMetric, simulationResults]);
  
  // Get parameter label for visualization
  const getParamLabel = (
    eventId: string, 
    paramType: "startYear" | "duration" | "amount" | "allocation"
  ): string => {
    const event = eventSeries.find(e => e.id === eventId || e._id === eventId);
    if (!event) return paramType;
    
    // Format label based on parameter type
    switch (paramType) {
      case "startYear":
        return `Start Year (${event.name})`;
      case "duration":
        return `Duration (${event.name})`;
      case "amount":
        return `Amount (${event.name})`;
      case "allocation":
        if (isInvestmentEvent(event)) {
          return `Asset Allocation (${event.name})`;
        }
        return `Allocation (${event.name})`;
    }
  };

  return (
    <div className="space-y-8">
      <Card className="text-white rounded-xl border border-[#7F56D9] shadow-lg bg-gray-900 p-4">
        <CardContent>
          <h2 className="text-xl font-semibold mb-4">Two-dimensional Parameter Analysis</h2>
          <p className="text-gray-300 mb-6">
            Explore how combinations of two different parameters affect your financial outcomes.
            Select two event series, parameter types, and ranges to analyze.
          </p>
          
          {/* Parameter 1 Configuration */}
          <div className="border-t border-gray-700 pt-4 mb-6">
            <h3 className="text-lg font-medium mb-3">Parameter 1</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="parameter1EventSeries" className="text-gray-300">Event Series</Label>
                <Select 
                  value={parameter1EventSeries || ''} 
                  onValueChange={(value) => {
                    console.log('Parameter 1 Select onValueChange:', value);
                    handleEventSeriesChange(value, 1);
                  }}
                >
                  <SelectTrigger className="mt-1 bg-gray-800 text-white w-full">
                    <SelectValue placeholder="Select event series" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Filter out rebalance events */}
                    {eventSeries
                      .filter(event => !isRebalanceEvent(event))
                      .map((event, index) => {
                        const eventId = event.id || event._id || `event-${index}`;
                        console.log(`Event ${index} ID:`, eventId, 'Name:', event.name);
                        return (
                          <SelectItem 
                            key={`param1-event-${eventId}-${index}`} 
                            value={eventId}
                          >
                            {event.name} ({event.eventType.type})
                          </SelectItem>
                        );
                      })
                    }
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1">
                  {selectedEvent1?.description || ''}
                </p>
              </div>
              
              <div>
                <Label htmlFor="parameter1Type" className="text-gray-300">Parameter to Vary</Label>
                <Select 
                  value={parameter1Type || 'startYear'} 
                  onValueChange={(value: "startYear" | "duration" | "amount" | "allocation") => 
                    handleParameterTypeChange(value, 1)
                  }
                >
                  <SelectTrigger className="mt-1 bg-gray-800 text-white w-full">
                    <SelectValue placeholder="Select parameter type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="startYear">Start Year</SelectItem>
                    <SelectItem value="duration">Duration</SelectItem>
                    {/* Only show Amount option for income or expense events */}
                    {selectedEvent1 && selectedEvent1.eventType && 
                     (selectedEvent1.eventType.type === "income" || selectedEvent1.eventType.type === "expense") && (
                      <SelectItem value="amount">
                        Amount {selectedEvent1.eventType.type === "income" ? "(Income)" : "(Expense)"}
                      </SelectItem>
                    )}
                    {/* Show Asset Allocation option for all investment events */}
                    {isInvestmentEvent(selectedEvent1) && (
                      <SelectItem value="allocation">
                        Asset Allocation
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="parameter1Min" className="text-gray-300">Minimum Value</Label>
                  <Input 
                    id="parameter1Min"
                    type="number" 
                    value={isNaN(parameter1Min) ? 0 : parameter1Min} 
                    onChange={(e) => setParameter1Min(parseFloat(e.target.value) || 0)} 
                    className="mt-1 bg-gray-800 text-white"
                    step={parameter1Step || 1}
                  />
                </div>
                <div>
                  <Label htmlFor="parameter1Max" className="text-gray-300">Maximum Value</Label>
                  <Input 
                    id="parameter1Max"
                    type="number" 
                    value={isNaN(parameter1Max) ? 0 : parameter1Max} 
                    onChange={(e) => setParameter1Max(parseFloat(e.target.value) || 0)} 
                    className="mt-1 bg-gray-800 text-white"
                    step={parameter1Step || 1}
                  />
                </div>
                <div>
                  <Label htmlFor="parameter1Step" className="text-gray-300">Step Size</Label>
                  <Input 
                    id="parameter1Step"
                    type="number" 
                    value={isNaN(parameter1Step) ? 1 : parameter1Step} 
                    onChange={(e) => setParameter1Step(parseFloat(e.target.value) || 1)} 
                    className="mt-1 bg-gray-800 text-white"
                    min={0.01}
                    step={0.01}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Parameter 2 Configuration */}
          <div className="border-t border-gray-700 pt-4 mb-6">
            <h3 className="text-lg font-medium mb-3">Parameter 2</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="parameter2EventSeries" className="text-gray-300">Event Series</Label>
                <Select 
                  value={parameter2EventSeries || ''} 
                  onValueChange={(value) => {
                    console.log('Parameter 2 Select onValueChange:', value);
                    handleEventSeriesChange(value, 2);
                  }}
                >
                  <SelectTrigger className="mt-1 bg-gray-800 text-white w-full">
                    <SelectValue placeholder="Select event series" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Filter out rebalance events */}
                    {eventSeries
                      .filter(event => !isRebalanceEvent(event))
                      .map((event, index) => {
                        const eventId = event.id || event._id || `event-${index}`;
                        return (
                          <SelectItem 
                            key={`param2-event-${eventId}-${index}`} 
                            value={eventId}
                          >
                            {event.name} ({event.eventType.type})
                          </SelectItem>
                        );
                      })
                    }
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1">
                  {selectedEvent2?.description || ''}
                </p>
              </div>
              
              <div>
                <Label htmlFor="parameter2Type" className="text-gray-300">Parameter to Vary</Label>
                <Select 
                  value={parameter2Type || 'startYear'} 
                  onValueChange={(value: "startYear" | "duration" | "amount" | "allocation") => 
                    handleParameterTypeChange(value, 2)
                  }
                >
                  <SelectTrigger className="mt-1 bg-gray-800 text-white w-full">
                    <SelectValue placeholder="Select parameter type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="startYear">Start Year</SelectItem>
                    <SelectItem value="duration">Duration</SelectItem>
                    {/* Only show Amount option for income or expense events */}
                    {selectedEvent2 && selectedEvent2.eventType && 
                     (selectedEvent2.eventType.type === "income" || selectedEvent2.eventType.type === "expense") && (
                      <SelectItem value="amount">
                        Amount {selectedEvent2.eventType.type === "income" ? "(Income)" : "(Expense)"}
                      </SelectItem>
                    )}
                    {/* Show Asset Allocation option for all investment events */}
                    {isInvestmentEvent(selectedEvent2) && (
                      <SelectItem value="allocation">
                        Asset Allocation
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="parameter2Min" className="text-gray-300">Minimum Value</Label>
                  <Input 
                    id="parameter2Min"
                    type="number" 
                    value={isNaN(parameter2Min) ? 0 : parameter2Min} 
                    onChange={(e) => setParameter2Min(parseFloat(e.target.value) || 0)} 
                    className="mt-1 bg-gray-800 text-white"
                    step={parameter2Step || 1}
                  />
                </div>
                <div>
                  <Label htmlFor="parameter2Max" className="text-gray-300">Maximum Value</Label>
                  <Input 
                    id="parameter2Max"
                    type="number" 
                    value={isNaN(parameter2Max) ? 0 : parameter2Max} 
                    onChange={(e) => setParameter2Max(parseFloat(e.target.value) || 0)} 
                    className="mt-1 bg-gray-800 text-white"
                    step={parameter2Step || 1}
                  />
                </div>
                <div>
                  <Label htmlFor="parameter2Step" className="text-gray-300">Step Size</Label>
                  <Input 
                    id="parameter2Step"
                    type="number" 
                    value={isNaN(parameter2Step) ? 1 : parameter2Step} 
                    onChange={(e) => setParameter2Step(parseFloat(e.target.value) || 1)} 
                    className="mt-1 bg-gray-800 text-white"
                    min={0.01}
                    step={0.01}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Simulation Configuration */}
          <div className="border-t border-gray-700 pt-4 mb-6">
            <div className="mt-4">
              <Label htmlFor="simulationCount" className="text-gray-300">Simulations Per Combination</Label>
              <div className="flex items-center mt-1">
                <Input 
                  id="simulationCount"
                  type="number" 
                  value={isNaN(simulationCount) ? 50 : simulationCount} 
                  onChange={(e) => setSimulationCount(parseInt(e.target.value) || 10)} 
                  className="bg-gray-800 text-white w-full"
                  min={10}
                  max={1000}
                />
                <div className="ml-2 text-xs text-gray-400 w-32">
                  (10-1000)
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-gray-800 rounded-md">
              <div className="text-sm text-gray-300">
                <span className="font-medium">Estimated total simulations:</span> {expectedSimulationCount.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                This represents the total number of simulations that will be run across all parameter combinations.
              </div>
            </div>
          </div>
          
          <Button 
            onClick={runScenarioExploration} 
            className="bg-[#7F56D9] hover:bg-[#6941C6] text-white w-full mt-4"
            disabled={isRunningScenario || !parameter1EventSeries || !parameter2EventSeries}
          >
            {isRunningScenario ? "Running Analysis..." : "Analyze Parameter Combinations"}
          </Button>
        </CardContent>
      </Card>
      
      {/* Results visualization */}
      {simulationResults && (
        <Card className="text-white rounded-xl border border-[#7F56D9] shadow-lg bg-gray-900 p-4">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Analysis Results</CardTitle>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-300">
                  {simulationResults.data?.length || 0} parameter combinations analyzed
                </div>
                
                {/* Visualization Type Toggle */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400">View:</span>
                  <Tabs 
                    value={activeVisualization} 
                    onValueChange={(value) => setActiveVisualization(value as "surface" | "contour")}
                    className="w-auto"
                  >
                    <TabsList className="h-8 bg-gray-800">
                      <TabsTrigger value="surface" className="h-7 text-xs px-2">3D Surface</TabsTrigger>
                      <TabsTrigger value="contour" className="h-7 text-xs px-2">Contour Map</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
              
              {/* Metric Toggle */}
              <div className="flex items-center space-x-2">
                <Label htmlFor="metric-toggle" className="text-gray-300">
                  {activeMetric === "success-probability" ? "Success Probability" : "Total Investments"}
                </Label>
                <Switch 
                  id="metric-toggle"
                  checked={activeMetric === "total-investments"}
                  onCheckedChange={(checked) => 
                    setActiveMetric(checked ? "total-investments" : "success-probability")
                  }
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingVisualization ? (
              <div className="w-full h-[500px] flex items-center justify-center">
                <Skeleton className="w-full h-full bg-gray-800" />
              </div>
            ) : surfacePlotData && surfacePlotData.length > 0 ? (
              <div className="relative">
                {/* Surface Plot */}
                <div className={activeVisualization === "surface" ? "block" : "hidden"}>
                  <SurfacePlot 
                    data={surfacePlotData}
                    xLabel={getParamLabel(parameter1EventSeries, parameter1Type)}
                    yLabel={getParamLabel(parameter2EventSeries, parameter2Type)}
                    zLabel={activeMetric === "success-probability" 
                      ? "Success Probability (%)" 
                      : "Median Final Investment Value ($)"}
                    title={activeMetric === "success-probability"
                      ? "Impact on Success Probability"
                      : "Impact on Final Investment Value"}
                    width={650}
                    height={500}
                    colorScale={activeMetric === "success-probability"
                      ? [
                          [0, "rgb(178, 24, 43)"],
                          [0.25, "rgb(239, 138, 98)"],
                          [0.5, "rgb(253, 219, 199)"],
                          [0.75, "rgb(209, 229, 240)"],
                          [1, "rgb(33, 102, 172)"]
                        ]
                      : [
                          [0, "rgb(5, 48, 97)"],
                          [0.25, "rgb(33, 102, 172)"],
                          [0.5, "rgb(67, 147, 195)"],
                          [0.75, "rgb(146, 197, 222)"],
                          [1, "rgb(209, 229, 240)"]
                        ]
                    }
                  />
                </div>
                
                {/* Contour Plot */}
                <div className={activeVisualization === "contour" ? "block" : "hidden"}>
                  <ContourPlot 
                    data={surfacePlotData}
                    xLabel={getParamLabel(parameter1EventSeries, parameter1Type)}
                    yLabel={getParamLabel(parameter2EventSeries, parameter2Type)}
                    zLabel={activeMetric === "success-probability" 
                      ? "Success Probability (%)" 
                      : "Median Final Investment Value ($)"}
                    title={activeMetric === "success-probability"
                      ? "Success Probability Contour Map"
                      : "Final Investment Value Contour Map"}
                    width={650}
                    height={500}
                    colorScale={activeMetric === "success-probability"
                      ? [
                          [0, "rgb(178, 24, 43)"],
                          [0.25, "rgb(239, 138, 98)"],
                          [0.5, "rgb(253, 219, 199)"],
                          [0.75, "rgb(209, 229, 240)"],
                          [1, "rgb(33, 102, 172)"]
                        ]
                      : [
                          [0, "rgb(5, 48, 97)"],
                          [0.25, "rgb(33, 102, 172)"],
                          [0.5, "rgb(67, 147, 195)"],
                          [0.75, "rgb(146, 197, 222)"],
                          [1, "rgb(209, 229, 240)"]
                        ]
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400">
                <p>No data available for visualization.</p>
                <p className="mt-2 text-sm">Try running the analysis with different parameters.</p>
              </div>
            )}
            
            <div className="mt-6 p-4 bg-gray-800 rounded-md text-sm text-gray-300">
              <h3 className="font-medium mb-2">Interpretation Guide:</h3>
              {activeVisualization === "surface" ? (
                <p>
                  This surface plot shows how different combinations of{" "}
                  <span className="text-[#7F56D9]">{getParamLabel(parameter1EventSeries, parameter1Type)}</span> and{" "}
                  <span className="text-[#7F56D9]">{getParamLabel(parameter2EventSeries, parameter2Type)}</span>{" "}
                  affect your {activeMetric === "success-probability" ? "probability of financial success" : "final investment value"}.
                  {activeMetric === "success-probability"
                    ? " Higher values (blue) indicate parameter combinations with better chances of success."
                    : " Higher elevations (blue) represent parameter combinations resulting in larger final investment values."
                  }
                </p>
              ) : (
                <p>
                  This contour map shows how different combinations of{" "}
                  <span className="text-[#7F56D9]">{getParamLabel(parameter1EventSeries, parameter1Type)}</span> and{" "}
                  <span className="text-[#7F56D9]">{getParamLabel(parameter2EventSeries, parameter2Type)}</span>{" "}
                  affect your {activeMetric === "success-probability" ? "probability of financial success" : "final investment value"}.
                  Each contour line represents areas with the same value, making it easy to identify optimal parameter combinations.
                </p>
              )}
              <p className="mt-2">
                <strong>Tip:</strong> {activeVisualization === "surface" 
                  ? "Click and drag to rotate the 3D plot. Scroll to zoom in/out."
                  : "Hover over the contour map to see exact values at each point."
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 