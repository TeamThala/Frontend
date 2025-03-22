import { Scenario } from '@/types/scenario';
import { randomNormal } from 'd3-random';
import { getTaxData } from '@/types/taxScraper';
import { FixedValues, NormalDistributionValues, UniformDistributionValues } from '@/types/utils';

export async function simulation(scenario: Scenario){
    const currentYear = new Date().getFullYear();
    var age = currentYear - scenario.ownerBirthYear;
    console.log(scenario.ownerBirthYear);
    console.log(typeof scenario.ownerBirthYear);

    // Sample life expectancy
    var ownerLifeExpectancy = null;
    if (scenario.ownerLifeExpectancy.type === "fixed"){
        ownerLifeExpectancy = scenario.ownerLifeExpectancy.value;
    }
    else{
        const normal = randomNormal(scenario.ownerLifeExpectancy.mean, scenario.ownerLifeExpectancy.stdDev);
        ownerLifeExpectancy = Math.floor(normal()); // Life expectancy should be a whole number for the loop
    }

    // Obtain initial tax brackets with which to use for simulation
    const initialTaxBrackets = await getTaxData(currentYear, scenario.residenceState);
    var prevTaxBrackets = initialTaxBrackets;
    console.log(`Fetched initial tax brackets for ${scenario.residenceState} in ${currentYear}`);

    // Simulation loop
    for(var age = currentYear - scenario.ownerBirthYear; age < ownerLifeExpectancy; age++){
        // Simulation logic

        // Inflation assumption calculation for this year
        const inflation = getInflationRate(scenario.inflationRate);
        console.log(`Inflation rate for age ${age} calculated to be ${inflation}`);

        // Adjust this year's tax brackets for inflation
        var taxBrackets = updateTaxBrackets(prevTaxBrackets, inflation);
        console.log(`Adjusted tax brackets for age ${age}`);

        // Update previous tax brackets for next iteration
        prevTaxBrackets = taxBrackets;

        console.log(age);
    }
    console.log("=====================SIMULATION FINISHED=====================");
    return;
}

function getInflationRate(inflationRate: FixedValues | NormalDistributionValues | UniformDistributionValues){
    if (inflationRate.type === "fixed"){
        return inflationRate.value;
    }
    else if (inflationRate.type === "normal"){
        const normal = randomNormal(inflationRate.mean, inflationRate.stdDev);
        return normal();
    }
    else {
        const uniform = Math.random() * (inflationRate.max - inflationRate.min) + inflationRate.min;
        return uniform;
    }
}

function updateTaxBrackets(taxBrackets: any, inflationRate: number){
    // MATH CURRENTLY ASSUMES INFLATION INCREASES ARE VALUES > 1
    // (IF NOT, CHANGE TRUEINFLATION TO 1 + INFLATIONRATE)
    const trueInflation = inflationRate;

    taxBrackets.federal.incomeBrackets.lower *= trueInflation;
    taxBrackets.federal.incomeBrackets.upper *= trueInflation;
    taxBrackets.federal.incomeBrackets.rate *= trueInflation;

    taxBrackets.state.incomeBrackets.lower *= trueInflation;
    taxBrackets.state.incomeBrackets.upper *= trueInflation;
    taxBrackets.state.incomeBrackets.rate *= trueInflation;

    return taxBrackets;
}