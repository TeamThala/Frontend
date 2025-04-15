import { FixedValues, NormalDistributionValues, UniformDistributionValues } from "./utils";

export interface Investment {
    id: string;
    _id?: string;
    value: number;
    investmentType: InvestmentType;
    taxStatus: "non-retirement" | "pre-tax" | "after-tax";
    purchasePrice: number;
}

export interface InvestmentType {
    id: string;
    _id?: string;
    name: string;
    description: string;
    expectedAnnualReturn: FixedValues | NormalDistributionValues | UniformDistributionValues | null;
    expenseRatio: number;
    expectedAnnualIncome: FixedValues | NormalDistributionValues | UniformDistributionValues | null;
    taxability: boolean;
}


