import { Investment } from "./investment";
import { FixedValues, NormalDistributionValues } from "./utils";

export interface Event {
    id: string;
    name: string;
    description?: string;
    startYear: FixedYear | UniformYear | NormalYear | EventYear;
    duration: FixedYear | UniformYear | NormalYear;
    eventType: IncomeEvent | ExpenseEvent | InvestmentEvent | RebalanceEvent;
}

interface FixedYear {
    type: "fixed";
    year: number;
}

interface UniformYear {
    type: "uniform";
    startYear: number;
    endYear: number;
}

interface NormalYear {
    type: "normal";
    mean: number;
    stdDev: number;
}

interface EventYear {
    type: "event";
    eventTime: "start" | "end";
    event: Event;
}

interface IncomeEvent {
    type: "income";
    amount: number;
    expectedAnnualChange: FixedValues | NormalDistributionValues;
    inflationAdjustment: boolean;
    percentageOfIncome?: number;
    socialSecurity: boolean;
}

export interface ExpenseEvent {
    type: "expense";
    amount: number;
    expectedAnnualChange: FixedValues | NormalDistributionValues;
    inflationAdjustment: boolean;
    percentageOfIncome?: number;
    discretionary: boolean;
}

export interface InvestmentEvent {
    type: "investment";
    assetAllocation: (AssetAllocationFixed | AssetAllocationGlidePath)[];
    maximumCash: number;
}

interface RebalanceEvent {
    type: "rebalance";
    assetAllocation: (AssetAllocationFixed | AssetAllocationGlidePath)[];
}

interface AssetAllocationFixed {
    type: "fixed";
    investment: Investment;
    percentage: number;
}


interface AssetAllocationGlidePath {
    type: "glidePath";
    investment: Investment;
    initialPercentage: number;
    finalPercentage: number;
}


