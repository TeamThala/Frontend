import { Scenario } from '@/types/scenario';
import { Event, FixedYear, EventYear, IncomeEvent, InvestmentEvent } from '@/types/event';
import { randomNormal } from 'd3-random';
// import { getTaxData } from '@/types/taxScraper';
// import client from '@/lib/db';
import { Investment } from '@/types/investment';
import { SingleScenario } from '@/types/scenario';
// import { getInflationRate } from './inflation';

export async function simulation(scenario: Scenario){
    const currentYear = new Date().getFullYear();
    let year = currentYear;
    console.log(scenario.ownerBirthYear);
    console.log(typeof scenario.ownerBirthYear);

    // Sample life expectancy
    let ownerLifeExpectancy: number | null = null;
    if (scenario.ownerLifeExpectancy.type === "fixed"){
        ownerLifeExpectancy = scenario.ownerLifeExpectancy.value;
    }
    else{
        const normal = randomNormal(scenario.ownerLifeExpectancy.mean, scenario.ownerLifeExpectancy.stdDev);
        ownerLifeExpectancy = Math.floor(normal()); // Life expectancy should be a whole number for the loop
    }
    if (ownerLifeExpectancy === null){
        console.log("Error: Could not sample life expectancy.");
        return null;
    }

    // Sample spouse life expectancy
    let spouseLifeExpectancy: number | null = null;
    if (scenario.type === "couple"){
        if(scenario.spouseLifeExpectancy.type !== "fixed"){
            const normal = randomNormal(scenario.spouseLifeExpectancy.mean, scenario.spouseLifeExpectancy.stdDev);
            spouseLifeExpectancy = Math.floor(normal()); // Life expectancy should be a whole number for the loop
        }
        else{
            spouseLifeExpectancy = scenario.spouseLifeExpectancy.value;
        }
    }

    // Obtain initial tax brackets with which to use for simulation
    // const initialTaxBrackets = await getTaxData(currentYear, scenario.residenceState);
    // let prevTaxBrackets = initialTaxBrackets;
    console.log(`Fetched initial tax brackets for ${scenario.residenceState} in ${currentYear}`);

    // Initialize durations for all events and sort all of them by type
    const eventArrays = await initializeEvents(scenario.eventSeries);
    if (eventArrays === null){
        console.log("Error: Could not initialize events.");
        return null;
    }
    let incomeEvents:Event[], cashInvestment: Event;//, expenseEvents:Event[], investmentEvents:Event[], rebalanceEvents:Event[];

    if (eventArrays !== undefined){
        incomeEvents = eventArrays[0];
        // expenseEvents = eventArrays[1];
        // investmentEvents = eventArrays[2];
        // rebalanceEvents = eventArrays[3];
        cashInvestment = eventArrays[4][0]; // Should be an array with only one element
    }
    else {
        console.log("Error: No events found.");
        return null;
    }

    // Simulation loop
    console.log("=====================SIMULATION STARTED=====================");
    for(let age = currentYear - scenario.ownerBirthYear; age < ownerLifeExpectancy; age++){
        // Simulation logic
        console.log(incomeEvents[0])
        // Inflation assumption calculation for this year
        // const inflation = getInflationRate(scenario.inflationRate);
        // console.log(`Inflation rate for age ${age} calculated to be ${inflation}`);

        // Adjust this year's tax brackets for inflation
        // const taxBrackets = updateTaxBrackets(prevTaxBrackets, inflation);
        // console.log(`Adjusted tax brackets for age ${age}`);

        // TODO: update retirement account contributions annual limits

        // console.log(`Age: ${age}`);
        // console.log(`Year: ${year}`);

        // TODO: Run income events, add to cash investment
        await updateIncomeEvents(incomeEvents, year, scenario.investments, cashInvestment);
        // TODO: Perform RMD for previous year
        // TODO: Update the values of investments
        // TODO: Run Roth conversion optimizer if enabled
        // TODO: Pay non-discretionary expenses and previous year's taxes
        // TODO: Pay discretionary expenses in spending strategy
        // TODO: Run invest event scheduled for the current year
        // TODO: Run rebalance events scheduled for the current year


        // End of loop calculations
        year++;
        // prevTaxBrackets = taxBrackets; // Update previous tax brackets for next iteration

        // Check if spouse is alive
        if (scenario.type === "couple" && spouseLifeExpectancy !== null && currentYear > scenario.spouseBirthYear + spouseLifeExpectancy){
            const newScenario: SingleScenario = {
                id: scenario.id,
                name: scenario.name,
                description: scenario.description,
                financialGoal: scenario.financialGoal,
                investments: scenario.investments,
                eventSeries: scenario.eventSeries,
                spendingStrategy: scenario.spendingStrategy,
                expenseWithdrawalStrategy: scenario.expenseWithdrawalStrategy,
                inflationRate: scenario.inflationRate,
                RothConversionStrategy: scenario.RothConversionStrategy,
                RMDStrategy: scenario.RMDStrategy,
                rothConversion: scenario.rothConversion,
                residenceState: scenario.residenceState,
                owner: scenario.owner,
                ownerBirthYear: scenario.ownerBirthYear,
                ownerLifeExpectancy: scenario.ownerLifeExpectancy,
                viewPermissions: scenario.viewPermissions,
                editPermissions: scenario.editPermissions,
                type: "single",
                updatedAt: new Date()
            }
            scenario = newScenario; // convert current scenario into a single scenario
        }
    }
    console.log("=====================SIMULATION FINISHED=====================");
    return;
}





