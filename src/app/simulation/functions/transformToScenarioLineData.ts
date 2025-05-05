import { YearlyResult } from "@/types/simulationResult";
import { ScenarioLineData } from "../sample-data/sampleData";

export function transformToScenarioLineData(
    simulationRuns: {
      simulationId: number;
      success: boolean;
      data: YearlyResult[];
    }[]
  ): ScenarioLineData[] {
    return simulationRuns
      .filter((sim) => sim.success && Array.isArray(sim.data))
      .map((sim) => {
        const points = sim.data.map((yearResult) => {
          const totalValue = yearResult.investments.reduce(
            (sum, inv) => sum + (inv?.value ?? 0),
            0
          );
          return {
            year: yearResult.year,
            value: Number(totalValue.toFixed(2)),
          };
        });
  
        return {
          parameterValue: sim.simulationId,
          points,
        };
      });
  }
  