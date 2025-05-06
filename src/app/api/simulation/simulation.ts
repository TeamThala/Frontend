import { Scenario } from '@/types/scenario';
import { Event, FixedYear, EventYear, InvestmentEvent, RebalanceEvent } from '@/types/event';
import { randomNormal } from 'd3-random';
import { getTaxData } from '@/lib/taxData';
// import client from '@/lib/db';
import { SingleScenario } from '@/types/scenario';
import { getInflationRate } from './inflation';
import { findCashInvestment, updateIncomeEvents } from './updateIncomeEvents';
import { updateInvestmentEvent } from './updateInvestmentEvent';
import { payNondiscExpenses } from './payNondiscExpenses';
import { updateTaxBrackets } from './taxInflation';
import { rothConversion } from './rothConversion';
import { Investment } from '@/types/investment';
import { RMDService } from '@/services/rmdService';
import { Investment as RMDInvestment, RmdStrategy } from '@/types/rmd';
import { exportResultsToJson, saveLogToFile } from './exportResults';
import { payDiscExpenses } from './payDiscExpenses';
import { SimulationResult, YearlyResult } from '@/types/simulationResult';
import { runRebalanceEvents } from './runRebalanceEvents';
import { runInvestmentEvent } from './runInvestmentEvent';


export async function simulation(scenario: Scenario){
    let success: boolean = true;
    let finalReturn: SimulationResult | null = null;
    const yearlyResults: YearlyResult[] = [];
    const currentYear = new Date().getFullYear();
    let year = currentYear;
    const log: string[] = [];
    log.push(`Owner birthyear: ${scenario.ownerBirthYear} of type ${typeof scenario.ownerBirthYear}`);

    // Sample life expectancy
    let ownerLifeExpectancy: number | null = null;
    if (scenario.ownerLifeExpectancy.type === "fixed"){
        ownerLifeExpectancy = scenario.ownerLifeExpectancy.value;
    }
    else{
        const normal = randomNormal(scenario.ownerLifeExpectancy.mean, scenario.ownerLifeExpectancy.stdDev);
        ownerLifeExpectancy = Math.floor(normal()); // Life expectancy should be a whole number for the loop
        log.push(`Owner normal life expectancy rolled as ${ownerLifeExpectancy}`);
    }
    if (ownerLifeExpectancy === null){
        log.push("Error: Could not sample life expectancy.");
        saveLogToFile(log.join('\n'), `src/data/error.log`, log);
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
    log.push(`Fetched initial tax brackets for ${scenario.residenceState} in ${currentYear}`);

    // Initialize durations for all events and sort all of them by type
    const eventArrays = await initializeEvents(scenario.eventSeries, log);
    if (eventArrays === null){
        log.push("Error: Could not initialize events.");
        saveLogToFile(log.join('\n'), `src/data/error.log`, log);
        return null;
    }
    log.push(`Initialized events: ${eventArrays}`);
    let incomeEvents:Event[], investmentEvents:Event[], expenseEvents:Event[],  rebalanceEvents:Event[];

    if (eventArrays !== undefined){
        incomeEvents = eventArrays[0];
        expenseEvents = eventArrays[1];
        investmentEvents = eventArrays[2];
        rebalanceEvents = eventArrays[3];
    }
    else {
        log.push("Error: No events found.");
        saveLogToFile(log.join('\n'), `src/data/error.log`, log);
        return null;
    }
    // Initialize investment related fields to use unified objects
    initializeInvestmentEvents(investmentEvents, scenario, log);
    initializeRebalanceEvents(rebalanceEvents, scenario, log);
    initializeStrategy(scenario.RMDStrategy, scenario, log);
    initializeStrategy(scenario.RothConversionStrategy, scenario, log);
    initializeStrategy(scenario.expenseWithdrawalStrategy, scenario, log);

    // Variables to be carried into the next iteration of the loop
    let curYearGains: number = 0;
    let curYearEarlyWithdrawals: number = 0;
    const taxData = await getTaxData(scenario.residenceState, scenario.owner.id);
    let standardDeductions = (scenario.type === "couple") ? taxData.standardDeductions.standardDeductions['Married filing jointly or Qualifying surviving spouse'] : taxData.standardDeductions.standardDeductions['Single or Married filing separately'];

    let inflation: number = 0;
    let curYearIncome: number = 0;
    let curYearSS: number = 0; // Social Security income for the current year

    // Simulation loop
    log.push("=====================SIMULATION STARTED=====================");
    log.push(`Financial Goal: ${scenario.financialGoal}`);
    for(let age = currentYear - scenario.ownerBirthYear; age < ownerLifeExpectancy; age++){
        // Simulation logic
        // log.push(incomeEvents[0])
        // Inflation assumption calculation for this year
        inflation = getInflationRate(scenario.inflationRate);
        log.push(`Inflation rate for age ${age} parsed as ${inflation}`);

        // update retirement account contributions annual limits
        scenario.contributionsLimit *= inflation; // Update contribution limits for next year

        // log.push(`Age: ${age}`);
        log.push(`=====================Year: ${year}=====================`);


        // Find the current investment event
        const currentInvestmentEvent = investmentEvents.find(event => (event.startYear.type === "fixed") && 
            (event.duration.type === "fixed") && 
            (event.startYear.year <= year) && 
            (event.startYear.year + event.duration.year) >= year);

        let currentInvestmentEventExists = true;

        if (!currentInvestmentEvent || currentInvestmentEvent === undefined){
            log.push(`WARNING: Could not find investment event for year ${year}. Skipping all processes that require a current investment event.`);
            currentInvestmentEventExists = false;
        }

        if (currentInvestmentEventExists && currentInvestmentEvent !== undefined){
            const incomeResults = await updateIncomeEvents(incomeEvents, year, currentInvestmentEvent, inflation, scenario.inflationRate.valueType, scenario.investments, log);
            if (incomeResults === null){
                log.push("Error: Could not update income events.");
                saveLogToFile(log.join('\n'), `src/data/error.log`, log);
                return null;
            }
            curYearIncome = incomeResults.curYearIncome;
            curYearSS = incomeResults.curYearSS;
            log.push(`Income for current year ${year}: ${curYearIncome}`);
            log.push(`Social Security for current year ${year}: ${curYearSS}`);
        }
        else {
            log.push(`WARNING: Skipping income events for year ${year} because current investment event is not found.`);
            curYearIncome = 0;
            curYearSS = 0;
        }
        
        // === RMD Processing: Calculate and distribute required minimum distributions for pre-tax accounts ===
        // Perform RMD for previous year if applicable
        if (age >= 74) {  // RMDs start at 73, paid at 74
            log.push(`=== Processing RMD for age ${age} in year ${year} ===`);
            const rmdService = RMDService.getInstance();
            
            // Get previous year's pre-tax accounts
            if (currentInvestmentEventExists && currentInvestmentEvent !== undefined){
                const investmentEventType = currentInvestmentEvent.eventType as InvestmentEvent;
                if (investmentEventType.assetAllocation?.investments) {
                    //Filter pre-tax accounts with positive balances for RMD calculation
                    const previousYearPretaxAccounts = investmentEventType.assetAllocation.investments
                        .filter(inv => inv.taxStatus === "pre-tax" && inv.value > 0)
                        .map(inv => ({
                            id: inv.id,
                            name: inv.id,
                            balance: inv.value,
                            accountType: "pretax" as const
                        } as RMDInvestment));

                    log.push(`Found ${previousYearPretaxAccounts.length} pre-tax accounts with positive balances`);
                    previousYearPretaxAccounts.forEach(acc => {
                        log.push(`  - ${acc.name}: $${acc.balance}`);
                    });

                    // Only proceed if we have pre-tax accounts and an RMD strategy
                    if (previousYearPretaxAccounts.length > 0 && Array.isArray(scenario.RMDStrategy) && scenario.RMDStrategy.length > 0) {
                        try {
                            // Load the RMD table for the current year first
                            await rmdService.getRmdTable(year);

                            // Create RMD strategy from the ordered array of investments
                            const rmdStrategy: RmdStrategy = {
                                name: "Simulation RMD Strategy",
                                investmentOrder: scenario.RMDStrategy.map(inv => inv.id)
                            };
                            log.push(`RMD distribution order: ${rmdStrategy.investmentOrder.join(', ')}`);

                            // Execute RMD distribution
                            const distribution = await rmdService.executeRmdDistribution(
                                year,  // current year is the distribution year
                                age,
                                previousYearPretaxAccounts,
                                rmdStrategy
                            );

                            // Add RMD to current year's income
                            curYearIncome += distribution.distributionAmount;
                            log.push(`RMD distribution for year ${year}: $${distribution.distributionAmount}`);
                            log.push(`Total pre-tax balance: $${distribution.pretaxAccountBalance}`);
                            
                            // Process the distributions - transfer, reduce pre-tax, increase or create non-retirement investment
                            // Note: RMD transfers work in dollars only - no share counts or portfolio percentages per requirements
                            log.push('Processing distributions:');
                            for (const dist of distribution.distributedInvestments) {
                                log.push(`  Processing distribution of $${dist.amount} from ${dist.investmentId}`);
                                const sourceInv = investmentEventType.assetAllocation.investments
                                    .find(inv => inv.id === dist.investmentId);
                                
                                if (sourceInv) {
                                    // Reduce the pre-tax investment value
                                    const oldValue = sourceInv.value;
                                    sourceInv.value -= dist.amount;
                                    log.push(`  Reduced ${sourceInv.id} from $${oldValue} to $${sourceInv.value}`);

                                    // Find or create corresponding non-retirement investment
                                    const targetInv = investmentEventType.assetAllocation.investments
                                        .find(inv => 
                                            inv.investmentType.name === sourceInv.investmentType.name && 
                                            inv.taxStatus === "non-retirement"
                                        );

                                    if (targetInv) {
                                        // Add to existing non-retirement investment
                                        const oldTargetValue = targetInv.value;
                                        targetInv.value += dist.amount;
                                        log.push(`  Added to existing non-retirement ${targetInv.id}: $${oldTargetValue} -> $${targetInv.value}`);
                                    } else { //CREATING NEW INVESTMENT HERE!
                                        // Create new non-retirement investment
                                        const newInv = {
                                            id: `${sourceInv.id}-nonret`,
                                            value: dist.amount,
                                            taxStatus: "non-retirement" as const, // strictly typed to accept only: taxStatus: "non-retirement" | "pre-tax" | "after-tax", else would infer as generic string.
                                            investmentType: sourceInv.investmentType,
                                            purchasePrice: dist.amount  // Set purchase price to distribution amount
                                        };
                                        investmentEventType.assetAllocation.investments.push(newInv);
                                        log.push(`  Created new non-retirement investment ${newInv.id} with value $${newInv.value}`);
                                    }
                                }
                            }
                            log.push('=== RMD processing complete ===');
                        } catch (error) {
                            console.error('Error executing RMD distribution:', error);
                            // Handle errors gracefully to ensure simulation continues
                        }
                    } else {
                        log.push('Skipping RMD: No pre-tax accounts or RMD strategy available');
                    }
                }
            }
            else {
                log.push(`WARNING: Skipping RMD for year ${year} because current investment event is not found.`);
            }
        }

        if (currentInvestmentEventExists && currentInvestmentEvent !== undefined){
            const investmentResults = updateInvestmentEvent(currentInvestmentEvent, log);
            if (investmentResults === null){
                log.push("Error: Could not update investment events.");
                saveLogToFile(log.join('\n'), `src/data/error.log`, log);
                return null;
            }
            curYearIncome += investmentResults;
        }
        else {
            log.push(`WARNING: Skipping investment events for year ${year} because current investment event is not found.`);
        }
        
        if (scenario.rothConversion !== null){
            log.push(`Roth conversion for ${year} is ${scenario.rothConversion}`);
            const rc = rothConversion(curYearIncome, curYearSS, taxData, scenario.type === "couple", year, scenario.RothConversionStrategy, scenario.investments, log);
            if (rc === null || rc === undefined){
                log.push(`Error: Could not finish Roth conversion for year ${year}`);
                saveLogToFile(log.join('\n'), `src/data/error.log`, log);
                return null;
            }
            curYearIncome += rc;
        }

        const nondiscExpenseRet = payNondiscExpenses(curYearIncome, curYearSS, curYearGains, curYearEarlyWithdrawals, year, expenseEvents, standardDeductions, scenario.type === "couple", scenario.residenceState, scenario.expenseWithdrawalStrategy, taxData, age, scenario.investments, log);
        if (nondiscExpenseRet === null){
            log.push(`Ending simulation run...`);
            saveLogToFile(log.join('\n'), `src/data/error.log`, log);
            return null;
        }
        curYearGains += nondiscExpenseRet.dCurYearGains;
        curYearIncome += nondiscExpenseRet.dCurYearIncome;
        curYearEarlyWithdrawals += nondiscExpenseRet.dCurYearEarlyWithdrawals;
        log.push(`Return from payNondiscExpenses: dCurYearGains: ${nondiscExpenseRet.dCurYearGains}, dCurYearIncome: ${nondiscExpenseRet.dCurYearIncome}, dCurYearEarlyWithdrawals: ${nondiscExpenseRet.dCurYearEarlyWithdrawals}`);

        // After using previous year's variables, reset these values to be used the next year
        curYearGains = 0;
        curYearEarlyWithdrawals = 0;
        log.push(`curYearEarlyWithdrawals reset to ${curYearEarlyWithdrawals}`);
        // Pay discretionary expenses in spending strategy
        if(currentInvestmentEventExists && currentInvestmentEvent !== undefined){
            payDiscExpenses(year, expenseEvents, scenario.spendingStrategy, scenario.expenseWithdrawalStrategy, scenario.financialGoal, scenario.investments, log);
        }
        else{
            log.push(`WARNING: Skipping discretionary expenses for year ${year} because current investment event is not found.`);
        }
        // Run invest event scheduled for the current year
        if (currentInvestmentEventExists && currentInvestmentEvent !== undefined){
            const runInvestResult = runInvestmentEvent(currentInvestmentEvent, scenario.contributionsLimit, currentYear, year, scenario.investments, log);
            if (runInvestResult === null){
                console.log("Error: Could not run investment event.");
                saveLogToFile(log.join('\n'), `src/data/error.log`, log);
                return null;
            }
        }
        else{
            log.push(`WARNING: Skipping investment event for year ${year} because current investment event is not found.`);
        }
        // Run rebalance events scheduled for the current year
        const cashInvestment = findCashInvestment(scenario.investments, log);
        if (cashInvestment === null){
            log.push(`Error: Could not find cash investment in ${scenario.name}`);
            saveLogToFile(log.join('\n'), `src/data/error.log`, log);
            return null;
        }
        log.push(`Cash investment value before rebalance: ${cashInvestment.value}`);
        runRebalanceEvents(rebalanceEvents, year, currentYear, log);
        log.push(`Cash investment value after rebalance: ${cashInvestment.value}`);



        // End of loop calculations
        log.push(`End of year ${year} calculations...`);
        year++;
        updateTaxBrackets(taxData, inflation, log); // Update tax brackets for next year
        standardDeductions *= inflation; // Update standard deductions for next year

        const yearlyResult: YearlyResult = {
            year: year,
            investments: JSON.parse(JSON.stringify(scenario.investments)), // Deep copy to decouple from original reference
            inflation: inflation,
            eventSeries: JSON.parse(JSON.stringify(scenario.eventSeries)), // Deep copy to decouple from original reference
            curYearIncome: curYearIncome,
            curYearEarlyWithdrawals: curYearEarlyWithdrawals,
            curYearSS: curYearSS,
            curYearGains: curYearGains
        };
        log.push(`Yearly result being added for year ${year}: ${JSON.stringify(yearlyResult)}`);
        log.push(`Cash investment value: ${cashInvestment.value}`);

        yearlyResults.push(yearlyResult); // Add yearly result to array

        // Check if financial goal is met
        let netWorth = 0;
        for (let i=0; i<scenario.investments.length; i++){
            const investment = scenario.investments[i];
            netWorth += investment.value; // Add up all investments
        }
        log.push(`Net worth for year ${year} is ${netWorth}`);
        if (netWorth < scenario.financialGoal){
            log.push(`Financial goal not met for year ${year}. Current net worth: ${netWorth}`);
            success = false;
            break;
        }
        
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
                type: "individual",
                updatedAt: new Date(),
                contributionsLimit: scenario.contributionsLimit
            }
            scenario = newScenario; // convert current scenario into a single scenario
        }
        // Save results of this year to a JSON file
        
        
    }
    log.push("=====================SIMULATION FINISHED=====================");
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Replace colons and dots for file system compatibility
    const snowflakeId = scenario.owner.id + "_" + timestamp; // Unique identifier for the simulation run
    finalReturn = exportResultsToJson(yearlyResults, `src/data/${snowflakeId}_simulationResults_${scenario.id}.json`, `src/data/${snowflakeId}.csv`, success, log);
    saveLogToFile(log.join('\n'), `src/data/${snowflakeId}.log`, log);
    return finalReturn;
}





