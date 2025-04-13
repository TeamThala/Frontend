import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

// Basic tax bracket structure
interface TaxBracket {
  lowerBound: number;
  upperBound: number;
  rate: number;
}

// Standard deductions with exact IRS terminology
interface StandardDeductions {
  'Single': number;
  'Married Filing Jointly': number;
  'Head of Household': number;
}

// Capital gains structure
interface CapitalGainsData {
  zeroPercent: Array<{ status: string; threshold: string }>;
  fifteenPercent: Array<{ status: string; range: { from: string; to: string } }>;
  twentyPercent: Array<{ status: string; threshold: string }>;
  specialRates: {
    qualifiedSmallBusinessStock: string;
    collectibles: string;
    unrecaptured1250Gain: string;
  };
}

// NY State tax bracket structure
interface NYSTaxBracket {
  over: number;
  but_not_over: number | null;
  base_tax: number;
  plus: string | null;
  rate: number;
  of_excess_over: number;
}

interface TaxData {
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
  nysTaxRates: {
    married_jointly_or_surviving_spouse: NYSTaxBracket[];
    single_or_married_separately: NYSTaxBracket[];
    head_of_household: NYSTaxBracket[];
  };
}

export function getTaxData(): TaxData {
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
    
    const nysTaxRates = yaml.load(
      fs.readFileSync(path.join(rootDir, 'nys_tax_rate_schedules.yaml'), 'utf8')
    ) as { nysTaxRates: TaxData['nysTaxRates'] };

    return {
      taxBrackets,
      standardDeductions,
      capitalGainsRates: capitalGains.capitalGainsRates,
      nysTaxRates: nysTaxRates.nysTaxRates
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