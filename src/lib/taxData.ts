import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import dbConnect from './dbConnect';
import User from '@/models/User';

// Match the scraped data structure
// interface TaxBracket {
//   lowerBound: number;
//   upperBound: number;
//   rate: number;
// }

// Standard deductions with exact IRS terminology
interface StandardDeductions {
  'Single': number;
  'Married Filing Jointly': number;
  'Head of Household': number;
}

// Capital gains structure
interface CapitalGainsData {
  zeroPercent: Array<{ status: string; range: { from: string; to: string } }>;
  fifteenPercent: Array<{ status: string; range: { from: string; to: string } }>;
  twentyPercent: Array<{ status: string; range: { from: string; to: string } }>;
  specialRates: {
    qualifiedSmallBusinessStock: string;
    collectibles: string;
    unrecaptured1250Gain: string;
  };
}

// State tax bracket structure
interface StateTaxBracket {
  over: number;
  but_not_over: number | null;
  base_tax: number;
  plus: string | null;
  rate: number;
  of_excess_over: number;
}

// Export this interface
export interface StateTaxData {
  [stateCode: string]: {
    [year: string]: {
      married_jointly_or_surviving_spouse: StateTaxBracket[];
      single_or_married_separately: StateTaxBracket[];
      head_of_household: StateTaxBracket[];
    }
  }
}

/**
 * State Tax Data Handling:
 * - State tax rates and brackets are read from the static state_tax_data.yaml file
 * - The file contains 2024 tax rates for NY, NJ, and CT
 * - For other states, users can upload their own YAML file in the same format
 * - If no state tax data is available, the system will show a warning and ignore state income tax
 * - Tax brackets and standard deductions are automatically adjusted for inflation
 */
export interface TaxData {
  taxBrackets: {
    single: Array<{ rate: string; from: string; upto: string }>;
    'married-joint': Array<{ rate: string; from: string; upto: string }>;
    'married-separate': Array<{ rate: string; from: string; upto: string }>;
    'head-of-household': Array<{ rate: string; from: string; upto: string }>;
  };
  standardDeductions: {
    standardDeductions: StandardDeductions;
  };
  capitalGainsRates: CapitalGainsData;
  stateTaxData: StateTaxData;
}

export async function getTaxData(stateCode?: string, userId?: string): Promise<TaxData> {
  const rootDir = process.cwd();
  
  try {
    const taxBrackets = yaml.load(
      fs.readFileSync(path.join(rootDir, 'tax_brackets.yaml'), 'utf8')
    ) as TaxData['taxBrackets'];
    
    const standardDeductions = yaml.load(
      fs.readFileSync(path.join(rootDir, 'standard_deductions.yaml'), 'utf8')
    ) as TaxData['standardDeductions'];
    
    const capitalGains = yaml.load(
      fs.readFileSync(path.join(rootDir, 'capital_gains.yaml'), 'utf8')
    ) as { capitalGainsRates: CapitalGainsData };
    
    // Load default state tax data
    const stateTaxData = yaml.load(
      fs.readFileSync(path.join(rootDir, 'state_tax_data.yaml'), 'utf8')
    ) as StateTaxData;

    // If a state code and user ID are provided, try to load custom state tax data
    if (stateCode && userId) {
      try {
        await dbConnect();
        const user = await User.findById(userId);
        
        if (user && user.stateTaxFiles && user.stateTaxFiles.get(stateCode)) {
          const customTaxFileId = user.stateTaxFiles.get(stateCode);
          const customTaxFilePath = path.join(rootDir, 'data', 'state_tax', `${customTaxFileId}.yaml`);
          
          if (fs.existsSync(customTaxFilePath)) {
            const customTaxData = yaml.load(
              fs.readFileSync(customTaxFilePath, 'utf8')
            ) as StateTaxData;
            
            // Merge custom state data with default data
            stateTaxData[stateCode] = customTaxData[stateCode];
          }
        }
      } catch (error) {
        console.error('Error loading custom state tax data:', error);
        // Continue with default data if there's an error
      }
    }

    return {
      taxBrackets,
      standardDeductions,
      capitalGainsRates: capitalGains.capitalGainsRates,
      stateTaxData
    };
  } catch (error) {
    console.error('Error loading tax data:', error);
    throw error;
  }
}

// Helper function to convert string rates to numbers if needed
export function getNumericRate(rateString: string): number {
  return parseFloat(rateString.replace('%', '')) / 100;
} 