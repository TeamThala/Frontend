import { Scenario } from "@/types/scenario";
import * as fs from 'fs';

export function exportResultsToJson(s: Scenario, filepath: string, year: number, inflation: number, curYearIncome: number, curYearEarlyWithdrawals: number, curYearSS: number, curYearGains: number) {
    try {
        if (!fs.existsSync(filepath)) {
            fs.writeFileSync(filepath, JSON.stringify({}, null, 2), 'utf-8');
            console.log(`File not found. Created a new JSON file at ${filepath}.`);
        }

        const data = fs.readFileSync(filepath, 'utf-8');
        const jsonData = JSON.parse(data);
        // console.log('Loaded data:', jsonData);

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
        console.log(`Added data for year ${year} and updated the file.`);
    } catch (error) {
        console.error('Error reading or writing the file:', error);
    }
}