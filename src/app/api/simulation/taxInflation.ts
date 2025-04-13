import { TaxData } from "@/lib/taxData";

export function updateTaxBrackets(taxData: TaxData, inflation: number){
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
}