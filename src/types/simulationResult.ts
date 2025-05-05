import { Investment } from "./investment";
import { Event } from "./event";

export interface SimulationResult {
    success: boolean;
    data: YearlyResult[];
}

export interface YearlyResult {
    year: number;
    investments: Investment[];
    inflation: number;
    eventSeries: Event[];
    curYearIncome: number;
    curYearEarlyWithdrawals: number;
    curYearSS: number;
    curYearGains: number;
}