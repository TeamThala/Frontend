import { Scenario } from "@/types/scenario";
import * as fs from 'fs';

export function exportResultsToJson(s: Scenario, filepath: string, year: number, inflation: number, curYearIncome: number, curYearEarlyWithdrawals: number, curYearSS: number, curYearGains: number, log: string[]) {
    try {
        if (!fs.existsSync(filepath)) {
            fs.writeFileSync(filepath, JSON.stringify({}, null, 2), 'utf-8');
            log.push(`File not found. Created a new JSON file at ${filepath}.`);
        }

        const data = fs.readFileSync(filepath, 'utf-8');
        const jsonData = JSON.parse(data);
        // log.push('Loaded data:', jsonData);

        jsonData[year] = {
            "year": year,
            "investments": s.investments,
            "inflation": inflation,
            "eventSeries": s.eventSeries,
            "curYearIncome": curYearIncome,
            "curYearEarlyWithdrawals": curYearEarlyWithdrawals,
            "curYearSS": curYearSS,
            "curYearGains": curYearGains
        };
        
        fs.writeFileSync(filepath, JSON.stringify(jsonData, null, 2), 'utf-8');
        log.push(`Added data for year ${year} and updated the file.`);
    } catch (error) {
        console.error('Error reading or writing the file:', error);
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