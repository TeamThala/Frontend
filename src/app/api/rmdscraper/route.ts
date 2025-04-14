import axios from 'axios';
import * as cheerio from 'cheerio';
import { NextResponse } from 'next/server';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

interface RmdTable {
  [age: number]: number;
}

interface RmdTableData {
  year: number;
  table: RmdTable;
  isDefault?: boolean;
}

export async function GET() {
  try {
    // Scrape RMD Table III (Uniform Life Table) from IRS Publication 590-B
    const rmdTableData = await scrapeRmdTable();
    
    // Save to YAML file
    await saveToYaml(rmdTableData, 'rmd_table.yaml');
    
    return NextResponse.json({ rmdTable: rmdTableData });
  } catch (error) {
    console.error('Error in RMD scraper:', error);
    return NextResponse.json({ error: 'Failed to scrape RMD data' }, { status: 500 });
  }
}

async function scrapeRmdTable(): Promise<RmdTableData> {
  try {
    const url = 'https://www.irs.gov/publications/p590b#en_US_2024_publink100090310';
    console.log('Fetching RMD data from:', url);
    
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);
    
    const rmdTable: RmdTable = {};
    let foundTable = false;
    
    // Direct targeting by anchor ID
    const tableSection = $('a[name="en_US_2024_publink100090310"]').closest('.table');
    
    if (tableSection.length > 0) {
      console.log('Found table section by anchor');
      foundTable = true;
      
      // Process all rows in the table
      tableSection.find('table tr').each((index, row) => {
        const cells = $(row).find('td');
        
        // Handle the 2-column pairs (age and distribution period)
        if (cells.length >= 4) {
          // First pair (left side of table)
          const age1 = parseInt($(cells[0]).text().trim());
          const period1 = parseFloat($(cells[1]).text().trim());
          
          // Second pair (right side of table)
          const age2 = parseInt($(cells[2]).text().trim());
          const period2 = parseFloat($(cells[3]).text().trim());
          
          // Add valid entries to the table
          if (!isNaN(age1) && !isNaN(period1)) {
            rmdTable[age1] = period1;
          }
          
          if (!isNaN(age2) && !isNaN(period2)) {
            rmdTable[age2] = period2;
          }
        }
      });
    }
    
    // If we couldn't find or parse the table, fallback to default values
    if (!foundTable || Object.keys(rmdTable).length === 0) {
      console.warn('RMD Table not found or empty, using default values');
      return getDefaultRmdTable();
    }
    
    console.log(`Successfully scraped RMD table with ${Object.keys(rmdTable).length} entries`);
    
    return { 
      year: new Date().getFullYear(),
      table: rmdTable 
    };
  } catch (error) {
    console.error('Error scraping RMD table:', error);
    return getDefaultRmdTable();
  }
}

function getDefaultRmdTable(): RmdTableData {
  // Actual 2022 Uniform Lifetime Table values
  const defaultTable: RmdTable = {
    72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7,
    77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4,
    82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2,
    87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5,
    92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4,
    97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0,
    102: 5.6, 103: 5.2, 104: 4.9, 105: 4.6, 106: 4.3,
    107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4,
    112: 3.3, 113: 3.1, 114: 3.0, 115: 2.9, 116: 2.8,
    117: 2.7, 118: 2.5, 119: 2.3, 120: 2.0
  };
  
  return {
    year: new Date().getFullYear(),
    table: defaultTable,
    isDefault: true
  };
}

async function saveToYaml(data: RmdTableData, filename: string): Promise<void> {
  const yamlData = yaml.dump(data, { indent: 2, lineWidth: -1 });
  const rootDir = process.cwd();
  const filePath = path.join(rootDir, filename);
  fs.writeFileSync(filePath, yamlData, 'utf8');
  console.log(`RMD YAML file saved at: ${filePath}`);
} 