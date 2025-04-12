import { FixedValues, NormalDistributionValues } from "./utils";

export interface Investment {
    id: string;
    value: number;
    investmentType: InvestmentType;
    taxStatus: "non-retirement" | "pre-tax" | "after-tax";
    purchasePrice: number;
}

export interface InvestmentType {
    id: string;
    name: string;
    description: string;
    expectedAnnualReturn: FixedValues | NormalDistributionValues | null;
    expenseRatio: number;
    expectedAnnualIncome: FixedValues | NormalDistributionValues | null;
    taxability: boolean;
}


