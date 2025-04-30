import { Event, InvestmentEvent } from "@/types/event";
import { randomNormal } from "d3-random";

export function updateInvestmentEvent(investmentEvent: Event, log: string[]){
    let dCurYearIncome: number = 0;

    log.push(`=== UPDATING INVESTMENT EVENT ${investmentEvent.name} ===`);
    const investmentEventType = investmentEvent.eventType as InvestmentEvent;
    const assetAllocation = investmentEventType.assetAllocation;
    if (assetAllocation.investments === null){
        log.push(`Error: Could not find investments in asset allocation in ${investmentEvent.name}`);
        return null;
    }
    for (let i = 0; i < assetAllocation.investments.length; i++){
        const investment = assetAllocation.investments[i];
        const startValue = investment.value;
        log.push(`Investment ${investment.id} has a starting value of ${startValue}`);
        
        // Handle expected income
        if (investment.investmentType.expectedAnnualIncome !== null){ // TODO: CHECK IF THIS IS ALWAYS AMOUNT
            if (investment.investmentType.expectedAnnualIncome.type === "fixed"){
                investment.value += investment.investmentType.expectedAnnualIncome.value;
                if (investment.taxStatus === "non-retirement" && investment.investmentType.taxability === true){
                    dCurYearIncome += investment.investmentType.expectedAnnualIncome.value;
                    log.push(`Investment ${investment.id} has a fixed expected income of ${investment.investmentType.expectedAnnualIncome.value}`);
                    log.push(`Current year income has been incremented by ${dCurYearIncome}`);
                }
                
            }
            else { // normal distribution
                if (investment.investmentType.expectedAnnualIncome.type === "normal") {
                    const normal = randomNormal(investment.investmentType.expectedAnnualIncome.mean, investment.investmentType.expectedAnnualIncome.stdDev);
                    const iterValue = normal();
                    log.push(`Investment ${investment.id} annual income has rolled a value of ${iterValue}`);
                    investment.value += iterValue;
                    if (investment.taxStatus === "non-retirement" && investment.investmentType.taxability === true){
                        dCurYearIncome += iterValue;
                        log.push(`Current year income has been updated: ${dCurYearIncome}`);
                    }
                }
            }
        }
        else {
            log.push(`Error: Investment ${investment.id} has no expected annual income`);
            return null;
        }

        // Handle expected return
        if (investment.investmentType.expectedAnnualReturn !== null){
            if (investment.investmentType.expectedAnnualReturn.type === "fixed"){
                if (investment.investmentType.expectedAnnualReturn.valueType === "percentage"){
                    investment.value *= investment.investmentType.expectedAnnualReturn.value/100;
                }
                else{
                    investment.value += investment.investmentType.expectedAnnualReturn.value;
                }
                log.push(`Investment ${investment.id} has a fixed expected return of ${investment.investmentType.expectedAnnualReturn.value} of type ${investment.investmentType.expectedAnnualReturn.valueType}`);
            }
            else { // normal distribution
                if (investment.investmentType.expectedAnnualReturn.type === "normal") {
                    const normal = randomNormal(investment.investmentType.expectedAnnualReturn.mean, investment.investmentType.expectedAnnualReturn.stdDev);
                    const iterValue = normal();
                    if (investment.investmentType.expectedAnnualReturn.valueType === "percentage"){
                        investment.value *= iterValue/100;
                    }
                    else{
                        investment.value += iterValue;
                    }
                    log.push(`Investment ${investment.id} annual return has rolled a value of ${iterValue}`);
                }
            }
        }
        else {
            log.push(`Error: Investment ${investment.id} has no expected annual return`);
            return null;
        }

        // Handle investment expense
        if (investment.investmentType.expenseRatio !== null){
            const expense = ((investment.value + startValue)/2) * investment.investmentType.expenseRatio;
            investment.value -= expense;
            log.push(`Investment ${investment.id} has an expense of ${expense}. Final value: ${investment.value}`);
        }
        else {
            log.push(`Error: Investment ${investment.id} has no expense ratio`);
            return null;
        }

        // if (assetAllocation.type === "fixed"){

        // }
        // else {

        // }
    }

    return dCurYearIncome;
}