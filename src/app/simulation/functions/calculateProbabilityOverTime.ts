import { SimulationResult } from "@/types/simulationResult";

export function calculateSuccessProbability(simulations: SimulationResult[]): { year: number; successRate: number }[] {
    const yearCounts: Map<number, number> = new Map();
    const totalSimulations = simulations.length;
  
    for (const sim of simulations) {
      const years = sim.data.map(entry => entry.year);
      const limit = sim.success ? years.length : years.length - 1; // exclude last year for failed runs
  
      for (let i = 0; i < limit; i++) {
        const year = years[i];
        yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
      }
    }
  
    // Convert to successRate for each year
    return Array.from(yearCounts.entries())
      .map(([year, count]) => ({
        year,
        successRate: (count / totalSimulations) * 100
      }))
      .sort((a, b) => a.year - b.year);
  }
  