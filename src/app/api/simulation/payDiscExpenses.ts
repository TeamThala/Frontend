import { Event, ExpenseEvent, FixedYear } from "@/types/event";
import { Investment } from "@/types/investment";
import { findCashInvestment } from "./updateIncomeEvents";
import { randomNormal } from "d3-random";

export function payDiscExpenses(year: number, expenseEvents: Event[], currentInvestmentEvent: Event, expenseWithdrawalStrategy: Investment[], financialGoal: number, investments: Investment[], log: string[]){
    // Calculate net worth
    let netWorth = 0;
    for (let i=0; i<investments.length; i++){
        const investment = investments[i];
        if (investment.value > 0){
            netWorth += investment.value;
        }
    }
    log.push(`Temporary net worth for payDiscExpenses is ${netWorth}`);
    log.push(`=== PAYING DISCRETIONARY EXPENSES FOR ${year} ===`);
    let totalPayments = 0;
    for (let i=0; i<expenseEvents.length; i++){
        const event = expenseEvents[i];
        const eventType = event.eventType as ExpenseEvent;
        if (eventType.discretionary === true){
            const eventStartYear = event.startYear as FixedYear;
            const eventDuration = event.duration as FixedYear;
            const withinDuration = (year >= eventStartYear.year) && (year <= (eventStartYear.year + eventDuration.year)); // should be fixedYears
            netWorth -= eventType.amount; // deduct from net worth
            if (withinDuration && netWorth > financialGoal){
                log.push(`Adding Non-discretionary Expense ${event.name} with amount ${eventType.amount} to totalPayments (value before add: ${totalPayments})`);
                totalPayments += eventType.amount;
            }
        }
    }
    log.push(`Total payments for discretionary expenses is ${totalPayments}`);
    log.push(`Net worth after discretionary expenses is ${netWorth}`);
    const cashInvestment = findCashInvestment(currentInvestmentEvent, log);
    if (cashInvestment === null){
        log.push(`Error: Could not find cash investment in ${currentInvestmentEvent.name}`);
        return null;
    }
    log.push(`Cash investment with value ${cashInvestment.value} is going to have ${totalPayments} withdrawn for totalPayments`);
    cashInvestment.value -= totalPayments;

    // Withdraw until cash investment is 0
    let dCurYearGains = 0; // to return this change in curYearGains from withdrawing investments
    let dCurYearIncome = 0; // to return this change in curYearIncome from withdrawing investments (cap gains on pre-tax investments)
    for(let i=0; i<expenseWithdrawalStrategy.length; i++){
        const investment = expenseWithdrawalStrategy[i];
        if (cashInvestment.value >= 0){ // withdraw until cash is 0
            log.push(`Cash investment value is ${cashInvestment.value}, ending withdrawals...`);
            break;
        }
        if (investment.value > 0){
            const withdrawalAmount = Math.min(investment.value, -1 * cashInvestment.value);
            const f = withdrawalAmount / investment.value; // fraction of investment value withdrawn
            if (investment.taxStatus === "pre-tax"){
                dCurYearIncome += f * (investment.value - (investment.purchasePrice || 0)); // capital gains on pre-tax investments
            }
            else if (investment.taxStatus === "non-retirement"){
                dCurYearGains += f * (investment.value - (investment.purchasePrice || 0));
            }
            // after-tax does not have taxes on capital gains
            investment.value -= withdrawalAmount;
            cashInvestment.value += withdrawalAmount;
            
            log.push(`Withdrew ${withdrawalAmount} from ${investment.id}, new value: ${investment.value}`);
            log.push(`Capital gains increase by ${dCurYearGains}`);
        }
    }

    if (cashInvestment.value < 0){
        log.push(`FAILED TO PAY OFF ALL NON-DISCRETIONARY EXPENSES`);
        return null;
    }

    // Update non-discretionary expense events
    for(let i=0; i<expenseEvents.length; i++){
        const event = expenseEvents[i];
        const eventType = event.eventType as ExpenseEvent;
        if (eventType.discretionary === false){
            const eventStartYear = event.startYear as FixedYear;
            const eventDuration = event.duration as FixedYear;
            const withinDuration = (year >= eventStartYear.year) && (year <= (eventStartYear.year + eventDuration.year)); // should be fixedYears
            if (withinDuration){
                if (eventType.inflationAdjustment){
                    if (eventType.expectedAnnualChange.type === "normal"){
                        const normal = randomNormal(eventType.expectedAnnualChange.mean, eventType.expectedAnnualChange.stdDev);
                        const iterValue = normal();
                        log.push(`Non-discretionary Expense Event ${event.name} annual change has rolled a value of ${iterValue} of type ${eventType.expectedAnnualChange.valueType}`);
                        if (eventType.expectedAnnualChange.valueType === "percentage"){
                            eventType.amount *= iterValue/100;
                        }
                        else{
                            eventType.amount += iterValue;
                        }
                    }
                    else if (eventType.expectedAnnualChange.type === "uniform"){
                        const uniform = Math.random() * (eventType.expectedAnnualChange.max - eventType.expectedAnnualChange.min) + eventType.expectedAnnualChange.min;
                        log.push(`Non-discretionary Expense Event ${event.name} annual change has rolled a value of ${uniform} of type ${eventType.expectedAnnualChange.valueType}`);
                        if (eventType.expectedAnnualChange.valueType === "percentage"){
                            eventType.amount *= uniform/100;
                        }
                        else{
                            eventType.amount += uniform;
                        }
                    }
                    else {
                        if (eventType.expectedAnnualChange.valueType === "percentage"){
                            eventType.amount *= eventType.expectedAnnualChange.value/100;
                        }
                        else{
                            eventType.amount += eventType.expectedAnnualChange.value;
                        }
                    }
                }
            }
        }
    }

    return {dCurYearGains, dCurYearIncome};
}