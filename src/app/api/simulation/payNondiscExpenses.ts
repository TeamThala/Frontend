import { Event, ExpenseEvent, FixedYear } from "@/types/event";
import { Investment } from "@/types/investment";
import { getNumericRate } from "@/lib/taxData"
import { findCashInvestment } from "./updateIncomeEvents";
import { randomNormal } from "d3-random";
import { TaxData } from "@/lib/taxData";

export function payNondiscExpenses(curYearIncome: number, curYearSS: number, prevYearGains: number, year: number, expenseEvents: Event[], standardDeductions: number, married: boolean, state: string, currentInvestmentEvent: Event, expenseWithdrawalStrategy: Investment[], taxData: TaxData){
    console.log(`=== PAYING NON-DISCRETIONARY EXPENSES AND TAXES FOR ${year} ===`);
    let prevYearTaxes: number = 0;

    // Federal taxes
    const fedTaxBrackets = married ? taxData.taxBrackets['married-joint'] : taxData.taxBrackets.single;
    let fedTaxRate = 0;
    let finalUpperLimit = 0;
    let finalRate = 0;
    for (let i=0; i<fedTaxBrackets.length; i++){
        const bracket = fedTaxBrackets[i];
        const upperLimit = parseFloat(bracket.upto.substring(1).split(",").join("")); // Get rid of "$" and ","
        if (upperLimit !== null && curYearIncome <= upperLimit){
            fedTaxRate = getNumericRate(bracket.rate); // Get rid of "%"
            console.log(`Found federal tax rate of ${fedTaxRate} for income of ${curYearIncome}`);
            finalUpperLimit = upperLimit;
            finalRate = fedTaxRate;
            break;
        }
    }
    prevYearTaxes += fedTaxRate * (curYearIncome - standardDeductions + curYearSS * 0.85); // federal taxes
    console.log(`Federal taxes for ${year} are calculated to ${prevYearTaxes} {upperLimit: ${finalUpperLimit}, rate: ${finalRate}}`);
    // console.log(taxData.capitalGainsRates.zeroPercent[0].range);

    // State taxes
    if (!taxData.stateTaxData[state] || !taxData.stateTaxData[state].hasOwnProperty(year)) {
        console.log(`Error: Could not find state tax data for ${state} in ${year}`);
        return null;
    }
    const stateTaxBrackets = taxData.stateTaxData[state][year][married ? 'married_jointly_or_surviving_spouse' : 'single_or_married_separately'];
    
    let stateTaxAmount = 0;
    for(let i=0; i<stateTaxBrackets.length; i++){
        const bracket = stateTaxBrackets[i];
        const upperLimit = bracket.but_not_over;;
        if (upperLimit !== null && curYearIncome <= upperLimit){
            const ofExcessOver = bracket.of_excess_over === null ? bracket.over : bracket.of_excess_over;
            stateTaxAmount = bracket.base_tax + (curYearIncome - ofExcessOver) * bracket.rate / 100;
            console.log(`Found state tax rate for income of ${curYearIncome} {upperLimit: ${upperLimit}, rate: ${bracket.rate}, ofExcessOver: ${ofExcessOver}, over: ${bracket.over}, baseTax: ${bracket.base_tax}}`);
            break;
        }
    }
    prevYearTaxes += stateTaxAmount; // state taxes
    console.log(`State taxes for ${year} are calculated to ${stateTaxAmount}`);

    // TODO: Add capital gains taxes
    const capitalGainsRates = taxData.capitalGainsRates;
    let capitalGainsTaxAmount = 0;
    if (prevYearGains >= parseFloat(capitalGainsRates.zeroPercent[married ? 1:0].range.from) && prevYearGains < parseFloat(capitalGainsRates.zeroPercent[married ? 1:0].range.to)){
        capitalGainsTaxAmount = 0; // 0% rate
        console.log(`Using 0% tax for capital gains`)
    }
    else if (prevYearGains >= parseFloat(capitalGainsRates.fifteenPercent[married ? 1:0].range.from) && prevYearGains < parseFloat(capitalGainsRates.fifteenPercent[married ? 1:0].range.to)){
        capitalGainsTaxAmount = prevYearGains * 0.15; // 15% rate
        console.log(`Using 15% tax for capital gains`)
    }
    else if (prevYearGains >= parseFloat(capitalGainsRates.twentyPercent[married ? 1:0].range.from) && prevYearGains < parseFloat(capitalGainsRates.twentyPercent[married ? 1:0].range.to)){
        capitalGainsTaxAmount = prevYearGains * 0.2; // 20% rate
        console.log(`Using 20% tax for capital gains`)
    }
    prevYearTaxes += capitalGainsTaxAmount; // capital 
    console.log(`Capital gains taxes for ${year} are calculated to ${capitalGainsTaxAmount}`);
    let totalPayments = 0;
    for (let i=0; i<expenseEvents.length; i++){
        const event = expenseEvents[i];
        const eventType = event.eventType as ExpenseEvent;
        if (eventType.discretionary === false){
            const eventStartYear = event.startYear as FixedYear;
            const eventDuration = event.duration as FixedYear;
            const withinDuration = (year >= eventStartYear.year) && (year <= (eventStartYear.year + eventDuration.year)); // should be fixedYears
            if (withinDuration){
                console.log(`Adding Non-discretionary Expense ${event.name} with amount ${eventType.amount} to totalPayments (value before add: ${totalPayments})`);
                totalPayments += eventType.amount;
            }
        }
    }
    const cashInvestment = findCashInvestment(currentInvestmentEvent);
    if (cashInvestment === null){
        console.log(`Error: Could not find cash investment in ${currentInvestmentEvent.name}`);
        return null;
    }
    console.log(`Cash investment with value ${cashInvestment.value} is going to have ${totalPayments} withdrawn for totalPayments`);
    cashInvestment.value -= totalPayments;
    console.log(`Cash investment with value ${cashInvestment.value} is going to have ${prevYearTaxes} withdrawn for prevYearTaxes`);
    cashInvestment.value -= prevYearTaxes;

    // Withdraw until cash investment is 0
    let dCurYearGains = 0; // to return this change in curYearGains from withdrawing investments
    let dCurYearIncome = 0; // to return this change in curYearIncome from withdrawing investments (cap gains on pre-tax investments)
    for(let i=0; i<expenseWithdrawalStrategy.length; i++){
        const investment = expenseWithdrawalStrategy[i];
        if (cashInvestment.value >= 0){ // withdraw until cash is 0
            console.log(`Cash investment value is ${cashInvestment.value}, ending withdrawals...`);
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
            
            console.log(`Withdrew ${withdrawalAmount} from ${investment.id}, new value: ${investment.value}`);
            console.log(`Capital gains increase by ${dCurYearGains}`);
        }
    }

    if (cashInvestment.value < 0){
        console.log(`FAILED TO PAY OFF ALL NON-DISCRETIONARY EXPENSES`);
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
                        console.log(`Non-discretionary Expense Event ${event.name} annual change has rolled a value of ${iterValue} of type ${eventType.expectedAnnualChange.valueType}`);
                        if (eventType.expectedAnnualChange.valueType === "percentage"){
                            eventType.amount *= iterValue/100;
                        }
                        else{
                            eventType.amount += iterValue;
                        }
                    }
                    else if (eventType.expectedAnnualChange.type === "uniform"){
                        const uniform = Math.random() * (eventType.expectedAnnualChange.max - eventType.expectedAnnualChange.min) + eventType.expectedAnnualChange.min;
                        console.log(`Non-discretionary Expense Event ${event.name} annual change has rolled a value of ${uniform} of type ${eventType.expectedAnnualChange.valueType}`);
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