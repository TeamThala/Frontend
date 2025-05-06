import { YearlyResult } from "@/types/simulationResult";
import { ParamVsResultPoint } from "../sample-data/sampleData";

interface ParameterExplorationResult {
  parameterValue: number;
  simulations: {
    simulationId: number;
    success: boolean;
    data: YearlyResult[];
  }[];
}

/**
 * Transforms parameter exploration results into a format suitable for the ParamVsResultChart
 * showing how a parameter value impacts either success probability or final investment value
 * 
 * @param parameterExplorationResults The results from the parameter exploration API
 * @param metric The metric to calculate ('success-probability' or 'total-investments')
 * @returns Data formatted for ParamVsResultChart
 */
export function transformToParameterImpactData(
  parameterExplorationResults: ParameterExplorationResult[],
  metric: "success-probability" | "total-investments" = "success-probability"
): ParamVsResultPoint[] {
  return parameterExplorationResults.map(result => {
    const { parameterValue, simulations } = result;
    
    if (metric === "success-probability") {
      // Count successful simulations
      const successCount = simulations.filter(sim => sim.success).length;
      const totalCount = simulations.length;
      // Calculate success percentage
      const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;
      
      return {
        parameterValue,
        finalResult: Number(successRate.toFixed(2))
      };
    } else {
      // Calculate median final investment value
      const finalInvestmentValues = simulations.map(sim => {
        // Get the last year's data
        const lastYearData = sim.data && sim.data.length > 0 
          ? sim.data[sim.data.length - 1] 
          : null;
          
        if (!lastYearData || !lastYearData.investments) return 0;
        
        // Sum all investments
        return lastYearData.investments.reduce(
          (sum, inv) => sum + (inv?.value || 0), 
          0
        );
      }).filter(value => value > 0); // Filter out zeros or null values
      
      // Calculate median if we have values
      let medianValue = 0;
      if (finalInvestmentValues.length > 0) {
        // Sort values for median calculation
        const sortedValues = [...finalInvestmentValues].sort((a, b) => a - b);
        const midIndex = Math.floor(sortedValues.length / 2);
        
        // Calculate median
        medianValue = sortedValues.length % 2 === 0
          ? (sortedValues[midIndex - 1] + sortedValues[midIndex]) / 2
          : sortedValues[midIndex];
      }
      
      return {
        parameterValue,
        finalResult: Number(medianValue.toFixed(2))
      };
    }
  });
} 