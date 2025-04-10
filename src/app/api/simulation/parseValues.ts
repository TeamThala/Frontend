import { FixedValues, NormalDistributionValues, UniformDistributionValues } from "@/types/utils";

enum ValueType {
    Amount = "amount",
    Percentage = "percentage",
}

export function parseFixedValue(valueType: string, value: number): FixedValues | null {
    if (valueType !== ValueType.Amount && valueType !== ValueType.Percentage) {
        console.log("Error: Invalid valueType.");
        return null;
    }
    return {
        type: "fixed",
        valueType: valueType,
        value: value,
    };
}

export function parseNormalDistribution(valueType: string, mean: number, stdDev: number): NormalDistributionValues | null {
    if (valueType !== ValueType.Amount && valueType !== ValueType.Percentage) {
        console.log("Error: Invalid valueType.");
        return null;
    }
    return {
        type: "normal",
        valueType: valueType,
        mean: mean,
        stdDev: stdDev,
    };
}

export function parseUniformDistribution(valueType: string, min: number, max: number): UniformDistributionValues | null {
    if (valueType !== ValueType.Amount && valueType !== ValueType.Percentage) {
        console.log("Error: Invalid valueType.");
        return null;
    }
    return {
        type: "uniform",
        valueType: valueType,
        min: min,
        max: max,
    };
}