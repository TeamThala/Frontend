import { Event, InvestmentEvent, IncomeEvent, FixedYear } from "@/types/event";
import { Investment } from "@/types/investment";
import { randomNormal } from "d3-random";

export function findCashInvestment(investmentEvent: Event): Investment | null {
    // Find the cash investment in the investment event
    const investmentEventType = investmentEvent.eventType as InvestmentEvent;
    const nestedInvestments = investmentEventType.assetAllocation.investments;
    if (nestedInvestments === null){
        console.log(`Error: Could not find the investments nested inside ${investmentEvent.id}, ${investmentEvent.name}`);
        return null;
    }
    // console.log(`Nested investments: ${nestedInvestments}`);
    const cashInvestment = nestedInvestments.find(investment => investment.investmentType.id === "cash") || null; // TODO: change this to a more permanent solution
    return cashInvestment;
}

export async function updateIncomeEvents(incomeEvents:Event[], year:number, currentInvestmentEvent:Event){
    console.log(`=== UPDATING INCOME EVENTS FOR ${year} ===`);
    // incomeEvents: array of income events obtained from initializeEvents
    // year: current year of simulation to check if event should apply

    let curYearIncome = 0;
    let curYearSS = 0;

    const cashInvestment = findCashInvestment(currentInvestmentEvent);
    if (cashInvestment === null){
        console.log(`Error: Could not find cash investment in ${currentInvestmentEvent.name}`);
        return null;
    }
    // console.log(`Cash investment found in ${currentInvestmentEvent.name}: ${cashInvestment}`);

    for (let i = 0; i < incomeEvents.length; i++){
        const incomeEvent = incomeEvents[i];
        const incomeEventStartYear = incomeEvent.startYear as FixedYear; // should be fixedyears
        const incomeEventDuration = incomeEvent.duration as FixedYear; // should be fixedyears
        const withinDuration = (year >= incomeEventStartYear.year) && (year <= (incomeEventStartYear.year + incomeEventDuration.year)); // should be fixedYears
        if (withinDuration){
            // Inflation adjustment
            // console.log(`Income event ${incomeEvent.name} is within duration for year ${year}`);
            const incomeEventType = incomeEvent.eventType as IncomeEvent;
            if (incomeEventType.inflationAdjustment){
                if (incomeEventType.expectedAnnualChange.type === "normal"){
                    const normal = randomNormal(incomeEventType.expectedAnnualChange.mean, incomeEventType.expectedAnnualChange.stdDev);
                    if (incomeEventType.expectedAnnualChange.valueType === "percentage"){
                        incomeEventType.amount *= normal()/100;
                    }
                    else{
                        incomeEventType.amount += normal();
                    }
                }
                else if (incomeEventType.expectedAnnualChange.type === "uniform"){
                    const uniform = Math.random() * (incomeEventType.expectedAnnualChange.max - incomeEventType.expectedAnnualChange.min) + incomeEventType.expectedAnnualChange.min;
                    if (incomeEventType.expectedAnnualChange.valueType === "percentage"){
                        incomeEventType.amount *= uniform/100;
                    }
                    else{
                        incomeEventType.amount += uniform;
                    }
                }
                else {
                    if (incomeEventType.expectedAnnualChange.valueType === "percentage"){
                        incomeEventType.amount *= incomeEventType.expectedAnnualChange.value/100;
                    }
                    else{
                        incomeEventType.amount += incomeEventType.expectedAnnualChange.value;
                    }
                }
            }

            // TODO: handle couple income calculation percentage


            // console.log(incomeEventType);
            cashInvestment.value += incomeEventType.amount;
            console.log(`Cash investment value has been updated: ${cashInvestment.value}`);
            curYearIncome += incomeEventType.amount;
            // console.log(`Income for current year ${year}: ${curYearIncome}`);
            if (incomeEventType.socialSecurity){
                curYearSS += incomeEventType.amount;
                console.log(`curYearSS has been updated: ${curYearSS}`);
            }
        }
    }
    return { curYearIncome, curYearSS };
}