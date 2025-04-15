import { Event, InvestmentEvent } from "@/types/event";
import { randomNormal } from "d3-random";

export function updateInvestmentEvent(investmentEvent: Event){
    let dCurYearIncome: number = 0;

    console.log(`=== UPDATING INVESTMENT EVENT ${investmentEvent.name} ===`);
    const investmentEventType = investmentEvent.eventType as InvestmentEvent;
    const assetAllocation = investmentEventType.assetAllocation;
    if (assetAllocation.investments === null){
        console.log(`Error: Could not find investments in asset allocation in ${investmentEvent.name}`);
        return null;
    }
    for (let i = 0; i < assetAllocation.investments.length; i++){
        const investment = assetAllocation.investments[i];
        const startValue = investment.value;
        console.log(`Investment ${investment.id} has a starting value of ${startValue}`);
        
        // Handle expected income
        if (investment.investmentType.expectedAnnualIncome !== null){ // TODO: CHECK IF THIS IS ALWAYS AMOUNT
            if (investment.investmentType.expectedAnnualIncome.type === "fixed"){
                investment.value += investment.investmentType.expectedAnnualIncome.value;
                if (investment.taxStatus === "pre-tax"){
                    dCurYearIncome += investment.investmentType.expectedAnnualIncome.value;
                    console.log(`Investment ${investment.id} has a fixed expected income of ${investment.investmentType.expectedAnnualIncome.value}`);
                    console.log(`Current year income has been incremented by ${dCurYearIncome}`);
                }
                
            }
            else { // normal distribution
                if (investment.investmentType.expectedAnnualIncome.type === "normal") {
                    const normal = randomNormal(investment.investmentType.expectedAnnualIncome.mean, investment.investmentType.expectedAnnualIncome.stdDev);
                    const iterValue = normal();
                    console.log(`Investment ${investment.id} annual income has rolled a value of ${iterValue}`);
                    investment.value += iterValue;
                    if (investment.taxStatus === "pre-tax"){
                        dCurYearIncome += iterValue;
                        console.log(`Current year income has been updated: ${dCurYearIncome}`);
                    }
                }
            }
        }
        else {
            console.log(`Error: Investment ${investment.id} has no expected annual income`);
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
                console.log(`Investment ${investment.id} has a fixed expected return of ${investment.investmentType.expectedAnnualReturn.value} of type ${investment.investmentType.expectedAnnualReturn.valueType}`);
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
                    console.log(`Investment ${investment.id} annual return has rolled a value of ${iterValue}`);
                }
            }
        }
        else {
            console.log(`Error: Investment ${investment.id} has no expected annual return`);
            return null;
        }

        // Handle investment expense
        if (investment.investmentType.expenseRatio !== null){
            const expense = ((investment.value + startValue)/2) * investment.investmentType.expenseRatio;
            investment.value -= expense;
            console.log(`Investment ${investment.id} has an expense of ${expense}. Final value: ${investment.value}`);
        }
        else {
            console.log(`Error: Investment ${investment.id} has no expense ratio`);
            return null;
        }

        // if (assetAllocation.type === "fixed"){

        // }
        // else {

        // }
    }

    return dCurYearIncome;
}