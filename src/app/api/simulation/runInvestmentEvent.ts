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

    // Compute amount each investment needs to increase to reach allocation
    const investmentValues: number[] = [];
    let investmentNetValue = 0; // collect sum of all investment values
    for (let i=0; i<investments.length; i++){
        const investment = investments[i];
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
    const excessCash = eType.maxCash - cashInvestment.value; // excess cash in the account
    log.push(`Excess cash in the account: ${excessCash}`);
    log.push(`Cash investment value before withdrawal: ${cashInvestment.value}`);
    cashInvestment.value -= Math.max(0, excessCash); // withdraw from cash account to invest
    log.push(`Cash investment value after withdrawal: ${cashInvestment.value}`);
    const targetInvestmentValues: number[] = [];

    if (eType.assetAllocation.type === "fixed"){
        for (let i=0; i<investments.length; i++){
            const targetRatio = eType.assetAllocation.percentages[i];
            const targetValue = (investmentNetValue + excessCash) * targetRatio; // target value of investment
            targetInvestmentValues.push(targetValue);
        }

    }
    else{ // glidePath
        const eDuration = e.duration as FixedYear;
        const elapseRatio = (year - simStartYear) / eDuration.year; // percentage of how much current event has elapsed until end
        for (let i=0; i<investments.length; i++){
            const targetRatio = eType.assetAllocation.initialPercentages[i] + (eType.assetAllocation.finalPercentages[i] - eType.assetAllocation.initialPercentages[i]) * elapseRatio; // target ratio of investment
            const targetValue = (investmentNetValue + excessCash) * targetRatio; // target value of investment
            targetInvestmentValues.push(targetValue);
        }

    }
    log.push(`Target investment values: ${targetInvestmentValues}`);

    if (b>l){
        log.push(`After tax accounts will receive investments exceeding annual limits of ${l}. Scaling down...`)
        let diff = 0;
        let numNonAfterAccounts = 0;
        for (let i=0; i<investments.length; i++){
            const investment = investments[i];
            if (investment.taxStatus === "after-tax"){
                diff += targetInvestmentValues[i] * (1-l/b);
                targetInvestmentValues[i] *= l/b; // scale down if over limit
            }
            else{
                numNonAfterAccounts += 1; // count number of non-after tax accounts
            }
        }
        log.push(`Diff: ${diff}`);
        log.push(`Number of non-after tax accounts: ${numNonAfterAccounts}`);

        const scaleUp = diff / numNonAfterAccounts; // scale up non-after tax accounts by this amount
        for (let i=0; i<investments.length; i++){
            const investment = investments[i];
            if (investment.taxStatus !== "after-tax"){
                investment.value += targetInvestmentValues[i] + scaleUp; // scale up non-after tax accounts
            }
            else{
                investment.value += targetInvestmentValues[i]; // scale down after tax accounts
            }
        }

    }
    else{
        for (let i=0; i<investments.length; i++){
            const investment = investments[i];
            investment.value += targetInvestmentValues[i]; // invest excess cash
        }
    }
    log.push(`Investment values after investment: ${investmentValues}`);
    return 0
}