import { SimulationResult } from "@/types/simulationResult";
import { Event, IncomeEvent, ExpenseEvent } from "@/types/event";

type TaxStatus = "pre-tax" | "after-tax" | "non-retirement";

interface BarSegment {
  id: string;
  name?: string;
  value: number;
  taxStatus?: TaxStatus;
}

interface StackedBarChartEntry {
  year: number;
  median: BarSegment[];
  average: BarSegment[];
}

export function transformToStackedBarChartData(
  simulations: SimulationResult[],
  type: "investments" | "income" | "expenses"
): StackedBarChartEntry[] {
  const yearToSegmentsMap = new Map<number, Record<string, BarSegment[]>>();

  for (const sim of simulations) {
    for (const yearData of sim.data) {
      const year = yearData.year;
      if (!yearToSegmentsMap.has(year)) {
        yearToSegmentsMap.set(year, {});
      }

      const segmentMap = yearToSegmentsMap.get(year)!;

      let segments: BarSegment[] = [];

      if (type === "investments") {
        segments = yearData.investments.map((inv) => ({
          id: inv.id,
          name: inv.investmentType.name,
          value: inv.value,
          taxStatus: inv.taxStatus,
        }));
      } else if (type === "income") {
        segments = yearData.eventSeries
          .filter((e): e is Event & { eventType: IncomeEvent } => e.eventType.type === "income")
          .map((e) => ({
            id: e.id,
            name: e.name,
            value: e.eventType.amount,
          }));
      } else if (type === "expenses") {
        segments = yearData.eventSeries
          .filter((e): e is Event & { eventType: ExpenseEvent } => e.eventType.type === "expense")
          .map((e) => ({
            id: e.id,
            name: e.name,
            value: e.eventType.amount,
          }));
      }

      for (const seg of segments) {
        if (!segmentMap[seg.id]) segmentMap[seg.id] = [];
        segmentMap[seg.id].push(seg);
      }
    }
  }

  const entries: StackedBarChartEntry[] = [];

  for (const [year, segmentGroups] of yearToSegmentsMap.entries()) {
    const medianSegments: BarSegment[] = [];
    const averageSegments: BarSegment[] = [];

    for (const segId in segmentGroups) {
      const values = segmentGroups[segId];
      const valueList = values.map((v) => v.value).sort((a, b) => a - b);
      const median =
        valueList.length % 2 === 1
          ? valueList[Math.floor(valueList.length / 2)]
          : (valueList[valueList.length / 2 - 1] + valueList[valueList.length / 2]) / 2;
      const avg = valueList.reduce((a, b) => a + b, 0) / valueList.length;

      // Use name and taxStatus from the first occurrence
      const { name, taxStatus } = values[0];

      medianSegments.push({
        id: segId,
        name,
        value: median,
        taxStatus,
      });

      averageSegments.push({
        id: segId,
        name,
        value: avg,
        taxStatus,
      });
    }

    entries.push({
      year,
      median: medianSegments,
      average: averageSegments,
    });
  }

  // Sort by year before returning
  return entries.sort((a, b) => a.year - b.year);
}
