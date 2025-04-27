import { Investment } from "./investment";
import { User } from "./user";
import { FixedValues, NormalDistributionValues, UniformDistributionValues } from "./utils";
import { Event } from "./event";

export type Scenario = SingleScenario | CoupleScenario;

// Event is the most specific version (in event vs. investmentEvent vs. investment)

export interface BaseScenario {
    _id?: string;
    id: string;
    name: string;
    description: string;
    financialGoal: number;
    investments: Investment[];
    eventSeries: Event[]; // all events in the scenario
    spendingStrategy: Event[]; // * Assume this is sorted and only contains discretionary expense events
    expenseWithdrawalStrategy: Investment[]; // * Assume this is sorted and only contains Investment Events
    inflationRate: FixedValues | NormalDistributionValues | UniformDistributionValues;
    RothConversionStrategy: Investment[]; // Todo: Add Roth Conversion Strategy
    RMDStrategy: Investment[]; // Array of investments in order of distribution
    rothConversion: WithRothConversion | null;
    residenceState: string
    owner: User;
    ownerBirthYear: number;
    ownerLifeExpectancy: FixedValues | NormalDistributionValues;
    viewPermissions: User[];
    editPermissions: User[];
    updatedAt: Date;
    contributionsLimit: number;
    customStateTaxYaml?: string; // Added optional field for custom state tax YAML
}

export interface RothConversion {
    id: string;
    startYear: number;
    endYear: number;
    investmentOrder: Investment[];
    maxTaxBracket: number;// TODO: Add max tax bracket can be optional if we are fetching from Tax Brackets
}


export type LifeExpectancy = FixedValues | NormalDistributionValues;

// Scenario where there is only one user
export interface SingleScenario extends BaseScenario {
    type: "individual";
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

// interface WithoutRothConversion {
//     rothConversion: false;
//     RothConversionStartYear?: never;
//     RothConversionEndYear?: never;
//     RothConversionStrategy?: never;
// }