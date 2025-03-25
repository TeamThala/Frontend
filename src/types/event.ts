import { Investment } from "./investment";
import { NormalDistributionValues, UniformDistributionValues } from "./utils";

export interface Event {
    id: string;
    name: string;
    description?: string;
    startYear: string;
    duration: number;
    durationType: 'years' | 'months' | 'weeks' | 'days';
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
    amount: number;
    inflationAdjustment: boolean;
    socialSecurity: boolean;
    wage: boolean;
}

export interface ExpenseEvent {
    type: "expense";
    amount: number;
    inflationAdjustment: boolean;
}

export interface InvestmentEvent {
    type: "investment";
    amount: number;
    targetAsset: string;
}

export interface RebalanceEvent {
    type: "rebalance";
    portfolioDistribution: string;
}

export interface AssetAllocationFixed {
    type: "fixed";
    investment: Investment;
    percentages: number[];
}

export interface AssetAllocationGlidePath {
    type: "glidePath";
    investment: Investment;
    initialPercentages: number[];
    finalPercentages: number[];
}


