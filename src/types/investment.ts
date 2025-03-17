import { FixedValues, NormalDistributionValues } from "./utils";

export interface Investment {
    id: string;
    value: number;
    investmentType: InvestmentType;
    taxStatus: "non-retirement" | "pre-tax" | "after-tax";
}

interface InvestmentType {
    id: string;
    name: string;
    description: string;
    expectedAnnualReturn: FixedValues | NormalDistributionValues;
    expenseRatio: number;
    expectedAnnualIncome: FixedValues | NormalDistributionValues;
    taxability: boolean;
}


