// /* eslint-disable */

// import { Scenario } from '@/types/scenario';
// import { Event, FixedYear, IncomeEvent, ExpenseEvent, InvestmentEvent, RebalanceEvent } from '@/types/event';
// import { randomNormal } from 'd3-random';
// import { getTaxData } from '@/types/taxScraper';
// import { FixedValues, NormalDistributionValues, UniformDistributionValues } from '@/types/utils';
// import client from '@/lib/db';
// import { Investment } from '@/types/investment';

// export async function simulation(scenario: Scenario){
//     const currentYear = new Date().getFullYear();
//     var age = currentYear - scenario.ownerBirthYear;
//     var year = currentYear;
//     console.log(scenario.ownerBirthYear);
//     console.log(typeof scenario.ownerBirthYear);

//     // Sample life expectancy
//     var ownerLifeExpectancy = null;
//     if (scenario.ownerLifeExpectancy.type === "fixed"){
//         ownerLifeExpectancy = scenario.ownerLifeExpectancy.value;
//     }
//     else{
//         const normal = randomNormal(scenario.ownerLifeExpectancy.mean, scenario.ownerLifeExpectancy.stdDev);
//         ownerLifeExpectancy = Math.floor(normal()); // Life expectancy should be a whole number for the loop
//     }

//     // Obtain initial tax brackets with which to use for simulation
//     const initialTaxBrackets = await getTaxData(currentYear, scenario.residenceState);
//     var prevTaxBrackets = initialTaxBrackets;
//     console.log(`Fetched initial tax brackets for ${scenario.residenceState} in ${currentYear}`);

//     // Initialize durations for all events and sort all of them by type
//     const eventArrays = await initializeEvents(scenario.eventSeries);
//     if (eventArrays === null){
//         console.log("Error: Could not initialize events.");
//         return null;
//     }
//     var incomeEvents:Event[], expenseEvents:Event[], investmentEvents:Event[], rebalanceEvents:Event[];

//     if (eventArrays !== undefined){
//         incomeEvents = eventArrays[0];
//         expenseEvents = eventArrays[1];
//         investmentEvents = eventArrays[2];
//         rebalanceEvents = eventArrays[3];
//     }
//     else {
//         console.log("Error: No events found.");
//         return null;
//     }

//     // Simulation loop
//     console.log("=====================SIMULATION STARTED=====================");
//     for(var age = currentYear - scenario.ownerBirthYear; age < ownerLifeExpectancy; age++){
//         // Simulation logic
//         console.log(incomeEvents[0])
//         // Inflation assumption calculation for this year
//         const inflation = getInflationRate(scenario.inflationRate);
//         // console.log(`Inflation rate for age ${age} calculated to be ${inflation}`);

//         // Adjust this year's tax brackets for inflation
//         var taxBrackets = updateTaxBrackets(prevTaxBrackets, inflation);
//         // console.log(`Adjusted tax brackets for age ${age}`);

//         // TODO: update retirement account contributions annual limits

//         // console.log(`Age: ${age}`);
//         // console.log(`Year: ${year}`);

//         // TODO: Run income events, add to cash investment
//         await updateIncomeEvents(incomeEvents, year, scenario.investments);
//         // TODO: Perform RMD for previous year
//         // TODO: Update the values of investments
//         // TODO: Run Roth conversion optimizer if enabled
//         // TODO: Pay non-discretionary expenses and previous year's taxes
//         // TODO: Pay discretionary expenses in spending strategy
//         // TODO: Run invest event scheduled for the current year
//         // TODO: Run rebalance events scheduled for the current year


//         // End of loop calculations
//         year++;
//         prevTaxBrackets = taxBrackets; // Update previous tax brackets for next iteration
//     }
//     console.log("=====================SIMULATION FINISHED=====================");
//     return;
// }

