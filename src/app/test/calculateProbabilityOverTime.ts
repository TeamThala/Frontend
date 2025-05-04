import { SimulationResult } from "@/types/simulationResult";

export function calculateSuccessProbability(simulations: SimulationResult[]): { year: number; successRate: number }[] {
    const yearCounts: Map<number, number> = new Map();
  
    for (const sim of simulations) {
      for (const entry of sim.data) {
        const year = entry.year;
        yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
      }
    }
  
    const totalSimulations = simulations.length;
  
    // Convert to percentage of simulations that reached each year
    return Array.from(yearCounts.entries())
      .map(([year, count]) => ({
        year,
        successRate: (count / totalSimulations) * 100
      }))
      .sort((a, b) => a.year - b.year);
  }
  