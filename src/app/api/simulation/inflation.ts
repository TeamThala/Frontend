// import { FixedValues, NormalDistributionValues, UniformDistributionValues } from "@/types/utils";
// import { randomNormal } from "d3-random";

// export function getInflationRate(inflationRate: FixedValues | NormalDistributionValues | UniformDistributionValues){
//     if (inflationRate.type === "fixed"){
//         return inflationRate.value;
//     }
//     else if (inflationRate.type === "normal"){
//         const normal = randomNormal(inflationRate.mean, inflationRate.stdDev);
//         return normal();
//     }
//     else {
//         const uniform = Math.random() * (inflationRate.max - inflationRate.min) + inflationRate.min;
//         return uniform;
//     }
// }

// export function updateTaxBrackets(taxBrackets: any, inflationRate: number){
//     // MATH CURRENTLY ASSUMES INFLATION INCREASES ARE VALUES > 1
//     // (IF NOT, CHANGE TRUEINFLATION TO 1 + INFLATIONRATE)
//     const trueInflation = inflationRate;

//     taxBrackets.federal.incomeBrackets.lower *= trueInflation;
//     taxBrackets.federal.incomeBrackets.upper *= trueInflation;
//     taxBrackets.federal.incomeBrackets.rate *= trueInflation;

//     taxBrackets.state.incomeBrackets.lower *= trueInflation;
//     taxBrackets.state.incomeBrackets.upper *= trueInflation;
//     taxBrackets.state.incomeBrackets.rate *= trueInflation;

//     return taxBrackets;
// }