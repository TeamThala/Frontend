import { YearlyResult } from "@/types/simulationResult";

interface TwoDimensionalExplorationResult {
  parameter1Value: number;
  parameter2Value: number;
  simulations: {
    simulationId: number;
    success: boolean;
    data: YearlyResult[];
  }[];
}

export interface SurfacePlotDataPoint {
  x: number;
  y: number;
  z: number;
}

/**
 * Transforms two-dimensional parameter exploration results into a format suitable for surface plots
 * showing how two parameter values impact either success probability or final investment value
 * 
 * @param twoDimensionalResults The results from the two-dimensional parameter exploration API
 * @param metric The metric to calculate ('success-probability' or 'total-investments')
 * @returns Data formatted for SurfacePlot component
 */
export function transformToTwoDimensionalData(
  twoDimensionalResults: TwoDimensionalExplorationResult[],
  metric: "success-probability" | "total-investments" = "success-probability"
): SurfacePlotDataPoint[] {
  return twoDimensionalResults.map(result => {
    const { parameter1Value, parameter2Value, simulations } = result;
    
    if (metric === "success-probability") {
      // Count successful simulations
      const successCount = simulations.filter(sim => sim.success).length;
      const totalCount = simulations.length;
      // Calculate success percentage
      const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;
      
      return {
        x: parameter1Value,
        y: parameter2Value,
        z: Number(successRate.toFixed(2))
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
        x: parameter1Value,
        y: parameter2Value,
        z: Number(medianValue.toFixed(2))
      };
    }
  });
} 