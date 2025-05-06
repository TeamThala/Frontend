import { Event, ExpenseEvent, FixedYear } from "@/types/event";
import { Investment } from "@/types/investment";
import { getNumericRate } from "@/lib/taxData"
import { findCashInvestment } from "./updateIncomeEvents";
import { randomNormal } from "d3-random";
import { TaxData } from "@/lib/taxData";

export function payNondiscExpenses(curYearIncome: number, curYearSS: number, prevYearGains: number, prevYearEarlyWithdrawals: number, year: number, expenseEvents: Event[], standardDeductions: number, married: boolean, state: string, expenseWithdrawalStrategy: Investment[], taxData: TaxData, age: number, investments: Investment[], log: string[]){
    log.push(`=== PAYING NON-DISCRETIONARY EXPENSES AND TAXES FOR ${year} ===`);
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
            log.push(`Found federal tax rate of ${fedTaxRate} for income of ${curYearIncome}`);
            finalUpperLimit = upperLimit;
            finalRate = fedTaxRate;
            break;
        }
    }
    prevYearTaxes += fedTaxRate * (curYearIncome - standardDeductions + curYearSS * 0.85); // federal taxes
    log.push(`Federal taxes for ${year} are calculated to ${prevYearTaxes} {upperLimit: ${finalUpperLimit}, rate: ${finalRate}}`);
    // log.push(taxData.capitalGainsRates.zeroPercent[0].range);

    // State taxes
    if (!taxData.stateTaxData[state] || !taxData.stateTaxData[state].hasOwnProperty(year)) {
        log.push(`Error: Could not find state tax data for ${state} in ${year}`);
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
            log.push(`Found state tax rate for income of ${curYearIncome} {upperLimit: ${upperLimit}, rate: ${bracket.rate}, ofExcessOver: ${ofExcessOver}, over: ${bracket.over}, baseTax: ${bracket.base_tax}}`);
            break;
        }
    }
    prevYearTaxes += stateTaxAmount; // state taxes
    log.push(`State taxes for ${year} are calculated to ${stateTaxAmount} (state: ${state}, year: ${year}, income: ${curYearIncome}, SS: ${curYearSS})`);

    // Add capital gains taxes
    const capitalGainsRates = taxData.capitalGainsRates;
    let capitalGainsTaxAmount = 0;
    if (prevYearGains >= parseFloat(capitalGainsRates.zeroPercent[married ? 1:0].range.from) && prevYearGains < parseFloat(capitalGainsRates.zeroPercent[married ? 1:0].range.to)){
        capitalGainsTaxAmount = 0; // 0% rate
        log.push(`Using 0% tax for capital gains`)
    }
    else if (prevYearGains >= parseFloat(capitalGainsRates.fifteenPercent[married ? 1:0].range.from) && prevYearGains < parseFloat(capitalGainsRates.fifteenPercent[married ? 1:0].range.to)){
        capitalGainsTaxAmount = prevYearGains * 0.15; // 15% rate
        log.push(`Using 15% tax for capital gains`)
    }
    else if (prevYearGains >= parseFloat(capitalGainsRates.twentyPercent[married ? 1:0].range.from) && prevYearGains < parseFloat(capitalGainsRates.twentyPercent[married ? 1:0].range.to)){
        capitalGainsTaxAmount = prevYearGains * 0.2; // 20% rate
        log.push(`Using 20% tax for capital gains`)
    }
    prevYearTaxes += capitalGainsTaxAmount; // capital 
    log.push(`Capital gains taxes for ${year} are calculated to ${capitalGainsTaxAmount} (prev year gains: ${prevYearGains})`);

    // Add early withdrawal tax
    prevYearTaxes += prevYearEarlyWithdrawals * 0.1; // 10% penalty for early withdrawal
    log.push(`Early withdrawal taxes for ${year} are calculated to ${prevYearEarlyWithdrawals * 0.1} (prev year early withdrawals: ${prevYearEarlyWithdrawals})`);

    // Calculate total nondiscretionary expenses
    let totalPayments = 0;
    for (let i=0; i<expenseEvents.length; i++){
        const event = expenseEvents[i];
        const eventType = event.eventType as ExpenseEvent;
        if (eventType.discretionary === false){
            const eventStartYear = event.startYear as FixedYear;
            const eventDuration = event.duration as FixedYear;
            const withinDuration = (year >= eventStartYear.year) && (year <= (eventStartYear.year + eventDuration.year)); // should be fixedYears
            if (withinDuration){
                log.push(`Adding Non-discretionary Expense ${event.name} with amount ${eventType.amount} to totalPayments (value before add: ${totalPayments})`);
                totalPayments += eventType.amount;
            }
        }
    }
    const cashInvestment = findCashInvestment(investments, log);
    if (cashInvestment === null){
        log.push(`Error: Could not find cash investment in scenario's investments`);
        return null;
    }
    // log.push(`Cash investment with value ${cashInvestment.value} is going to have ${totalPayments} withdrawn for totalPayments`);
    // cashInvestment.value -= totalPayments;
    // log.push(`Cash investment with value ${cashInvestment.value} is going to have ${prevYearTaxes} withdrawn for prevYearTaxes`);
    // cashInvestment.value -= prevYearTaxes;

    // Withdraw until cash investment is 0
    let dCurYearGains = 0; // to return this change in curYearGains from withdrawing investments
    let dCurYearIncome = 0; // to return this change in curYearIncome from withdrawing investments (cap gains on pre-tax investments)
    let dCurYearEarlyWithdrawals = 0;

    for(let i=0; i<expenseWithdrawalStrategy.length; i++){
        const investment = expenseWithdrawalStrategy[i];
        if (totalPayments <= 0 && prevYearTaxes <= 0){
            log.push(`All non-discretionary expenses and taxes have been paid off`);
            break;
        }

        if (cashInvestment.value >= 0){ // withdraw until cash is 0
            log.push(`Cash investment value is ${cashInvestment.value}. Paying with cash instead.`);
            const amountToWithdraw = Math.min(totalPayments + prevYearTaxes, cashInvestment.value);
            log.push(`Withdrawing ${amountToWithdraw} from cash investment`);
            cashInvestment.value -= amountToWithdraw;
            totalPayments -= Math.min(totalPayments, amountToWithdraw);
            prevYearTaxes -= Math.max(0, amountToWithdraw - totalPayments);
            if (totalPayments <= 0 && prevYearTaxes <= 0){
                log.push(`All non-discretionary expenses and taxes have been paid off`);
                break;
            }
        }

        if (investment.value > 0){ // withdraw from investment in investment withdrawal strategy
            const withdrawalAmount = Math.min(investment.value, totalPayments + prevYearTaxes);
            const f = withdrawalAmount / investment.value; // fraction of investment value withdrawn
            if (investment.taxStatus === "pre-tax"){
                dCurYearIncome += f * (investment.value - (investment.purchasePrice || 0)); // capital gains on pre-tax investments
            }
            else if (investment.taxStatus === "non-retirement"){
                dCurYearGains += f * (investment.value - (investment.purchasePrice || 0));
            }

            if (age < 59 && (investment.taxStatus === "pre-tax" || investment.taxStatus === "after-tax")){ 
                dCurYearEarlyWithdrawals += withdrawalAmount;
                log.push(`PENALTY: Withdrew ${withdrawalAmount} from ${investment.id} with early withdrawal penalty`);
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

    return {dCurYearGains, dCurYearIncome, dCurYearEarlyWithdrawals};
}