async function initializeEvents(events: Event[], log: string[]){ // assuming it is only invoked on scenario.eventSeries
    // Resolves all durations and start years that are not fixed
    // Collects events into arrays by type

    // Initialize durations for all events
    log.push("Initializing event durations...");

    const incomeEvents: Event[] = [];
    const expenseEvents: Event[] = [];
    const investmentEvents: Event[] = [];
    const rebalanceEvents: Event[] = [];
    // let cashInvestment: Investment | null = null; // Default to null

    for (let i = 0; i < events.length; i++){
        let event: Event = events[i];
        log.push(`Initializing event with name: ${events[i].name}...`);
        event = events[i];
        // log.push(event);
        if (event !== null){
            if (event.duration.type === "uniform"){
                const uniform = Math.random() * (event.duration.year.max - event.duration.year.min) + event.duration.year.min;
                const simDuration: FixedYear = {
                    type: "fixed",
                    year: Math.floor(uniform)
                }
                event.duration = simDuration;
                log.push(`Event ${event.name}'s uniform duration rolled duration of ${event.duration.year}`);
            }
            else if (event.duration.type === "normal"){
                const normal = randomNormal(event.duration.year.mean, event.duration.year.stdDev);
                const simDuration: FixedYear = {
                    type: "fixed",
                    year: Math.floor(normal())
                }
                event.duration = simDuration;
                log.push(`Event ${event.name}'s normal duration rolled duration of ${event.duration.year}`);
            }
            else { // type is "fixed"
                // log.push(`Event ${event.name} has a fixed duration of ${event.duration.year}`);
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
                log.push(`Event ${event.name}'s uniform startYear rolled startYear of ${event.startYear.year}`);
            }
            else if (event.startYear.type === "normal"){
                const normal = randomNormal(event.startYear.year.mean, event.startYear.year.stdDev);
                const simStartYear: FixedYear = {
                    type: "fixed",
                    year: Math.floor(normal())
                }
                event.startYear = simStartYear;
                log.push(`Event ${event.name}'s normal startYear rolled startYear of ${event.startYear.year}`);
            }
            else if (event.startYear.type === "event"){
                // recursively resolve start years until we reach a fixed start year
                const startYear = event.startYear as EventYear;
                const matchingEvent = events.find(e => e.id === startYear.eventId);
                if (!matchingEvent) {
                    log.push(`Error: Could not find event with id ${event.startYear.eventId}`);
                    saveLogToFile(log.join('\n'), `src/data/error.log`, log);
                    return null;
                }
                await initializeEvents([matchingEvent], log);
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
                // log.push(`Event ${event.name} has a fixed start year of ${event.startYear.year}`);
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
                    log.push(`Error: Could not find the investments nested inside ${event.id}, ${event.name}`);
                    saveLogToFile(log.join('\n'), `src/data/error.log`, log);
                    return null;
                }
                // cashInvestment = nestedInvestments.find(investment => investment.investmentType.name === "cash") || null;
            }
            else{
                rebalanceEvents.push(event);
            }
        }
        else {
            log.push(`Error: During initializeEvents(), event ${i} is null`);
            saveLogToFile(log.join('\n'), `src/data/error.log`, log);
            return null;
        }
    }
    return [incomeEvents, expenseEvents, investmentEvents, rebalanceEvents];
}

