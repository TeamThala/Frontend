import { FixedValues, NormalDistributionValues, UniformDistributionValues } from "@/types/utils";

enum ValueType {
    Amount = "amount",
    Percentage = "percentage",
}

export function parseFixedValue(valueType: string, value: number, log: string[]): FixedValues | null {
    if (valueType !== ValueType.Amount && valueType !== ValueType.Percentage) {
        log.push("Error: Invalid valueType.");
        return null;
    }
    return {
        type: "fixed",
        valueType: valueType,
        value: value,
    };
}

export function parseNormalDistribution(valueType: string, mean: number, stdDev: number, log: string[]): NormalDistributionValues | null {
    if (valueType !== ValueType.Amount && valueType !== ValueType.Percentage) {
        log.push("Error: Invalid valueType.");
        return null;
    }
    return {
        type: "normal",
        valueType: valueType,
        mean: mean,
        stdDev: stdDev,
    };
}

export function parseUniformDistribution(valueType: string, min: number, max: number, log: string[]): UniformDistributionValues | null {
    if (valueType !== ValueType.Amount && valueType !== ValueType.Percentage) {
        log.push("Error: Invalid valueType.");
        return null;
    }
    return {
        type: "uniform",
        valueType: valueType,
        min: min,
        max: max,
    };
}