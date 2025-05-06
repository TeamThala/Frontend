"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MultiLineScenarioChart, { ScenarioLineData } from "@/app/simulation/components/MultiLineScenarioChart";
import { transformToMultiScenarioLineData } from "../functions/transformToMultiScenarioLineData";
import ParamVsResultChart from "@/app/simulation/components/ParamVsResultChart";
import { ParamVsResultPoint } from "@/app/simulation/sample-data/sampleData";
import { transformToParameterImpactData } from "../functions/transformToParameterImpactData";
import { Scenario } from "@/types/scenario";

// Event series interface - made permissive to match actual JSON structure
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
    value: number; // Some events use value instead of year
  };
  eventType: {
    type: string;
    // Using any since the event type structure varies significantly in the JSON
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any; 
  };
}

// Define graph types and metrics
interface GraphConfig {
  id: string;
  type: "multi-line" | "parameter-impact";
  metric: "success-probability" | "total-investments";
}

interface ParameterExplorationTabProps {
  scenarioId: string;
}

// Helper function to check if an event is an investment event
const isInvestmentEvent = (event: EventSeries | undefined | null): boolean => {
  return !!(event && event.eventType && event.eventType.type === "investment");
};

// Helper function to check if an event is a rebalance event
const isRebalanceEvent = (event: EventSeries | undefined | null): boolean => {
  return !!(event && event.eventType && event.eventType.type === "rebalance");
};

// Helper function to check if an investment event has exactly 2 investments
const hasExactlyTwoInvestments = (event: EventSeries | undefined | null): boolean => {
  if (!isInvestmentEvent(event)) return false;
  
  const assetAllocation = event?.eventType.assetAllocation;
  return assetAllocation && 
         assetAllocation.investments && 
         assetAllocation.investments.length === 2;
};

