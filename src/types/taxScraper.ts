
// // 🚀 Final Flow
// // 1️⃣ Check if tax data exists (federal & state).
// // 2️⃣ Scrape IRS site for federal tax data if missing.
// // 3️⃣ Load state tax data from YAML or default to 0%.
// // 4️⃣ Store tax data in memory for quick access.
// // 5️⃣ Expose API for frontend use.

// //should be moved to api folder?

// import axios from 'axios';
// import yaml from "js-yaml";
// import fs from "fs";
// import { FederalTaxData, StateTaxData, TaxDatabase } from "./tax";

// const IRS_TAX_RATES_URL = "https://www.irs.gov/filing/federal-income-tax-rates-and-brackets";
// const IRS_CAPITAL_GAINS_URL = "https://www.irs.gov/taxtopics/tc409";
// const STATE_TAX_YAML_PATH = "./src/data/state_tax_data.yaml"; // Default path. Placeholder for now.


// const taxDatabase: TaxDatabase = { federal: {}, state: {} };

// /**
//  * Scrapes federal income tax brackets from IRS website.
//  */
// async function scrapeFederalIncomeTaxRates(): Promise<FederalTaxData> {
//     // Currently using hardcoded values until web scraping is implemented
//     console.log("Scraping federal income tax brackets...");
//     // TODO: Implement actual scraping using JIRA WEB Scraper/Puppeteer/Cheerio

//     const taxBrackets: FederalTaxData = {
//         year: new Date().getFullYear(), // Get current year dynamically
//         incomeBrackets: [
//             { lowerBound: 0, upperBound: 11000, rate: 0.10 },
//             { lowerBound: 11001, upperBound: 44725, rate: 0.12 },
//             { lowerBound: 44726, upperBound: 95375, rate: 0.22 },
//             { lowerBound: 95376, upperBound: 182100, rate: 0.24 },
//             { lowerBound: 182101, upperBound: 231250, rate: 0.32 },
//             { lowerBound: 231251, upperBound: 578125, rate: 0.35 },
//             { lowerBound: 578126, upperBound: Infinity, rate: 0.37 },
//         ],
//         // 2024 Standard Deduction amounts by filing status(from IRS Table given)
//         standardDeductions: {
//             single: 14600,
//             married: 29200,
//             headOfHousehold: 21900
//         },
//         // 2024 Long-term Capital Gains Tax Brackets (Single Filer)
//         capitalGainsRates: [
//             { lowerBound: 0, upperBound: 44725, rate: 0.00 },
//             { lowerBound: 44726, upperBound: 501000, rate: 0.15 },
//             { lowerBound: 501001, upperBound: Infinity, rate: 0.20 }
//         ]
//     };

//     return taxBrackets;
// }

// /**
//  * Loads state tax rates from a YAML file or defaults to 0%.
//  * @returns StateTaxData object with state tax brackets
//  */
// function loadStateTaxRates(state: string, year: number): StateTaxData {
//     if (fs.existsSync(STATE_TAX_YAML_PATH)) {
//         // Attempt to load state tax data from YAML configuration
//         console.log(`Loading state tax data from YAML file for ${state}...`);
//         const yamlContent = fs.readFileSync(STATE_TAX_YAML_PATH, "utf8");
//         const stateTaxData = yaml.load(yamlContent) as { [state: string]: { [year: number]: StateTaxData } };

//         // Return state-specific tax data if it exists
//         if (stateTaxData[state] && stateTaxData[state][year]) {
//             return stateTaxData[state][year];
//         }
//     }

//     // Default to 0% if no YAML data exists
//     return {
//         state,
//         year,
//         incomeBrackets: [{ lowerBound: 0, upperBound: Infinity, rate: 0.0 }]
//     };
// }

// /**
//  * Stores tax data in memory for quick access.
//  */
// async function storeTaxData(year: number, state: string) {
//     // Fetch and cache federal tax data if not already present
//     if (!taxDatabase.federal[year]) {
//         const federalData = await scrapeFederalIncomeTaxRates();
//         taxDatabase.federal[year] = federalData;
//     }

//     if (!taxDatabase.state[state] || !taxDatabase.state[state][year]) {
//         taxDatabase.state[state] = taxDatabase.state[state] || {};
//         taxDatabase.state[state][year] = loadStateTaxRates(state, year);
//     }
// }

// /**
//  * Retrieves tax data (scrapes if missing).
//  */
// async function getTaxData(year: number, state: string) {
//     await storeTaxData(year, state);
//     return {
//         federal: taxDatabase.federal[year],
//         state: taxDatabase.state[state][year]
//     };
// }

// export { getTaxData, storeTaxData };



