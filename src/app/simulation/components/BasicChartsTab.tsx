"use client";
import { useState } from "react";
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
import { ParamVsResultPoint } from "@/app/simulation/sample-data/sampleData";
import { transformToShadedChartData } from "../functions/calculateShadedProbability";
import { SimulationResult } from "@/types/simulationResult";
import { ShadedDataPoint } from "./ShadedProbabilityChart";
import { transformToStackedBarChartData } from "../functions/transformToStackedBarChartData";
import { transformToScenarioLineData } from "../functions/transformToScenarioLineData";

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

interface BasicChartsTabProps {
  scenarioId: string;
}

export default function BasicChartsTab({ scenarioId }: BasicChartsTabProps) {
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

  // Simulation function: Call the API endpoint with scenarioId instead of filepath
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
      // Call the simulation API endpoint with scenarioId
      const response = await fetch('/api/simulation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenarioId,
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

  return (
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
  );
} 