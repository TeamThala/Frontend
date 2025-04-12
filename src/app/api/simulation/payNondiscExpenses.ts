import { Event, ExpenseEvent, FixedYear } from "@/types/event";
import { Investment } from "@/types/investment";
import { getTaxData, getNumericRate } from "@/lib/taxData"
import { findCashInvestment } from "./updateIncomeEvents";

export function payNondiscExpenses(curYearIncome: number, curYearSS: number, year: number, expenseEvents: Event[], standardDeductions: number, married: boolean, state: string, currentInvestmentEvent: Event, expenseWithdrawalStrategy: Investment[]){
    let prevYearTaxes: number = 0;
    const taxData = getTaxData();
    const fedTaxBrackets = married ? taxData.taxBrackets['married-joint'] : taxData.taxBrackets.single;
    let fedTaxRate = 0;
    for (let i=0; i<fedTaxBrackets.length; i++){
        const bracket = fedTaxBrackets[i];
        const upperLimit = parseFloat(bracket.upto.substring(1).split(",").join("")); // Get rid of "$" and ","
        if (upperLimit !== null && curYearIncome <= upperLimit){
            fedTaxRate = getNumericRate(bracket.rate); // Get rid of "%"
            console.log(`Found federal tax rate of ${fedTaxRate} for income of ${curYearIncome}`);
            break;
        }
    }
    prevYearTaxes += fedTaxRate * (curYearIncome - standardDeductions + curYearSS * 0.85); // federal taxes
    // TODO: Add state taxes
    // TODO: Add capital gains taxes
    let totalPayments = 0;
    for (let i=0; i<expenseEvents.length; i++){
        const event = expenseEvents[i];
        const eventType = event.eventType as ExpenseEvent;
        if (eventType.discretionary === false){
            const eventStartYear = event.startYear as FixedYear;
            const eventDuration = event.duration as FixedYear;
            const withinDuration = (year >= eventStartYear.year) && (year <= (eventStartYear.year + eventDuration.year)); // should be fixedYears
            if (withinDuration){
                totalPayments += eventType.amount;
            }
        }
    }
    const cashInvestment = findCashInvestment(currentInvestmentEvent);
    if (cashInvestment === null){
        console.log(`Error: Could not find cash investment in ${currentInvestmentEvent.name}`);
        return null;
    }
    cashInvestment.value -= totalPayments;
    cashInvestment.value -= prevYearTaxes;

    // Withdraw until cash investment is 0
    let dCurYearGains = 0; // to return this change in curYearGains from withdrawing investments
    for(let i=0; i<expenseWithdrawalStrategy.length; i++){
        const investment = expenseWithdrawalStrategy[i];
        if (cashInvestment.value >= 0){ // withdraw until cash is 0
            console.log(`Cash investment value is ${cashInvestment.value}, ending withdrawals...`);
            break;
        }
        if (investment.value > 0){
            const withdrawalAmount = Math.min(investment.value, -1 * cashInvestment.value);
            const f = withdrawalAmount / investment.value; // fraction of investment value withdrawn
            dCurYearGains += f * (investment.value - investment.purchasePrice);
            investment.value -= withdrawalAmount;
            cashInvestment.value += withdrawalAmount;
            
            console.log(`Withdrew ${withdrawalAmount} from ${investment.id}, new value: ${investment.value}`);
            console.log(`Capital gains increase by ${dCurYearGains}`);
        }
    }

    if (cashInvestment.value < 0){
        console.log(`FAILED TO PAY OFF ALL NON-DISCRETIONARY EXPENSES`);
        return null;
    }

    return dCurYearGains;
}