import { YearlyResult } from "@/types/simulationResult";
import { ScenarioLineData } from "../components/MultiLineScenarioChart";
import { calculateSuccessProbability } from "./calculateProbabilityOverTime";

interface ParameterExplorationResult {
  parameterValue: number;
  simulations: {
    simulationId: number;
    success: boolean;
    data: YearlyResult[];
  }[];
}

export function transformToMultiScenarioLineData(
  parameterExplorationResults: ParameterExplorationResult[],
  metric: "success-probability" | "total-investments" = "success-probability"
): ScenarioLineData[] {
  return parameterExplorationResults.map((result) => {
    // Based on metric type, use different calculation method
    if (metric === "success-probability") {
      // For success probability, use calculateSuccessProbability
      const probabilityData = calculateSuccessProbability(result.simulations);
      
      // Map to required format
      const points = probabilityData.map(item => ({
        year: item.year,
        value: Number(item.successRate.toFixed(2))
      }));
      
      return {
        parameterValue: result.parameterValue,
        points
      };
    } else {
      // For total investments, calculate average investment values for each year
      const yearPoints = new Map<number, { total: number; count: number }>();
      
      // For each simulation, collect yearly investment values
      result.simulations.forEach(sim => {
        if (sim.data && Array.isArray(sim.data)) {
          sim.data.forEach(yearData => {
            const year = yearData.year;
            // Calculate total investments for this year
            const totalInvestments = yearData.investments ? 
              yearData.investments.reduce((sum, inv) => sum + (inv?.value || 0), 0) : 0;
            
            // Store for averaging
            const existing = yearPoints.get(year) || { total: 0, count: 0 };
            yearPoints.set(year, {
              total: existing.total + totalInvestments,
              count: existing.count + 1
            });
          });
        }
      });
      
      // Convert to average points
      const points = Array.from(yearPoints.entries())
        .map(([year, { total, count }]) => ({
          year,
          value: Number((total / count).toFixed(2)),
        }))
        .sort((a, b) => a.year - b.year);
      
      return {
        parameterValue: result.parameterValue,
        points
      };
    }
  });
}
