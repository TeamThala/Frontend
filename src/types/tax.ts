// // tax.ts
// export interface FederalTaxBracket {
//     lowerBound: number;
//     upperBound: number;
//     rate: number;
// }

// export interface StateTaxBracket {
//     lowerBound: number;
//     upperBound: number;
//     rate: number;
// }

// export interface FederalTaxData {
//     year: number;
//     incomeBrackets: FederalTaxBracket[];
//     standardDeductions: {
//         single: number;
//         married: number;
//         headOfHousehold: number;
//     };
//     capitalGainsRates: {
//         lowerBound: number;
//         upperBound: number;
//         rate: number;
//     }[];
// }

// export interface StateTaxData {
//     state: string;
//     year: number;
//     incomeBrackets: StateTaxBracket[];
// }

// export interface TaxDatabase {
//     federal: { [year: number]: FederalTaxData };
//     state: { [state: string]: { [year: number]: StateTaxData } };
// }
