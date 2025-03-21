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
    RothConversionStrategy: RothConversion[]; // Todo: Add Roth Conversion Strategy
    RMDStrategy: RMD[]; // Todo: Add RMD Strategy
    rothConversion: WithRothConversion | WithoutRothConversion;
    residenceState: string
    owner: User;
    viewPermissions: User[];
    editPermissions: User[];
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
    userBirthYear: number;
    userLifeExpectancy: LifeExpectancy;
}

// Scenario where there is a couple (user + spouse)
export interface CoupleScenario extends BaseScenario {
    type: "couple";
    userBirthYear: number;
    userLifeExpectancy: LifeExpectancy;
    spouseBirthYear: number;
    spouseLifeExpectancy: LifeExpectancy;
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