async function initializeEvents(events: Event[]){ // assuming it is only invoked on scenario.eventSeries
    // Resolves all durations and start years that are not fixed
    // Collects events into arrays by type

    // Initialize durations for all events
    console.log("Initializing event durations...");

    const incomeEvents: Event[] = [];
    const expenseEvents: Event[] = [];
    const investmentEvents: Event[] = [];
    const rebalanceEvents: Event[] = [];
    const cashInvestment: Event[] = []; // Default to null

    for (let i = 0; i < events.length; i++){
        let event: Event = events[i];
        console.log(`Initializing event with name: ${events[i].name}...`);
        event = events[i];
        // console.log(event);
        if (event !== null){
            if (event.duration.type === "uniform"){
                const uniform = Math.random() * (event.duration.year.max - event.duration.year.min) + event.duration.year.min;
                const simDuration: FixedYear = {
                    type: "fixed",
                    year: Math.floor(uniform)
                }
                event.duration = simDuration;
            }
            else if (event.duration.type === "normal"){
                const normal = randomNormal(event.duration.year.mean, event.duration.year.stdDev);
                const simDuration: FixedYear = {
                    type: "fixed",
                    year: Math.floor(normal())
                }
                event.duration = simDuration;
            }
            else { // type is "fixed"
                // console.log(`Event ${event.name} has a fixed duration of ${event.duration.year}`);
                // All random durations will be converted to fixed durations at runtime
                // If already fixed, do nothing
            }

            // Resolve start year
            if (event.startYear.type === "uniform"){
                const uniform = Math.random() * (event.startYear.year.max - event.startYear.year.min) + event.startYear.year.min;
                const simStartYear: FixedYear = {
                    type: "fixed",
                    year: Math.floor(uniform)
                }
                event.startYear = simStartYear;
            }
            else if (event.startYear.type === "normal"){
                const normal = randomNormal(event.startYear.year.mean, event.startYear.year.stdDev);
                const simStartYear: FixedYear = {
                    type: "fixed",
                    year: Math.floor(normal())
                }
                event.startYear = simStartYear;
            }
            else if (event.startYear.type === "event"){
                // recursively resolve start years until we reach a fixed start year
                const startYear = event.startYear as EventYear;
                const matchingEvent = events.find(e => e.id === startYear.eventId);
                if (!matchingEvent) {
                    console.log(`Error: Could not find event with id ${event.startYear.eventId}`);
                    return null;
                }
                await initializeEvents([matchingEvent]);
                if (event.startYear.eventTime === "start"){
                    const finalStartYear = matchingEvent.startYear as FixedYear; // should be resolved to a fixed year
                    event.startYear = {
                        type: "fixed",
                        year: finalStartYear.year
                    }; // this should be fixed year after the recursive call
                }
                else{
                    const finalStartYear = matchingEvent.startYear as FixedYear; // Should be resolved to a fixed year
                    const finalDuration = matchingEvent.duration as FixedYear; // Should be resolved to a fixed year
                    event.startYear = {
                        type: "fixed",
                        year: finalStartYear.year + finalDuration.year
                    };
                }
            }
            else{ // type is "fixed"
                // console.log(`Event ${event.name} has a fixed start year of ${event.startYear.year}`);
                // All random start years will be converted to fixed start years at runtime
                // If already fixed, do nothing
            }

            // Put event in respective array
            if (event.eventType.type === "income"){
                incomeEvents.push(event);
            }
            else if (event.eventType.type === "expense"){
                expenseEvents.push(event);
            }
            else if (event.eventType.type === "investment"){
                investmentEvents.push(event);
                const nestedInvestments = event.eventType.assetAllocation.investments;
                if (nestedInvestments === null){
                    console.log(`Error: Could not find the investments nested inside ${event.id}, ${event.name}`);
                    return null;
                }
                if (nestedInvestments.length > 0 && nestedInvestments[0].investmentType.name === "cash"){
                    cashInvestment.push(event);
                }
            }
            else{
                rebalanceEvents.push(event);
            }
        }
        else {
            console.log(`Error: During initializeEvents(), event ${i} is null`);
            return null;
        }
    }
    return [incomeEvents, expenseEvents, investmentEvents, rebalanceEvents, cashInvestment];
}