function initializeInvestmentEvents(investmentEvents: Event[], scenario: Scenario, log: string[]){
    // replaces investments in all investment events with references to investment objects in scenario.investments
    for (let i=0; i<investmentEvents.length; i++){
        const investmentEvent = investmentEvents[i];
        const investmentType = investmentEvent.eventType as InvestmentEvent;

        let assetAllocation = investmentType.assetAllocation;
        if (Array.isArray(assetAllocation)){
            assetAllocation = assetAllocation[0];
        }

        const investments = assetAllocation.investments;
        if (investments === null){
            log.push(`Error: Could not find the investments nested inside ${investmentEvent.id}, ${investmentEvent.name}`);
            saveLogToFile(log.join('\n'), `src/data/error.log`, log);
            return null;
        }
        for (let j=0; j<investments.length; j++){
            const investment = investments[j];
            const investmentId = investment.id;
            const investmentInField = scenario.investments.find(i => i.id === investmentId);
            if (investmentInField){
                investments[j] = investmentInField; // replace with reference to investment object in scenario.investments
            }
            else{
                log.push(`Error: Could not find investment with id ${investmentId}`);
                saveLogToFile(log.join('\n'), `src/data/error.log`, log);
                return null;
            }
        }
    }
}

function initializeRebalanceEvents(rebalanceEvents: Event[], scenario: Scenario, log: string[]){
    // replaces investments in all investment events with references to investment objects in scenario.investments
    for (let i=0; i<rebalanceEvents.length; i++){
        const rebalanceEvent = rebalanceEvents[i];
        const rebalanceType = rebalanceEvent.eventType as RebalanceEvent;
        const investments = rebalanceType.portfolioDistribution.investments;
        if (investments === null){
            log.push(`Error: Could not find the investments nested inside ${rebalanceEvent.id}, ${rebalanceEvent.name}`);
            saveLogToFile(log.join('\n'), `src/data/error.log`, log);
            return null;
        }
        for (let j=0; j<investments.length; j++){
            const investment = investments[j];
            const investmentId = investment.id;
            const investmentInField = scenario.investments.find(i => i.id === investmentId);
            if (investmentInField){
                investments[j] = investmentInField; // replace with reference to investment object in scenario.investments
            }
            else{
                log.push(`Error: Could not find investment with id ${investmentId}`);
                saveLogToFile(log.join('\n'), `src/data/error.log`, log);
                return null;
            }
        }
    }
}

function initializeStrategy(strategy: Investment[], scenario: Scenario, log: string[]){
    // replace any Investment[] strategy with references to investment objects in scenario.investments
    for(let i=0; i<strategy.length; i++){
        const investment = strategy[i];
        const investmentId = investment.id;
        const investmentInField = scenario.investments.find(i => i.id === investmentId);
        if (investmentInField){
            strategy[i] = investmentInField; // replace with reference to investment object in scenario.investments
        }
        else{
            log.push(`Error: Could not find investment with id ${investmentId}`);
            saveLogToFile(log.join('\n'), `src/data/error.log`, log);
            return null;
        }
    }
}

