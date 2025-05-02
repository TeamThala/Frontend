import { SimulationResult, YearlyResult } from "@/types/simulationResult";
import * as fs from 'fs';

export function exportResultsToJson(yearlyData: YearlyResult[], filepath: string, success: boolean, log: string[]) {
    try {
        const jsonData: SimulationResult = {
            success: success,
            data: yearlyData
        };

        fs.writeFileSync(filepath, JSON.stringify(jsonData, null, 2), 'utf-8');
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