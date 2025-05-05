import { SimulationResult, YearlyResult } from "@/types/simulationResult";
import * as fs from 'fs';

export function exportResultsToJson(yearlyData: YearlyResult[], filepath: string, csvFilepath: string, success: boolean, log: string[]) {
    try {
        const jsonData: SimulationResult = {
            success: success,
            data: yearlyData
        };

        // Write the JSON data to the specified filepath
        fs.writeFileSync(filepath, JSON.stringify(jsonData, null, 2), 'utf-8');

        // Prepare CSV content
        const csvHeaders = ['Year', ...Object.keys(yearlyData[0].investments)];
        const csvRows = yearlyData.map(year => {
            return [year.year, ...Object.values(year.investments).map(investment => investment.value)];
        });

        const csvContent = [
            csvHeaders.join(','),
            ...csvRows.map(row => row.join(','))
        ].join('\n');

        // Write the CSV content to the specified csvFilepath
        fs.writeFileSync(csvFilepath, csvContent, 'utf-8');
        log.push(`Written yearly results to ${csvFilepath}`);
        log.push(`Written simulation results to ${filepath}`);
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