// Get the parameter label based on event and parameter type
const getParameterLabel = (event: EventSeries | undefined | null, parameterType: string): string => {
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

export default function ParameterExplorationTab({ scenarioId }: ParameterExplorationTabProps) {
  // One-dimensional simulation state
  const [parameterMin, setParameterMin] = useState<number>(55);
  const [parameterMax, setParameterMax] = useState<number>(75);
  const [parameterStep, setParameterStep] = useState<number>(1);
  const [isRunningScenario, setIsRunningScenario] = useState(false);
  
  // Scenario exploration specific state
  const [eventSeries, setEventSeries] = useState<EventSeries[]>([]);
  const [selectedEventSeries, setSelectedEventSeries] = useState<string>("");
  const [parameterType, setParameterType] = useState<"startYear" | "duration" | "amount" | "allocation">("startYear");

  // Graph configuration state
  const [graphConfigs, setGraphConfigs] = useState<GraphConfig[]>([]);
  const [selectedGraphType, setSelectedGraphType] = useState<"multi-line" | "parameter-impact">("parameter-impact");
  const [selectedGraphMetric, setSelectedGraphMetric] = useState<"success-probability" | "total-investments">("success-probability");
  
  // Number of simulations to run
  const [scenarioSimulationCount, setScenarioSimulationCount] = useState<number>(100);
  
  // Add state for storing results
  const [graphsData, setGraphsData] = useState<Array<{
    id: string;
    type: "multi-line" | "parameter-impact";
    metric: "success-probability" | "total-investments";
    data: ScenarioLineData[] | ParamVsResultPoint[];
    dataType: "line" | "impact";
  }>>([]);
  
  // Add a state to track the selected event object directly
  const [selectedEvent, setSelectedEvent] = useState<EventSeries | null>(null);

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
            const firstEvent = seriesData[0];
            const eventId = firstEvent.id || firstEvent._id || 'event-0';
            console.log('Setting initial event:', firstEvent);
            console.log('Initial event ID:', eventId);
            
            setSelectedEventSeries(eventId);
            setSelectedEvent(firstEvent);
          }
        }
      } catch (error) {
        console.error("Error fetching scenario data:", error);
      }
    };

    fetchScenarioData();
  }, [scenarioId]);

  // Debug useEffect to track selectedEvent changes
  useEffect(() => {
    console.log("Selected event updated:", selectedEvent);
    console.log("Selected event type:", selectedEvent?.eventType?.type);
  }, [selectedEvent]);

  // Debug useEffect to inspect event series data structure
  useEffect(() => {
    if (eventSeries.length > 0) {
      console.log('Checking event series structure:');
      console.log('First event:', eventSeries[0]);
      
      // Output each event type
      eventSeries.forEach((event, index) => {
        console.log(`Event ${index}: ${event.name}, Type: ${event.eventType?.type}`);
        console.log(`Event ${index} has amount:`, !!event.eventType?.amount);
      });
    }
  }, [eventSeries]);

  // Function to run one-dimensional scenario exploration
  const runScenarioExploration = async () => {
    setIsRunningScenario(true);
    setGraphsData([]); // Reset graphs data when running new simulations
    
    try {
      // Generate parameter values based on min, max, step
      const values: number[] = [];
      for (let i = parameterMin; i <= parameterMax; i += parameterStep) {
        values.push(Math.round(i * 100) / 100); // Round to 2 decimal places
      }
      
      // Check if we have a selected event
      if (!selectedEvent) {
        throw new Error("No event selected");
      }
      
      // Send the parameter exploration to the API
      const response = await fetch('/api/simulation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenarioId,
          parameterExploration: {
            eventSeriesId: selectedEventSeries,
            parameterType: parameterType,
            parameterValues: values
          },
          simulationCount: scenarioSimulationCount
        })
      });
      
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Parameter exploration API response:', data);
      
      // Process data for each configured graph
      if (data.success && data.data && Array.isArray(data.data)) {
        const newGraphsData = graphConfigs.map(config => {
          if (config.type === "multi-line") {
            // For multi-line charts, transform the data using our utility
            const lineData = transformToMultiScenarioLineData(data.data, config.metric);
            return {
              ...config,
              data: lineData,
              dataType: "line" as const
            };
          } else {
            // For parameter-impact charts, transform to show impact of parameter value on final result
            const paramImpactData = transformToParameterImpactData(data.data, config.metric);
            
            return {
              ...config,
              data: paramImpactData,
              dataType: "impact" as const
            };
          }
        });
        
        setGraphsData(newGraphsData);
      }
    } catch (error) {
      console.error("Error running scenario exploration:", error);
      // Here we would typically show an error message to the user
    } finally {
      setIsRunningScenario(false);
    }
  };

  // Update parameter settings when changing the event series or parameter type
  const handleEventSeriesChange = (eventId: string) => {
    console.log('Event ID selected:', eventId);
    console.log('Available events:', eventSeries);
    
    setSelectedEventSeries(eventId);
    const event = eventSeries.find(e => e.id === eventId || e._id === eventId);
    
    console.log('Event selected:', event);
    console.log('Event type:', event?.eventType?.type);
    console.log('Has amount property:', !!event?.eventType?.amount);
    
    if (!event) return;
    
    // Store the selected event object in state
    setSelectedEvent(event);
    
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
      const duration = event.duration.year || event.duration.value;
      setParameterMin(Math.max(1, duration - 10));
      setParameterMax(duration + 10);
      setParameterStep(1);
    } else if (parameterType === "amount" && event.eventType.amount) {
      const amount = event.eventType.amount;
      console.log('Setting amount range based on:', amount);
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
    
    if (!selectedEvent) return;
    
    if (type === "startYear") {
      const startYear = selectedEvent.startYear.year;
      setParameterMin(startYear - 5);
      setParameterMax(startYear + 5);
      setParameterStep(1);
    } else if (type === "duration") {
      const duration = selectedEvent.duration.year || selectedEvent.duration.value;
      setParameterMin(Math.max(1, duration - 10));
      setParameterMax(duration + 10);
      setParameterStep(1);
    } else if (type === "amount" && selectedEvent.eventType.amount) {
      const amount = selectedEvent.eventType.amount;
      console.log('Setting amount range based on:', amount);
      setParameterMin(Math.max(1000, amount * 0.5));
      setParameterMax(amount * 1.5);
      setParameterStep(1000);
    } else if (type === "allocation" && isInvestmentEvent(selectedEvent)) {
      // For asset allocation, use a standard range of 0-100%
      setParameterMin(0);
      setParameterMax(100);
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

  return (
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
              <Select 
                value={selectedEventSeries} 
                onValueChange={(value) => {
                  console.log('Select onValueChange:', value);
                  handleEventSeriesChange(value);
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
                          key={`event-series-${eventId}-${index}`} 
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
                {selectedEvent?.description || ''}
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
                  <SelectItem key="start-year" value="startYear">Start Year</SelectItem>
                  <SelectItem key="duration" value="duration">Duration</SelectItem>
                  {/* Only show Amount option for income or expense events */}
                  {selectedEvent && selectedEvent.eventType && 
                   (selectedEvent.eventType.type === "income" || selectedEvent.eventType.type === "expense") && (
                    <SelectItem key="amount" value="amount">
                      Amount {selectedEvent.eventType.type === "income" ? "(Income)" : "(Expense)"}
                    </SelectItem>
                  )}
                  {/* Show Asset Allocation option for all investment events */}
                  {isInvestmentEvent(selectedEvent) && (
                    <SelectItem key="allocation" value="allocation">
                      Asset Allocation
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {parameterType === "allocation" && (
                <>
                  <p className="text-sm text-gray-400 mt-2">
                    Adjust the percentage allocation for your investments.
                  </p>
                  <p className="text-sm text-gray-400">
                    Higher values will allocate more to riskier assets.
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
                      <SelectItem key="multi-line" value="multi-line">Multi-line chart over time</SelectItem>
                      <SelectItem key="parameter-impact" value="parameter-impact">Parameter impact line chart</SelectItem>
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
                      <SelectItem key="success-probability" value="success-probability">Probability of Success</SelectItem>
                      <SelectItem key="total-investments" value="total-investments">Total Investments</SelectItem>
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
      
      {/* Display the configured graphs */}
      {graphsData.length > 0 && (
        <div className="space-y-8">
          <h2 className="text-2xl font-semibold text-white">Analysis Results</h2>
          
          {graphsData.map(graph => {
            if (graph.type === "multi-line" && graph.dataType === "line") {
              const title = graph.metric === "success-probability" 
                ? "Probability of Success Over Time"
                : "Total Investments Over Time";
                
              const description = graph.metric === "success-probability"
                ? `This chart shows how probability of success changes over time for different values of ${getParameterLabel(selectedEvent, parameterType).toLowerCase()}.`
                : `This chart shows how total investments change over time for different values of ${getParameterLabel(selectedEvent, parameterType).toLowerCase()}.`;
                
              return (
                <Card key={graph.id} className="text-white rounded-xl border border-[#7F56D9] shadow-lg bg-gray-900">
                  <CardContent className="p-4">
                    <h3 className="text-xl font-semibold mb-2">{title}</h3>
                    <p className="text-gray-300 mb-4">{description}</p>
                    
                    <MultiLineScenarioChart 
                      data={graph.data as ScenarioLineData[]}
                      parameterName={getParameterLabel(selectedEvent, parameterType)}
                      yLabel={graph.metric === "success-probability" ? "Probability of Success (%)" : "Total Investments ($)"}
                    />
                  </CardContent>
                </Card>
              );
            } else if (graph.type === "parameter-impact" && graph.dataType === "impact") {
              const title = graph.metric === "success-probability" 
                ? `Impact of ${getParameterLabel(selectedEvent, parameterType)} on Probability of Success`
                : `Impact of ${getParameterLabel(selectedEvent, parameterType)} on Final Investment Value`;
                
              const description = graph.metric === "success-probability"
                ? `This chart shows how different values of ${getParameterLabel(selectedEvent, parameterType).toLowerCase()} affect your probability of success.`
                : `This chart shows how different values of ${getParameterLabel(selectedEvent, parameterType).toLowerCase()} affect your final investment value.`;
                
              const yLabel = graph.metric === "success-probability"
                ? "Probability of Success (%)"
                : "Final Investment Value ($)";
                
              return (
                <Card key={graph.id} className="text-white rounded-xl border border-[#7F56D9] shadow-lg bg-gray-900">
                  <CardContent className="p-4">
                    <h3 className="text-xl font-semibold mb-2">{title}</h3>
                    <p className="text-gray-300 mb-4">{description}</p>
                    
                    <ParamVsResultChart 
                      data={graph.data as ParamVsResultPoint[]}
                      parameterName={getParameterLabel(selectedEvent, parameterType)}
                      yLabel={yLabel}
                    />
                  </CardContent>
                </Card>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
} 