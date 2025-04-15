"use client";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import MultiLineScenarioChart from "./MultiLineScenarioChart";
import ParamVsResultChart from "./ParamVsResultChart";
import ShadedProbabilityChart from "./ShadedProbabilityChart";
import StackedBarChart from "./StackedBarChart";

export interface ScenarioParameter {
  id: string;
  name: string;
  description?: string;
  minValue: number;
  maxValue: number;
  stepSize: number;
  unit: string;
  defaultValue: number;
}

export interface ExplorationResult {
  parameterValue: number;
  resultSummary: {
    successProbability: number;
    medianPortfolioValue: number;
    averagePortfolioValue: number;
  };
  detailedData: {
    probPoints: { year: number; value: number }[];
    shadedData: {
      year: number;
      p10: number;
      p20: number;
      p30: number;
      p40: number;
      median: number;
      p60: number;
      p70: number;
      p80: number;
      p90: number;
    }[];
    investmentBreakdown: any[]; // Structure as needed by StackedBarChart
  };
}

export default function ScenarioExplorer({
  initialParameters,
  onRunSimulation,
  chartTypes = ["multiLine", "paramVsResult", "shaded", "stacked"],
}: {
  initialParameters: ScenarioParameter[];
  onRunSimulation?: (paramValues: Record<string, number>) => Promise<any>;
  chartTypes?: ("multiLine" | "paramVsResult" | "shaded" | "stacked")[];
}) {
  const [parameters, setParameters] = useState<ScenarioParameter[]>(initialParameters);
  const [selectedParameter, setSelectedParameter] = useState<string>(initialParameters[0]?.id || "");
  const [parameterValues, setParameterValues] = useState<Record<string, number>>({});
  const [results, setResults] = useState<ExplorationResult[]>([]);
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [selectedResult, setSelectedResult] = useState<ExplorationResult | null>(null);
  const [isExploring, setIsExploring] = useState<boolean>(false);
  const [activeChartType, setActiveChartType] = useState<string>(chartTypes[0] || "multiLine");

  // Initialize parameter values
  useEffect(() => {
    const initialVals: Record<string, number> = {};
    parameters.forEach(param => {
      initialVals[param.id] = param.defaultValue;
    });
    setParameterValues(initialVals);
    if (selectedParameter) {
      const param = parameters.find(p => p.id === selectedParameter);
      if (param) setSelectedValue(param.defaultValue);
    }
  }, [parameters, selectedParameter]);

  useEffect(() => {
    if (selectedValue !== null) {
      const result = results.find(r => r.parameterValue === selectedValue);
      setSelectedResult(result || null);
    }
  }, [selectedValue, results]);

  const handleParameterChange = (paramId: string) => {
    setSelectedParameter(paramId);
    const param = parameters.find(p => p.id === paramId);
    if (param) setSelectedValue(parameterValues[paramId] || param.defaultValue);
  };

  const handleValueChange = (value: number[]) => {
    if (selectedParameter && value.length > 0) {
      setSelectedValue(value[0]);
      setParameterValues(prev => ({ ...prev, [selectedParameter]: value[0] }));
    }
  };

  // Helper to generate mock detailed data for charts
  const generateMockDetailedData = (paramValue: number, parameter: ScenarioParameter) => {
    const normalized = (paramValue - parameter.minValue) / (parameter.maxValue - parameter.minValue);
    const years = Array.from({ length: 11 }, (_, i) => 2025 + i);

    const probPoints = years.map(year => {
      const yearOffset = (year - 2025) / 10;
      const base = 65 + normalized * 20;
      const growth = yearOffset * (15 + normalized * 10);
      return { year, value: Math.min(99, Math.round(base + growth)) };
    });

    const shadedData = years.map(year => {
      const baseValue = 1000000 + normalized * 500000;
      const factor = 1 + ((year - 2025) * 0.05);
      const median = baseValue * factor;
      return {
        year,
        p10: Math.round(median * 0.7),
        p20: Math.round(median * 0.8),
        p30: Math.round(median * 0.9),
        p40: Math.round(median * 0.95),
        median: Math.round(median),
        p60: Math.round(median * 1.05),
        p70: Math.round(median * 1.1),
        p80: Math.round(median * 1.2),
        p90: Math.round(median * 1.3),
      };
    });

    const investmentBreakdown = years.slice(0, 5).map(year => {
      const baseRoth = 200000 + ((year - 2025) * 20000) + normalized * 50000;
      const base401k = 300000 + ((year - 2025) * 30000) + normalized * 60000;
      const baseBrokerage = 150000 + ((year - 2025) * 25000) + normalized * 40000;
      return {
        year,
        median: [
          { id: "inv-1", value: Math.round(baseRoth), investmentType: { name: "Roth IRA" }, taxStatus: "after-tax" },
          { id: "inv-2", value: Math.round(base401k), investmentType: { name: "401k" }, taxStatus: "pre-tax" },
          { id: "inv-3", value: Math.round(baseBrokerage), investmentType: { name: "Brokerage" }, taxStatus: "non-retirement" },
        ],
        average: [
          { id: "inv-1", value: Math.round(baseRoth * 1.05), investmentType: { name: "Roth IRA" }, taxStatus: "after-tax" },
          { id: "inv-2", value: Math.round(base401k * 1.05), investmentType: { name: "401k" }, taxStatus: "pre-tax" },
          { id: "inv-3", value: Math.round(baseBrokerage * 1.05), investmentType: { name: "Brokerage" }, taxStatus: "non-retirement" },
        ],
      };
    });

    return { probPoints, shadedData, investmentBreakdown };
  };

  const runExploration = async () => {
    setIsExploring(true);
    try {
      const param = parameters.find(p => p.id === selectedParameter);
      if (!param) return;
      const valuesToExplore: number[] = [];
      for (let v = param.minValue; v <= param.maxValue; v += param.stepSize) {
        valuesToExplore.push(Number(v.toFixed(2)));
      }
      const explorationResults: ExplorationResult[] = [];

      for (const value of valuesToExplore) {
        let simResult: any = {};
        if (onRunSimulation) {
          simResult = await onRunSimulation({ ...parameterValues, [selectedParameter]: value });
        }
        // Use the detailedData from the simulation if provided; otherwise, generate mock data.
        const detailedData = simResult.detailedData && simResult.detailedData.probPoints
          ? simResult.detailedData
          : generateMockDetailedData(value, param);
        explorationResults.push({
          parameterValue: value,
          resultSummary: {
            successProbability: simResult.probability ||
              Math.round(70 + ((value - param.minValue) / (param.maxValue - param.minValue)) * 25),
            medianPortfolioValue: simResult.medianValue ||
              (1000000 + ((value - param.minValue) / (param.maxValue - param.minValue)) * 500000),
            averagePortfolioValue: simResult.averageValue ||
              (1050000 + ((value - param.minValue) / (param.maxValue - param.minValue)) * 500000),
          },
          detailedData,
        });
      }
      setResults(explorationResults);
      if (explorationResults.length > 0) {
        setSelectedValue(explorationResults[0].parameterValue);
        setSelectedResult(explorationResults[0]);
      }
    } catch (error) {
      console.error("Error in runExploration:", error);
    } finally {
      setIsExploring(false);
    }
  };

  const currentParam = parameters.find(p => p.id === selectedParameter);

  return (
    <div className="space-y-6">
      <Card className="text-white rounded-xl border border-[#7F56D9] shadow-lg"
        style={{ background: 'linear-gradient(to bottom right, #4E4E4E -40%, #333333 10%, #141313 30%, #000000 50%, #4E4E4E 150%)' }}>
        <CardHeader>
          <CardTitle className="text-lg">One-Dimensional Scenario Exploration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Parameter Selection */}
            <div>
              <label className="block text-sm mb-2">Select Parameter to Explore</label>
              <Select value={selectedParameter} onValueChange={handleParameterChange}>
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Select parameter" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {parameters.map(param => (
                    <SelectItem key={param.id} value={param.id}>{param.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentParam?.description && (
                <p className="mt-2 text-sm text-gray-400">{currentParam.description}</p>
              )}
            </div>
            {/* Parameter Value Selection */}
            <div>
              <label className="block text-sm mb-2">
                {currentParam?.name} Value: {selectedValue !== null ? selectedValue : '--'} {currentParam?.unit}
              </label>
              <div className="flex space-x-2 items-center">
                <span className="text-xs text-gray-400">{currentParam?.minValue}</span>
                <Slider
                  value={selectedValue !== null ? [selectedValue] : [currentParam?.defaultValue || 0]}
                  min={currentParam?.minValue || 0}
                  max={currentParam?.maxValue || 100}
                  step={currentParam?.stepSize || 1}
                  onValueChange={handleValueChange}
                  className="flex-1"
                />
                <span className="text-xs text-gray-400">{currentParam?.maxValue}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <Button
              onClick={runExploration}
              disabled={isExploring}
              className="bg-[#7F56D9] text-white hover:bg-[#6941C6]"
            >
              {isExploring ? "Exploring..." : "Run Exploration"}
            </Button>
          </div>

          {selectedResult && (
            <div className="mt-6 border border-gray-700 rounded-lg p-4 bg-gray-900 bg-opacity-50">
              <h3 className="text-md font-medium mb-2">
                Results Summary for {currentParam?.name}: {selectedResult.parameterValue} {currentParam?.unit}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-800 rounded-lg">
                  <div className="text-[#7F56D9] text-2xl font-bold">{selectedResult.resultSummary.successProbability}%</div>
                  <div className="text-sm text-gray-400">Success Probability</div>
                </div>
                <div className="text-center p-3 bg-gray-800 rounded-lg">
                  <div className="text-[#FF4690] text-2xl font-bold">${selectedResult.resultSummary.medianPortfolioValue.toLocaleString()}</div>
                  <div className="text-sm text-gray-400">Median Portfolio Value</div>
                </div>
                <div className="text-center p-3 bg-gray-800 rounded-lg">
                  <div className="text-[#6366F1] text-2xl font-bold">${selectedResult.resultSummary.averagePortfolioValue.toLocaleString()}</div>
                  <div className="text-sm text-gray-400">Average Portfolio Value</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedResult && (
        <>
          {/* Chart Type Buttons */}
          <div className="flex flex-wrap gap-2 justify-center">
            {chartTypes.includes("multiLine") && (
              <Button
                onClick={() => setActiveChartType("multiLine")}
                className={activeChartType === "multiLine" ? "bg-[#7F56D9]" : "bg-gray-800"}
              >
                Success Probability
              </Button>
            )}
            {chartTypes.includes("paramVsResult") && (
              <Button
                onClick={() => setActiveChartType("paramVsResult")}
                className={activeChartType === "paramVsResult" ? "bg-[#7F56D9]" : "bg-gray-800"}
              >
                Parameter Impact
              </Button>
            )}
            {chartTypes.includes("shaded") && (
              <Button
                onClick={() => setActiveChartType("shaded")}
                className={activeChartType === "shaded" ? "bg-[#7F56D9]" : "bg-gray-800"}
              >
                Value Distribution
              </Button>
            )}
            {chartTypes.includes("stacked") && (
              <Button
                onClick={() => setActiveChartType("stacked")}
                className={activeChartType === "stacked" ? "bg-[#7F56D9]" : "bg-gray-800"}
              >
                Investment Breakdown
              </Button>
            )}
          </div>

          {/* Chart Display Section */}
          <div className="mt-4">
            {activeChartType === "multiLine" && (
              <MultiLineScenarioChart
                data={[
                  {
                    parameterValue: selectedResult.parameterValue,
                    points: selectedResult.detailedData.probPoints,
                  },
                ]}
                parameterName={currentParam?.name || "Parameter"}
              />
            )}
            {activeChartType === "paramVsResult" && results.length > 0 && (
              <ParamVsResultChart
                data={results.map(r => ({
                  parameterValue: r.parameterValue,
                  finalResult: r.resultSummary.successProbability,
                }))}
                parameterName={currentParam?.name || "Parameter"}
                yLabel="Success Probability (%)"
              />
            )}
            {activeChartType === "shaded" && (
              <ShadedProbabilityChart
                data={selectedResult.detailedData.shadedData}
                financialGoal={1000000}
              />
            )}
            {activeChartType === "stacked" && (
              <StackedBarChart data={selectedResult.detailedData.investmentBreakdown} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
