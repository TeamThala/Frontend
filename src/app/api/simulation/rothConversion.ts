import { TaxData } from "@/lib/taxData";
// import InvestmentType from "@/models/InvestmentType";
import { Investment } from "@/types/investment";

export function rothConversion(curYearIncome: number, curYearSS: number, taxData: TaxData, married: boolean, year: number, conversionStrategy: Investment[], investments: Investment[], log: string[]){
    log.push(`=== ROTH CONVERSION FOR ${year} ===`);
    const curYearFedTaxableIncome = curYearIncome - 0.15*curYearSS;
    log.push(`Current year fed taxable income is ${curYearFedTaxableIncome} {curYearIncome: ${curYearIncome}, curYearSS: ${curYearSS}}`);
    const fedTaxBrackets = taxData.taxBrackets[married ? 'married-joint' : 'single'];
    const standardDeduction = married ? taxData.standardDeductions.standardDeductions['Married filing jointly or Qualifying surviving spouse'] : taxData.standardDeductions.standardDeductions['Single or Married filing separately'];
    for (let i=0; i<fedTaxBrackets.length; i++){
        const bracket = fedTaxBrackets[i];
        const upperLimit = parseFloat(bracket.upto.substring(1).split(",").join("")); // Get rid of "$" and ","
        const lowerLimit = parseFloat(bracket.from.substring(1).split(",").join("")); // Get rid of "$" and ","
        if (upperLimit !== null && curYearFedTaxableIncome <= upperLimit && curYearFedTaxableIncome > lowerLimit){
            log.push(`Found federal tax upper limit of ${upperLimit} for income of ${curYearFedTaxableIncome}`);
            let rc = upperLimit - (curYearFedTaxableIncome - standardDeduction)
            log.push(`Roth conversion remaining amount is ${rc} {upperLimit: ${upperLimit}, curYearFedTaxableIncome: ${curYearFedTaxableIncome}, standardDeduction: ${standardDeduction}}`);
            const rcOriginal = rc;
            // var transferAmnt = 0;
            for (let j=0; j<conversionStrategy.length; j++){
                if (rc <= 0){
                    log.push(`Completed Roth Conversion for ${year}`);
                    return rcOriginal;
                }
                const investment = conversionStrategy[j];
                const targetInvestment = investments.find(i => i.investmentType.id === investment.investmentType.id && i.taxStatus === "after-tax")
                if (!targetInvestment){
                    log.push(`Error: Could not find investment ${investment.investmentType.name} in ${year}`);
                    return null;
                }
                
                const transferAmnt = Math.min(investment.value, rc);
                investment.value -= transferAmnt;
                targetInvestment.value += transferAmnt;
                rc -= transferAmnt;
                log.push(`Transferred ${transferAmnt} from ${investment.investmentType.name} to ${targetInvestment.investmentType.name}`);
                log.push(`Updated values: {transferAmnt: ${transferAmnt}, investment.value: ${investment.value}, targetInvestment.value: ${targetInvestment.value}}`);
            }
            log.push(`Ran out of events in Roth conversion strategy to convert for ${year}`);
            return rcOriginal - rc;
        }
        return 0;
    }
}