// function getInflationRate(inflationRate: FixedValues | NormalDistributionValues | UniformDistributionValues){
//     if (inflationRate.type === "fixed"){
//         return inflationRate.value;
//     }
//     else if (inflationRate.type === "normal"){
//         const normal = randomNormal(inflationRate.mean, inflationRate.stdDev);
//         return normal();
//     }
//     else {
//         const uniform = Math.random() * (inflationRate.max - inflationRate.min) + inflationRate.min;
//         return uniform;
//     }
// }

// function updateTaxBrackets(taxBrackets: any, inflationRate: number){
//     // MATH CURRENTLY ASSUMES INFLATION INCREASES ARE VALUES > 1
//     // (IF NOT, CHANGE TRUEINFLATION TO 1 + INFLATIONRATE)
//     const trueInflation = inflationRate;

//     taxBrackets.federal.incomeBrackets.lower *= trueInflation;
//     taxBrackets.federal.incomeBrackets.upper *= trueInflation;
//     taxBrackets.federal.incomeBrackets.rate *= trueInflation;

//     taxBrackets.state.incomeBrackets.lower *= trueInflation;
//     taxBrackets.state.incomeBrackets.upper *= trueInflation;
//     taxBrackets.state.incomeBrackets.rate *= trueInflation;

//     return taxBrackets;
// }

// async function initializeEvents(events: any, noID = false){ // assuming it is only invoked on scenario.eventSeries
//     // Resolves all durations and start years that are not fixed
//     // Collects events into arrays by type
//     // noID is true if the events passed are already loaded in-memory as type Event

//     // Initialize durations for all events
//     console.log("Initializing event durations...");
//     const db = client.db("main");

//     var incomeEvents: Event[] = [];
//     var expenseEvents: Event[] = [];
//     var investmentEvents: Event[] = [];
//     var rebalanceEvents: Event[] = [];

//     for (var i = 0; i < events.length; i++){
//         var event: Event;
//         var eventFromDB;
//         if (noID === false){
//             var eventID = events[i];
//             eventFromDB = await db.collection("events").findOne({_id: eventID});
//         }
//         // console.log(eventFromDB);
//         if (eventFromDB !== null){
//             if (noID === false && eventFromDB !== undefined){
//                 console.log(`Initializing event with name: ${eventFromDB.name}...`);
//                 event = {
//                     name: eventFromDB.name,
//                     eventType: eventFromDB.eventType,
//                     startYear: eventFromDB.startYear,
//                     duration: eventFromDB.duration
//                 };
//             }
//             else { // noID is true and the events passed are already loaded in-memory as type Event
//                 console.log(`Initializing event with name: ${events[i].name}...`);
//                 event = events[i];
//             }
//             if (event.duration.type === "uniform"){
//                 const uniform = Math.random() * (event.duration.year.max - event.duration.year.min) + event.duration.year.min;
//                 var simDuration: FixedYear = {
//                     type: "fixed",
//                     year: Math.floor(uniform)
//                 }
//                 event.duration = simDuration;
//             }
//             else if (event.duration.type === "normal"){
//                 const normal = randomNormal(event.duration.year.mean, event.duration.year.stdDev);
//                 var simDuration: FixedYear = {
//                     type: "fixed",
//                     year: Math.floor(normal())
//                 }
//                 event.duration = simDuration;
//             }
//             else { // type is "fixed"
//                 // console.log(`Event ${event.name} has a fixed duration of ${event.duration.year}`);
//                 // All random durations will be converted to fixed durations at runtime
//                 // If already fixed, do nothing
//             }

