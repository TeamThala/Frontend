import { TaxData } from "@/lib/taxData";

export function updateTaxBrackets(taxData: TaxData, inflation: number){
    // Update fed tax brackets
    for (let i=0; i<taxData.taxBrackets.single.length; i++){
        const bracket = taxData.taxBrackets.single[i];
        const upperLimit = parseFloat(bracket.upto.substring(1).split(",").join("")); // Get rid of "$" and ","
        const lowerLimit = parseFloat(bracket.from.substring(1).split(",").join("")); // Get rid of "$" and ","
        taxData.taxBrackets.single[i].upto = '$' + (upperLimit * inflation);
        taxData.taxBrackets.single[i].from = '$' + (lowerLimit * inflation);
        // console.log(`Bracket ${i}: ${lowerLimit} - ${upperLimit} at ${rate}`);
    }
    for (let i=0; i<taxData.taxBrackets['married-joint'].length; i++){
        const bracket = taxData.taxBrackets['married-joint'][i];
        const upperLimit = parseFloat(bracket.upto.substring(1).split(",").join("")); // Get rid of "$" and ","
        const lowerLimit = parseFloat(bracket.from.substring(1).split(",").join("")); // Get rid of "$" and ","
        taxData.taxBrackets['married-joint'][i].upto = '$' + (upperLimit * inflation);
        taxData.taxBrackets['married-joint'][i].from = '$' + (lowerLimit * inflation);
    }

    // Update state tax brackets
    for (const state in taxData.stateTaxData) {
        const stateData = taxData.stateTaxData[state];
        const years = Object.keys(stateData).map(Number).sort((a, b) => a - b);
        const lastYear = years[years.length - 1];
        const yearData = stateData[lastYear];
        stateData[lastYear + 1] = JSON.parse(JSON.stringify(yearData)); // Clone last year's data
        for (const filingStatus in stateData[lastYear + 1]) {
            const brackets = stateData[lastYear + 1][filingStatus]; // Create next year's brackets
            for (let i = 0; i < brackets.length; i++) {
            const bracket = brackets[i];
            if (bracket.but_not_over !== null) {
                bracket.but_not_over *= inflation;
            }
            if (bracket.of_excess_over !== null) {
                bracket.of_excess_over *= inflation;
            }
            if (bracket.over !== null) {
                bracket.over *= inflation;
            }
            bracket.base_tax = bracket.base_tax * inflation;
            }
        }
    }

    // Update capital gains rates
    // const capitalGainsRates = taxData.capitalGainsRates;
    // for (let i=0; i<capitalGainsRates['zeroPercent'])
    //    capitalGainsRates['zeroPercent']['threshold'] = '$' + (parseFloat(capitalGainsRates['zeroPercent']['threshold'].substring(1).split(",").join("")) * inflation);
}