async function updateIncomeEvents(incomeEvents:Event[], year:number, investments:Investment[], cashInvestment: Event){
    // incomeEvents: array of income events obtained from initializeEvents
    // year: current year of simulation to check if event should apply

    let curYearIncome = 0;
    let curYearSS = 0;
    const cashInvestmentType = cashInvestment.eventType as InvestmentEvent;
    if (cashInvestment === undefined){
        console.log("Error: Could not find the default cash investment in the scenario.");
        return null;
    }
    for (let i = 0; i < incomeEvents.length; i++){
        const incomeEvent = incomeEvents[i];
        const incomeEventStartYear = incomeEvent.startYear as FixedYear; // should be fixedyears
        const incomeEventDuration = incomeEvent.duration as FixedYear; // should be fixedyears
        const withinDuration = (year >= incomeEventStartYear.year) && (year <= (incomeEventStartYear.year + incomeEventDuration.year)); // should be fixedYears
        if (withinDuration){
            // Inflation adjustment
            const incomeEventType = incomeEvent.eventType as IncomeEvent;
            if (incomeEventType.inflationAdjustment){
                if (incomeEventType.expectedAnnualChange.type === "normal"){
                    const normal = randomNormal(incomeEventType.expectedAnnualChange.mean, incomeEventType.expectedAnnualChange.stdDev);
                    incomeEventType.amount *= normal();
                }
                else if (incomeEventType.expectedAnnualChange.type === "uniform"){
                    const uniform = Math.random() * (incomeEventType.expectedAnnualChange.max - incomeEventType.expectedAnnualChange.min) + incomeEventType.expectedAnnualChange.min;
                    incomeEventType.amount *= uniform;
                }
                else {
                    incomeEventType.amount *= incomeEventType.expectedAnnualChange.value;
                }
            }

            // TODO: handle couple income calculation percentage

            cashInvestmentType.amount += incomeEventType.amount;
            curYearIncome += incomeEventType.amount;
            console.log(`Income for current year ${year}: ${curYearIncome}`);
            if (incomeEventType.socialSecurity){
                curYearSS += incomeEventType.amount;
                console.log(`curYearSS has been updated: ${curYearSS}`);
            }
        }
    }
}