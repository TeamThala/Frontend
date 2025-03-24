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
    event: Event;
}

export interface IncomeEvent {
    type: "income";
    initialAmount: number;
    amount: number;
    expectedAnnualChange: FixedValues | NormalDistributionValues | UniformDistributionValues;
    inflationAdjustment: boolean;
    percentageOfIncome?: number;
    socialSecurity: boolean;
    wage: boolean;
}

export interface ExpenseEvent {
    type: "expense";
    initialAmount: number;
    amount: number;
    expectedAnnualChange: FixedValues | NormalDistributionValues | UniformDistributionValues;
    inflationAdjustment: boolean;
    percentageOfIncome?: number;
    discretionary: boolean;
}

export interface InvestmentEvent {
    type: "investment";
    assetAllocation: AssetAllocationFixed | AssetAllocationGlidePath;
    maximumCash: number;
    investments: Investment[];
}

export interface RebalanceEvent {
    type: "rebalance";
    assetAllocation: AssetAllocationFixed | AssetAllocationGlidePath;
}

interface AssetAllocationFixed {
    type: "fixed";
    investment: Investment;
    percentages: number[];
}


interface AssetAllocationGlidePath {
    type: "glidePath";
    investment: Investment;
    initialPercentages: number[];
    finalPercentages: number[];
}


