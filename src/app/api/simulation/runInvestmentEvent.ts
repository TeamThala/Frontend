import { Event, InvestmentEvent } from "@/types/event";
import { Investment } from "@/types/investment";
import { findCashInvestment } from "./updateIncomeEvents";
import { FixedYear } from "@/types/event";

export function runInvestmentEvent(e: Event, l: number, simStartYear: number, year: number, log: string[]){ // e = currentInvestmentEvent, l = contributionsLimit
    log.push(`=== RUNNING INVESTMENT EVENT ${e.name} ===`);
    const eType = e.eventType as InvestmentEvent;
    if (eType.assetAllocation.investments === null){
        log.push(`Error: Could not find investments in asset allocation in ${e.name}`);
        return null;
    }
    const investments: Investment[] = eType.assetAllocation.investments;

    log.push(`Investments: ${investments}`);

    let b = 0; // sum of amount to buy in after tax accounts
    let cashCounter = 0; // countdown of excess cash to be invested

    // Compute amount each investment needs to increase to reach allocation
    const investmentValues: number[] = [];
    let investmentNetValue = 0; // collect sum of all investment values
    for (let i=0; i<investments.length; i++){
        const investment = investments[i];
        if (investment === undefined || investment === null){
            log.push(`Error: Investment ${i} is undefined or null`);
            return null;
        }
        investmentValues.push(investment.value);
        investmentNetValue += investment.value;
        if (investment.taxStatus === "after-tax"){
            b += investment.value; // sum of amount to buy in after tax accounts
        }
    }
    log.push(`Collected a b value of ${b} from after tax accounts`);
    log.push(`Collected a net value of ${investmentNetValue} from all investments`);
    const cashInvestment = findCashInvestment(e, log);
    if (cashInvestment === null){
        log.push(`Error: Could not find cash investment in ${e.name}`);
        return null;
    }

    log.push(`Cash investment found in ${e.name}: ${cashInvestment}`);
    const excessCash = Math.max(cashInvestment.value - eType.maxCash, 0); // excess cash in the account
    log.push(`Excess cash in the account: ${excessCash}`);
    log.push(`Cash investment value before withdrawal: ${cashInvestment.value}`);

    cashInvestment.value -= Math.max(0, excessCash); // withdraw from cash account to invest
    cashCounter += Math.max(0, excessCash); // countdown of excess cash to be invested
    log.push(`Cash investment value after withdrawal: ${cashInvestment.value}`);
    const targetInvestmentValues: number[] = [];

    if (eType.assetAllocation.type === "fixed"){
        for (let i=0; i<eType.assetAllocation.percentages.length; i++){
            const targetRatio = eType.assetAllocation.percentages[i];
            if (targetRatio === undefined || targetRatio === null){
                log.push(`Error: Target ratio ${targetRatio} is undefined or null in iteration ${i}`);
                return null;
            }
            const targetValue = (investmentNetValue + excessCash) * targetRatio/100; // target value of investment
            targetInvestmentValues.push(targetValue);
        }

    }
    else{ // glidePath
        const eDuration = e.duration as FixedYear;
        const elapseRatio = eDuration.year !== 0 ? (year - simStartYear) / eDuration.year : 0; // percentage of how much current event has elapsed until end
        for (let i=0; i<investments.length; i++){
            if (eType.assetAllocation.initialPercentages[i] === undefined || eType.assetAllocation.finalPercentages[i] === undefined){
                log.push(`Error: Target ratio ${eType.assetAllocation.initialPercentages[i]} or ${eType.assetAllocation.finalPercentages[i]} is undefined`);
                return null;
            }
            const targetRatio = eType.assetAllocation.initialPercentages[i] + (eType.assetAllocation.finalPercentages[i] - eType.assetAllocation.initialPercentages[i]) * elapseRatio; // target ratio of investment
            const targetValue = (investmentNetValue + excessCash) * targetRatio/100; // target value of investment
            targetInvestmentValues.push(targetValue);
        }

    }
    log.push(`Target investment values: ${targetInvestmentValues}`);

    // Now, targetInvestmentValues contains the target values for each investment
    // We need to scale down the after-tax accounts if they exceed the limit

    if (b>l){
        log.push(`After tax accounts will receive investments exceeding annual limits of ${l}. Scaling down...`)

        let diff = 0;
        let numNonAfterAccounts = 0;
        for (let i = 0; i < investments.length; i++) {
            const investment = investments[i];
            if (investment === undefined || investment === null){
                log.push(`Error: Investment ${i} is undefined or null`);
                return null;

            }
            if (investment.taxStatus === "after-tax") {
                if (b !== 0) {
                    diff += targetInvestmentValues[i] * (1 - l / b); // Safe division
                    targetInvestmentValues[i] *= l / b; // Safe division
                } else {
                    log.push("Warning: Division by zero avoided in after-tax scaling.");
                    diff += targetInvestmentValues[i]; // No scaling applied
                    targetInvestmentValues[i] = investmentValues[i]; // Set to original value if scaling is invalid
                }
            } else {
                numNonAfterAccounts += 1; // count number of non-after tax accounts
            }
        }

        log.push(`Difference between capped purchases and uncapped: ${diff}`);
        log.push(`Number of non-after tax accounts: ${numNonAfterAccounts}`);
    
        const scaleUp = numNonAfterAccounts !== 0 ? diff / numNonAfterAccounts : 0; // Safe division
        // Spread the difference across non-after tax accounts
        for (let i = 0; i < investments.length; i++) {

            const investment = investments[i];
            if (investment === undefined || investment === null){
                log.push(`Error: Investment ${i} is undefined or null`);
                return null;
            }
            if (investment.taxStatus !== "after-tax") {
                if (isNaN(targetInvestmentValues[i]) || targetInvestmentValues[i] === undefined) {
                    log.push(`Error: targetInvestmentValues[${i}] is invalid (NaN or undefined).`);
                    targetInvestmentValues[i] = 0; // Default to 0
                }
                if (investment.value < targetInvestmentValues[i] + scaleUp && cashCounter > 0) {
                    log.push(`Sufficient cash has already been withdrawn from cash investment (current cashCounter: ${cashCounter})`);
                    log.push(`Investment ${i} is ${investment.value} and target is ${targetInvestmentValues[i]} + scaleUp: ${scaleUp}`);
                    cashCounter -= targetInvestmentValues[i] + scaleUp - investment.value; // reduce cash counter by the amount we need to invest
                    investment.value = targetInvestmentValues[i] + scaleUp; // only purchase if we less
                }
            } else {
                if (isNaN(targetInvestmentValues[i]) || targetInvestmentValues[i] === undefined) {
                    log.push(`Error: targetInvestmentValues[${i}] is invalid (NaN or undefined).`);
                    targetInvestmentValues[i] = 0; // Default to 0
                }
                if (investment.value < targetInvestmentValues[i] && cashCounter > 0) {
                    log.push(`Sufficient cash has already been withdrawn from cash investment (current cashCounter: ${cashCounter})`);
                    log.push(`Investment ${i} is ${investment.value} and target is ${targetInvestmentValues[i]}`);
                    cashCounter -= targetInvestmentValues[i] - investment.value; // reduce cash counter by the amount we need to invest
                    investment.value += targetInvestmentValues[i]; // only purchase if we less
                }
            }
        }
    }
    else{
        for (let i=0; i<investments.length; i++){
            const investment = investments[i];
            if (investment === undefined || investment === null){
                log.push(`Error: Investment ${i} is undefined or null`);
                return null;
            }
            if (investment.value < targetInvestmentValues[i] && cashCounter > 0) {
                log.push(`Sufficient cash has already been withdrawn from cash investment (current cashCounter: ${cashCounter})`);
                    log.push(`Investment ${i} is ${investment.value} and target is ${targetInvestmentValues[i]}`);
                cashCounter -= targetInvestmentValues[i] - investment.value; // reduce cash counter by the amount we need to invest
                investment.value += targetInvestmentValues[i]; // invest excess cash
            }
        }
    }
    log.push(`Investment values after investment: ${investmentValues}`);
    return 0
}