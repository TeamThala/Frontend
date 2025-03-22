import { Investment } from "./investment";
import { User } from "./user";
import { FixedValues, NormalDistributionValues, UniformDistributionValues } from "./utils";

export type Scenario = SingleScenario | CoupleScenario;

export interface BaseScenario {
    id: string;
    name: string;
    description: string;
    financialGoal: number;
    investments: Investment[];
    eventSeries: Event[];
    spendingStrategy: Event[]; // * Assume this is sorted and only contains discretionary expenses
    expenseWithdrawalStrategy: Event[]; // * Assume this is sorted and only contains Investment Events
    inflationRate: FixedValues | NormalDistributionValues | UniformDistributionValues;
    RothConversionStrategy: Investment[]; // Todo: Add Roth Conversion Strategy
    RMDStrategy: Investment[]; // Todo: Add RMD Strategy
    rothConversion: WithRothConversion | WithoutRothConversion;
    residenceState: string
    owner: User;
    ownerBirthYear: number;
    ownerLifeExpectancy: FixedValues | NormalDistributionValues;
    viewPermissions: User[];
    editPermissions: User[];
    updatedAt: Date;
}

export interface RothConversion {
    id: string;
    startYear: number;
    endYear: number;
    investmentOrder: Investment[];
    maxTaxBracket: number;// Todo: Add max tax bracket can be optional if we are fetching from Tax Brackets
}


export type LifeExpectancy = FixedValues | NormalDistributionValues;

// Scenario where there is only one user
export interface SingleScenario extends BaseScenario {
    type: "single";
}

// Scenario where there is a couple (user + spouse)
export interface CoupleScenario extends BaseScenario {
    type: "couple";
    spouseBirthYear: number;
    spouseLifeExpectancy: FixedValues | NormalDistributionValues;
}

export interface RMD {
    id: string;
    startAge: number;
    investmentOrder: Investment[];
    percentage: FixedValues | NormalDistributionValues | UniformDistributionValues;
}

interface WithRothConversion {
    rothConversion: true;
    RothConversionStartYear: number;
    RothConversionEndYear: number;
}

interface WithoutRothConversion {
    rothConversion: false;
    RothConversionStartYear?: never;
    RothConversionEndYear?: never;
    RothConversionStrategy?: never;
}