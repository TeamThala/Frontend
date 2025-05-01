import { Scenario } from "@/types/scenario";
import { SimulationResult, YearlyResult } from "@/types/simulationResult";
import * as fs from 'fs';

export function exportResultsToJson(s: Scenario, filepath: string, year: number, inflation: number, curYearIncome: number, curYearEarlyWithdrawals: number, curYearSS: number, curYearGains: number, success: boolean, log: string[]) {
    try {
        const initialData: SimulationResult = {
            success: false,
            data: []
        };
        if (!fs.existsSync(filepath)) {
            // Initialize the file as an empty array
            fs.writeFileSync(filepath, JSON.stringify(initialData, null, 2), 'utf-8');
            log.push(`File not found. Created a new JSON file at ${filepath}.`);
        }

        const prevData = fs.readFileSync(filepath, 'utf-8');
        const data: YearlyResult[] = prevData ? JSON.parse(prevData).data : []; // Ensure data is an array

        // Create a YearlyResult object
        const yearlyResult: YearlyResult = {
            year: year,
            investments: s.investments,
            inflation: inflation,
            eventSeries: s.eventSeries,
            curYearIncome: curYearIncome,
            curYearEarlyWithdrawals: curYearEarlyWithdrawals,
            curYearSS: curYearSS,
            curYearGains: curYearGains
        };

        data.push(yearlyResult);

        const jsonData: SimulationResult = {
            success: success,
            data: data
        };

        fs.writeFileSync(filepath, JSON.stringify(jsonData, null, 2), 'utf-8');
        log.push(`Added data for year ${year} and updated the file.`);
        return jsonData;
    } catch (error) {
        console.error('Error reading or writing the file:', error);
        return null;
    }
}

export function saveLogToFile(logContents: string, filepath: string, log: string[]) {
    try {
        fs.appendFileSync(filepath, logContents + '\n', 'utf-8');
        log.push(`Log entry added to ${filepath}.`);
    } catch (error) {
        console.error('Error writing to the log file:', error);
    }
}