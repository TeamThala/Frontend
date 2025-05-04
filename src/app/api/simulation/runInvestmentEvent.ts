import { Event, InvestmentEvent, AssetAllocationFixed, AssetAllocationGlidePath } from "@/types/event";
import { Investment } from "@/types/investment";
import { findCashInvestment } from "./updateIncomeEvents";
import { FixedYear } from "@/types/event";

export function runInvestmentEvent(e: Event, l: number, simStartYear: number, year: number, log: string[]){ // e = currentInvestmentEvent, l = contributionsLimit
    log.push(`=== RUNNING INVESTMENT EVENT ${e.name} ===`);
    const eType = e.eventType as InvestmentEvent;
    
    // Handle asset allocation as either array or single object
    const allocation = Array.isArray(eType.assetAllocation) 
        ? eType.assetAllocation[0] 
        : eType.assetAllocation;
    
    if (!allocation || allocation.investments === null){
        log.push(`Error: Could not find investments in asset allocation in ${e.name}`);
        return null;
    }
    
    const investments: Investment[] = allocation.investments;

    log.push(`Investments: ${investments}`);

    let b = 0; // sum of amount to buy in after tax accounts

    // Compute amount each investment needs to increase to reach allocation
    const investmentValues: number[] = [];
    let investmentNetValue = 0; // collect sum of all investment values
    for (let i=0; i<investments.length; i++){
        const investment = investments[i];
        if (investment === undefined || investment === null){
            console.log(`Error: Investment ${i} is undefined or null`);
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
    const excessCash = eType.maxCash - cashInvestment.value; // excess cash in the account
    log.push(`Excess cash in the account: ${excessCash}`);
    log.push(`Cash investment value before withdrawal: ${cashInvestment.value}`);

    cashInvestment.value -= Math.max(0, excessCash); // withdraw from cash account to invest
    log.push(`Cash investment value after withdrawal: ${cashInvestment.value}`);
    const targetInvestmentValues: number[] = [];

    if (allocation.type === "fixed"){
        const fixedAllocation = allocation as AssetAllocationFixed;
        for (let i=0; i<fixedAllocation.percentages.length; i++){
            const targetRatio = fixedAllocation.percentages[i];
            if (targetRatio === undefined || targetRatio === null){
                console.log(`Error: Target ratio ${targetRatio} is undefined or null in iteration ${i}`);
                return null;
            }
            const targetValue = (investmentNetValue + excessCash) * targetRatio; // target value of investment
            targetInvestmentValues.push(targetValue);
        }
    }
    else{ // glidePath
        const glidePathAllocation = allocation as AssetAllocationGlidePath;
        const eDuration = e.duration as FixedYear;
        const elapseRatio = eDuration.year !== 0 ? (year - simStartYear) / eDuration.year : 0; // percentage of how much current event has elapsed until end
        for (let i=0; i<investments.length; i++){
            if (glidePathAllocation.initialPercentages[i] === undefined || glidePathAllocation.finalPercentages[i] === undefined){
                console.log(`Error: Target ratio ${glidePathAllocation.initialPercentages[i]} or ${glidePathAllocation.finalPercentages[i]} is undefined`);
                return null;
            }
            const targetRatio = glidePathAllocation.initialPercentages[i] + (glidePathAllocation.finalPercentages[i] - glidePathAllocation.initialPercentages[i]) * elapseRatio; // target ratio of investment
            const targetValue = (investmentNetValue + excessCash) * targetRatio; // target value of investment
            targetInvestmentValues.push(targetValue);
        }
    }
    log.push(`Target investment values: ${targetInvestmentValues}`);


    if (b>l){
        log.push(`After tax accounts will receive investments exceeding annual limits of ${l}. Scaling down...`)

        let diff = 0;
        let numNonAfterAccounts = 0;
        for (let i = 0; i < investments.length; i++) {
            const investment = investments[i];
            if (investment === undefined || investment === null){
                console.log(`Error: Investment ${i} is undefined or null`);
                return null;

            }
            if (investment.taxStatus === "after-tax") {
                if (b !== 0) {
                    diff += targetInvestmentValues[i] * (1 - l / b); // Safe division
                    targetInvestmentValues[i] *= l / b; // Safe division
                } else {
                    console.log("Warning: Division by zero avoided in after-tax scaling.");
                    targetInvestmentValues[i] = 0; // Set to 0 if scaling is invalid
                }
            } else {
                numNonAfterAccounts += 1; // count number of non-after tax accounts
            }
        }

        console.log(`Diff: ${diff}`);
        console.log(`Number of non-after tax accounts: ${numNonAfterAccounts}`);
    
        const scaleUp = numNonAfterAccounts !== 0 ? diff / numNonAfterAccounts : 0; // Safe division
        for (let i = 0; i < investments.length; i++) {

            const investment = investments[i];
            if (investment === undefined || investment === null){
                console.log(`Error: Investment ${i} is undefined or null`);
                return null;
            }
            if (investment.taxStatus !== "after-tax") {
                if (isNaN(targetInvestmentValues[i]) || targetInvestmentValues[i] === undefined) {
                    console.log(`Error: targetInvestmentValues[${i}] is invalid (NaN or undefined).`);
                    targetInvestmentValues[i] = 0; // Default to 0
                }
                investment.value += targetInvestmentValues[i] + scaleUp;
            } else {
                if (isNaN(targetInvestmentValues[i]) || targetInvestmentValues[i] === undefined) {
                    console.log(`Error: targetInvestmentValues[${i}] is invalid (NaN or undefined).`);
                    targetInvestmentValues[i] = 0; // Default to 0
                }
                investment.value += targetInvestmentValues[i];
            }
        }
    }
    else{
        for (let i=0; i<investments.length; i++){
            const investment = investments[i];
            if (investment === undefined || investment === null){
                console.log(`Error: Investment ${i} is undefined or null`);
                return null;
            }

            investment.value += targetInvestmentValues[i]; // invest excess cash
        }
    }
    log.push(`Investment values after investment: ${investmentValues}`);
    return 0
}