//             // Resolve start year
//             if (event.startYear.type === "uniform"){
//                 const uniform = Math.random() * (event.startYear.year.max - event.startYear.year.min) + event.startYear.year.min;
//                 var simStartYear: FixedYear = {
//                     type: "fixed",
//                     year: Math.floor(uniform)
//                 }
//                 event.startYear = simStartYear;
//             }
//             else if (event.startYear.type === "normal"){
//                 const normal = randomNormal(event.startYear.year.mean, event.startYear.year.stdDev);
//                 var simStartYear: FixedYear = {
//                     type: "fixed",
//                     year: Math.floor(normal())
//                 }
//                 event.startYear = simStartYear;
//             }
//             else if (event.startYear.type === "event"){
//                 // recursively resolve start years until we reach a fixed start year
//                 await initializeEvents([event.startYear.event], true);
//                 if (event.startYear.eventTime === "start"){
//                     event.startYear = event.startYear.event.startYear.year; // this should be fixed year after the recursive call
//                 }
//                 else{
//                     event.startYear = event.startYear.event.startYear.year + event.startYear.event.duration.year;
//                 }
//             }
//             else{ // type is "fixed"
//                 // console.log(`Event ${event.name} has a fixed start year of ${event.startYear.year}`);
//                 // All random start years will be converted to fixed start years at runtime
//                 // If already fixed, do nothing
//             }

//             // Put event in respective array
//             if (event.eventType.type === "income"){
//                 incomeEvents.push(event);
//             }
//             else if (event.eventType.type === "expense"){
//                 expenseEvents.push(event);
//             }
//             else if (event.eventType.type === "investment"){
//                 investmentEvents.push(event);
//             }
//             else{
//                 rebalanceEvents.push(event);
//             }
//         }
//         else {
//             console.log(`Could not find event.`);
//             return null;
//         }
//     }
//     return [incomeEvents, expenseEvents, investmentEvents, rebalanceEvents];
// }

// async function updateIncomeEvents(incomeEvents:Event[], year:number, investments:Investment[]){
//     // incomeEvents: array of income events obtained from initializeEvents
//     // year: current year of simulation to check if event should apply
//     const db = client.db("main");
//     const cashInvestmentType = await db.collection("investmenttypes").findOne({name: "Cash"});

//     var curYearIncome = 0;
//     var curYearSS = 0;

//     if (cashInvestmentType === null){
//         console.log("Error: Could not find the default cash investment type in MongoDB.");
//         return null;
//     }
//     const cashInvestment = investments.find((investment) => investment.investmentType.id === cashInvestmentType._id.toString());
//     if (cashInvestment === undefined){
//         console.log("Error: Could not find the default cash investment in the scenario.");
//         return null;
//     }
//     for (var i = 0; i < incomeEvents.length; i++){
//         var incomeEvent = incomeEvents[i];
//         const withinDuration = (year >= incomeEvent.startYear.year) && (year <= (incomeEvent.startYear.year + incomeEvent.duration.year)); // should be fixedYears
//         if (withinDuration){
//             // Inflation adjustment
//             if (incomeEvent.eventType.inflationAdjustment){{
//                 if (incomeEvent.eventType.expectedAnnualChange.type === "normal"){
//                     const normal = randomNormal(incomeEvent.eventType.expectedAnnualChange.mean, incomeEvent.eventType.expectedAnnualChange.stdDev);
//                     incomeEvent.eventType.amount *= normal();
//                 }
//                 else if (incomeEvent.eventType.expectedAnnualChange.type === "uniform"){
//                     const uniform = Math.random() * (incomeEvent.eventType.expectedAnnualChange.max - incomeEvent.eventType.expectedAnnualChange.min) + incomeEvent.eventType.expectedAnnualChange.min;
//                     incomeEvent.eventType.amount *= uniform;
//                 }
//                 else {
//                     incomeEvent.eventType.amount *= incomeEvent.eventType.expectedAnnualChange.value;
//                 }
//             }

//             // TODO: handle couple income calculation percentage

//             cashInvestment.value += incomeEvent.eventType.amount;
//             curYearIncome += incomeEvent.eventType.amount;
//             if (incomeEvent.eventType.socialSecurity){
//                 curYearSS += incomeEvent.eventType.amount;
//             }
//         }
//     }
// }