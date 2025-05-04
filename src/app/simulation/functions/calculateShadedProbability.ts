import { SimulationResult, YearlyResult } from '@/types/simulationResult';
import { quantileSorted } from 'd3-array';

function extractQuantity(simYearData: YearlyResult, type: string): number {
    const eventSeries = simYearData.eventSeries ?? [];
  
    if (type === "totalInvestments") {
      return simYearData.investments.reduce((sum, inv) => sum + inv.value, 0);
    }
  
    if (type === "totalIncome") {
      return simYearData.curYearIncome;
    }
  
    if (type === "totalExpenses") {
      return eventSeries
        .filter(e => e.eventType.type === "expense")
        .reduce((sum, e) => {
          if (e.eventType.type === "expense") {
            return sum + (e.eventType as { amount: number }).amount;
          }
          return sum;
        }, 0);
    }
  
    if (type === "earlyWithdrawalTax") {
      return simYearData.curYearEarlyWithdrawals;
    }
  
    if (type === "discretionaryExpensePct") {
      const expenseEvents = eventSeries.filter(e => e.eventType.type === "expense");
      const discretionaryTotal = expenseEvents
        .filter(e => (e.eventType as { discretionary: boolean }).discretionary)
        .reduce((sum, e) => sum + (e.eventType as { amount: number }).amount, 0);
      const total = expenseEvents.reduce((sum, e) => sum + (e.eventType as { amount: number }).amount, 0);
      return total > 0 ? (discretionaryTotal / total) * 100 : 0;
    }
  
    return 0;
  }
  

export function transformToShadedChartData(
  simulations:  SimulationResult[],
  selectedQuantity: string
) {
  const yearMap: Map<number, number[]> = new Map();

  for (const sim of simulations) {
    for (const yearData of sim.data) {
      const year = yearData.year;
      const value = extractQuantity(yearData, selectedQuantity);
      if (!yearMap.has(year)) yearMap.set(year, []);
      yearMap.get(year)!.push(value);
    }
  }

  const result = Array.from(yearMap.entries()).map(([year, values]) => {
    const sorted = values.sort((a, b) => a - b);
    return {
      year,
      median: quantileSorted(sorted, 0.5)!,
      p10: quantileSorted(sorted, 0.1)!,
      p20: quantileSorted(sorted, 0.2)!,
      p30: quantileSorted(sorted, 0.3)!,
      p40: quantileSorted(sorted, 0.4)!,
      p60: quantileSorted(sorted, 0.6)!,
      p70: quantileSorted(sorted, 0.7)!,
      p80: quantileSorted(sorted, 0.8)!,
      p90: quantileSorted(sorted, 0.9)!
    };
  });

  return result.sort((a, b) => a.year - b.year);
}
