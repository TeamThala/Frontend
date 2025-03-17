export interface FixedValues {
    type: "fixed";
    valueType: "amount" | "percentage";
    value: number;
}

export interface NormalDistributionValues {
    type: "normal";
    valueType: "amount" | "percentage";
    mean: number;
    stdDev: number;
}

export interface UniformDistributionValues {
    type: "uniform";
    valueType: "amount" | "percentage";
    min: number;
    max: number;
}

