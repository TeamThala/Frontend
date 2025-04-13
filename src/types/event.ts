import { Investment } from "./investment";
import { FixedValues, NormalDistributionValues, UniformDistributionValues } from "./utils";

export interface Event {
    id: string;
    name: string;
    description?: string;
    startYear: FixedYear | UniformYear | NormalYear | EventYear;
    duration: FixedYear | UniformYear | NormalYear;
    eventType: IncomeEvent | ExpenseEvent | InvestmentEvent | RebalanceEvent;
}

export interface FixedYear {
    type: "fixed";
    year: number;
}

export interface UniformYear {
    type: "uniform";
    year: UniformDistributionValues;
}

export interface NormalYear {
    type: "normal";
    year: NormalDistributionValues;
}

export interface EventYear {
    type: "event";
    eventTime: "start" | "end";
    eventId: string;
}

export interface IncomeEvent {
    type: "income";
    amount: number;
    inflationAdjustment: boolean;
    socialSecurity: boolean;
    wage: boolean;
    expectedAnnualChange: FixedValues | NormalDistributionValues | UniformDistributionValues;
    percentageOfIncome?: number;
}

export interface ExpenseEvent {
    discretionary: boolean;
    type: "expense";
    amount: number;
    inflationAdjustment: boolean;
    expectedAnnualChange: FixedValues | NormalDistributionValues | UniformDistributionValues;
    percentageOfIncome?: number;
}

export interface InvestmentEvent {
    type: "investment";
    // amount: number;
    inflationAdjustment: boolean;
    // targetAsset: string; // What is this for?
    assetAllocation: AssetAllocationFixed | AssetAllocationGlidePath;
    maxCash: number;
}

export interface RebalanceEvent {
    type: "rebalance";
    portfolioDistribution: AssetAllocationFixed | AssetAllocationGlidePath;
}

export interface AssetAllocationFixed {
    type: "fixed";
    investments: Investment[] | null;
    percentages: number[];
}

export interface AssetAllocationGlidePath {
    type: "glidePath";
    investments: Investment[] | null;
    initialPercentages: number[];
    finalPercentages: number[];
}


