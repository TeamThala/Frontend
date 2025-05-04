import { Event, InvestmentEvent, IncomeEvent, FixedYear } from "@/types/event";
import { Investment } from "@/types/investment";
import { randomNormal } from "d3-random";

export function findCashInvestment(investmentEvent: Event, log: string[]): Investment | null {
    // Find the cash investment in the investment event
    const investmentEventType = investmentEvent.eventType as InvestmentEvent;
    const assetAllocation = investmentEventType.assetAllocation;

    let nestedInvestments: Investment[] | undefined | null = null;

    if (assetAllocation) {
        if (Array.isArray(assetAllocation)) {
            log.push(`Error: assetAllocation for event ${investmentEvent.id} (${investmentEvent.name}) is an array, expected single object in findCashInvestment.`);
            return null; // Cannot find cash in an array of allocations
        } else {
            nestedInvestments = assetAllocation.investments;
        }
    }

    if (!nestedInvestments){
        log.push(`Error: Could not find the investments nested inside ${investmentEvent.id}, ${investmentEvent.name}`);
        return null;
    }
    // log.push(`Nested investments: ${nestedInvestments}`);
    const cashInvestment = nestedInvestments.find(investment => investment.investmentType.id === "cash") || null; // TODO: change this to a more permanent solution
    return cashInvestment;
}

export async function updateIncomeEvents(incomeEvents:Event[], year:number, currentInvestmentEvent:Event, inflation: number, inflationType: string, log: string[]){
    log.push(`=== UPDATING INCOME EVENTS FOR ${year} ===`);
    // incomeEvents: array of income events obtained from initializeEvents
    // year: current year of simulation to check if event should apply

    let curYearIncome = 0;
    let curYearSS = 0;

    const cashInvestment = findCashInvestment(currentInvestmentEvent, log);
    if (cashInvestment === null){
        log.push(`Error: Could not find cash investment in ${currentInvestmentEvent.name}`);
        return null;
    }
    // log.push(`Cash investment found in ${currentInvestmentEvent.name}: ${cashInvestment}`);

    for (let i = 0; i < incomeEvents.length; i++){
        const incomeEvent = incomeEvents[i];
        const incomeEventStartYear = incomeEvent.startYear as FixedYear; // should be fixedyears
        const incomeEventDuration = incomeEvent.duration as FixedYear; // should be fixedyears
        const withinDuration = (year >= incomeEventStartYear.year) && (year <= (incomeEventStartYear.year + incomeEventDuration.year)); // should be fixedYears
        if (withinDuration){
            // Update income event
            const incomeEventType = incomeEvent.eventType as IncomeEvent;
            log.push(`Income event ${incomeEvent.name} is within duration for year ${year} with amount ${incomeEventType.amount}`);
            if (incomeEventType.expectedAnnualChange.type === "normal"){
                const normal = randomNormal(incomeEventType.expectedAnnualChange.mean, incomeEventType.expectedAnnualChange.stdDev);
                if (incomeEventType.expectedAnnualChange.valueType === "percentage"){
                    const iterValue = normal();
                    log.push(`Income Event ${incomeEvent.name} annual change has rolled a value of ${iterValue} of type ${incomeEventType.expectedAnnualChange.valueType}`);
                    incomeEventType.amount *= iterValue/100;
                }
                else{
                    const iterValue = normal();
                    log.push(`Income Event ${incomeEvent.name} annual change has rolled a value of ${iterValue} of type ${incomeEventType.expectedAnnualChange.valueType}`);
                    incomeEventType.amount += iterValue;
                }
            }
            else if (incomeEventType.expectedAnnualChange.type === "uniform"){
                const iterValue = Math.random() * (incomeEventType.expectedAnnualChange.max - incomeEventType.expectedAnnualChange.min) + incomeEventType.expectedAnnualChange.min;
                log.push(`Income Event ${incomeEvent.name} ${incomeEventType.expectedAnnualChange.type} annual change has rolled a value of ${iterValue} of type ${incomeEventType.expectedAnnualChange.valueType}`);
                if (incomeEventType.expectedAnnualChange.valueType === "percentage"){
                    incomeEventType.amount *= iterValue/100;
                }
                else{
                    incomeEventType.amount += iterValue;
                }
            }
            else {
                log.push(`Income Event ${incomeEvent.name} has fixed annual change value of ${incomeEventType.expectedAnnualChange.value} of type ${incomeEventType.expectedAnnualChange.valueType}`);
                if (incomeEventType.expectedAnnualChange.valueType === "percentage"){
                    incomeEventType.amount *= incomeEventType.expectedAnnualChange.value/100;
                }
                else{
                    incomeEventType.amount += incomeEventType.expectedAnnualChange.value;
                }
            }

            // Inflation adjustment
            // log.push(`Income event ${incomeEvent.name} is within duration for year ${year}`);
            if (incomeEventType.inflationAdjustment){
                log.push(`Adjusting income event ${incomeEvent.name} for inflation with amount ${inflation} of type ${inflationType}`);
                if (inflationType === "percentage"){
                    incomeEventType.amount *= inflation; // inflation already comes in as a percentage (5% inflation rate = 1.05 already)
                }
                else{
                    incomeEventType.amount += inflation;
                }
            }


            // TODO: handle couple income calculation percentage


            // log.push(incomeEventType);
            cashInvestment.value += incomeEventType.amount;
            log.push(`Cash investment value has been updated to ${cashInvestment.value} (change of ${incomeEventType.amount})`);
            curYearIncome += incomeEventType.amount;
            // log.push(`Income for current year ${year}: ${curYearIncome}`);
            if (incomeEventType.socialSecurity){
                curYearSS += incomeEventType.amount;
                log.push(`curYearSS has been updated: ${curYearSS}`);
            }
        }
    }
    return { incomeEvents, curYearIncome, curYearSS };
}