//merged route.js
import axios from 'axios';
import * as cheerio from 'cheerio';
import { NextResponse } from 'next/server';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

export async function GET() {
  try {
    // 1. Tax Brackets Scraper
    const taxBracketsUrl = process.env.TAX_BRACKETS_URL;
    if (!taxBracketsUrl) {
      throw new Error('TAX_BRACKETS_URL is not defined in environment variables');
    }
    
    const taxBrackets = await scrapeTaxBrackets(taxBracketsUrl);
    await saveToYaml(taxBrackets, 'tax_brackets.yaml');

    // 2. Standard Deductions Scraper
    const deductionsUrl = process.env.STANDARD_DEDUCTIONS_URL;
    if (!deductionsUrl) {
      throw new Error('STANDARD_DEDUCTIONS_URL is not defined in environment variables');
    }
    const standardDeductions = await scrapeStandardDeductions(deductionsUrl);
    await saveToYaml({ standardDeductions }, 'standard_deductions.yaml');

    // 3. Capital Gains Scraper
    const capitalGainsUrl = process.env.CAPITAL_GAINS_URL;
    if (!capitalGainsUrl) {
      throw new Error('CAPITAL_GAINS_URL is not defined in environment variables');
    }
    const capitalGains = await scrapeCapitalGains(capitalGainsUrl);
    await saveToYaml({ capitalGainsRates: capitalGains }, 'capital_gains.yaml');

    // 4. NYS Tax Rate Table Scraper
    const nysTaxRatesUrl = process.env.NYS_TAX_RATES_URL;
    if (!nysTaxRatesUrl) {
      throw new Error('NYS_TAX_RATES_URL is not defined in environment variables');
    }
    const nysTaxRates = await scrapeNysTaxRates(nysTaxRatesUrl);
    await saveToYaml({ nysTaxRates }, 'nys_tax_rate_schedules.yaml');

    // Return all results
    return NextResponse.json({
        taxBrackets,
        standardDeductions,
        capitalGains,
        nysTaxRates
    });

  } catch (error) {
    console.error('Error in main scraper:', error);
    return NextResponse.json({ error: error.message || 'Failed to scrape data' }, { status: 500 });
  }
}

async function scrapeTaxBrackets(url) {
  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });

  const $ = cheerio.load(html);
  const taxBrackets = {
    single: [],
    'married-joint': [],
    'married-separate': [],
    'head-of-household': []
  };

  // Find all tax rate tables
  const tables = $('table.table.complex-table.table-striped.table-bordered.table-responsive');
  
  if (tables.length === 0) {
    console.error('No tax rate tables found');
    return taxBrackets;
  }

  // Process each table
  tables.each((tableIndex, table) => {
    const rows = $(table).find('tbody tr');
    const currentBrackets = [];

    rows.each((rowIndex, row) => {
      const cells = $(row).find('td');
      if (cells.length === 3) { // Ensure it's a data row
        const rate = $(cells[0]).text().trim();
        const from = $(cells[1]).text().trim();
        const upto = $(cells[2]).text().trim();

        if (rate && from && upto) {
          currentBrackets.push({
            rate,
            from,
            upto
          });
        }
      }
    });

    // Assign the brackets to the appropriate category based on the table index
    if (currentBrackets.length > 0) {
      switch (tableIndex) {
        case 0:
          taxBrackets.single = currentBrackets;
          break;
        case 1:
          taxBrackets['married-joint'] = currentBrackets;
          break;
        case 2:
          taxBrackets['married-separate'] = currentBrackets;
          break;
        case 3:
          taxBrackets['head-of-household'] = currentBrackets;
          break;
      }
    }
  });

  // Log the number of brackets found for each category
  Object.entries(taxBrackets).forEach(([key, brackets]) => {
    console.log(`Found ${brackets.length} brackets for ${key}`);
  });

  return taxBrackets;
}

async function scrapeStandardDeductions(url) {
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  const table = $('a[name="en_US_2024_publink1000283782"]').closest('.table');
  const result = {};
  
  table.find('tr').each((i, row) => {
    if (i > 0 && i < 4) {
      const columns = $(row).find('td');
      const status = $(columns[0]).text().trim();
      const amount = $(columns[1]).text().trim();
      const cleanAmount = parseInt(amount.replace(/[$,]/g, ''));
      result[status] = cleanAmount;
    }
  });

  return result;
}


async function scrapeCapitalGains(url) {
  try {
    console.log('Fetching capital gains data from:', url);
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);
    
    // Try different selectors to find the content
    const articleText = $('article').text();
    const mainText = $('#main-content').text();
    const bodyText = $('body').text();
    
    console.log('\nArticle text length:', articleText.length);
    console.log('Main content length:', mainText.length);
    console.log('Body text length:', bodyText.length);
    
    // Use the longest text content
    const text = [articleText, mainText, bodyText].reduce((a, b) => a.length > b.length ? a : b);
    const normalized = text.replace(/\s+/g, ' ').trim();
    
    console.log('\nFirst 500 characters of normalized text:', normalized.substring(0, 500));
    
    const result = {
      zeroPercent: [],
      fifteenPercent: [],
      twentyPercent: [],
      specialRates: {}
    };

    // Try to find any mention of 15%
    const fifteenPercentMentions = normalized.match(/15%/g);
    console.log('\nNumber of 15% mentions:', fifteenPercentMentions ? fifteenPercentMentions.length : 0);
    
    // Look for numbers near 15% mentions
    const numberPattern = /\$[\d,]+/g;
    const fifteenContext = normalized.split('15%').map(part => {
      const numbers = part.match(numberPattern);
      return numbers ? numbers : [];
    });
    console.log('\nNumbers found near 15%:', fifteenContext);

    // Simplified 15% pattern
    const simpleFifteenPattern = /15%.*?\$([\d,]+).*?\$([\d,]+).*?single.*?\$([\d,]+).*?\$([\d,]+).*?married.*?\$([\d,]+).*?\$([\d,]+).*?head/i;
    const fifteenMatch = normalized.match(simpleFifteenPattern);
    
    console.log('\n15% match result:', fifteenMatch ? 'Found match' : 'No match');
    if (fifteenMatch) {
      console.log('Match groups:', fifteenMatch.slice(1));
    }

    if (fifteenMatch) {
      result.fifteenPercent = [
        { 
          status: 'Single', 
          range: { 
            from: `$${fifteenMatch[1]}`, 
            to: `$${fifteenMatch[2]}` 
          } 
        },
        { 
          status: 'Married Filing Jointly', 
          range: { 
            from: `$${fifteenMatch[3]}`, 
            to: `$${fifteenMatch[4]}` 
          } 
        },
        {
          status: 'Married Filing Separately',
          range: {
            from: `$${fifteenMatch[5]}`,
            to: `$${fifteenMatch[6]}`
          }
        }
      ];
    }

    // Zero percent match
    const zeroPattern = /0% applies if your taxable income is less than or equal to: \$([\d,]+) for single.*?\$([\d,]+) for married filing jointly.*?\$([\d,]+) for head of household/i;
    const zeroMatch = normalized.match(zeroPattern);
    if (zeroMatch) {
      result.zeroPercent = [
        { status: 'Single', threshold: `$${zeroMatch[1]}` },
        { status: 'Married Filing Jointly', threshold: `$${zeroMatch[2]}` },
        { status: 'Head of Household', threshold: `$${zeroMatch[3]}` }
      ];
    }

    // Twenty percent match
    const twentyPattern = /20% applies to the extent that your taxable income exceeds the thresholds set for the 15% capital gain rate/i;
    const twentyMatch = normalized.match(twentyPattern);
    if (twentyMatch) {
      result.twentyPercent = [
        { status: 'Single', threshold: 'Above 15% threshold' },
        { status: 'Married Filing Jointly', threshold: 'Above 15% threshold' },
        { status: 'Head of Household', threshold: 'Above 15% threshold' }
      ];
    }

    // Special rates match
    const specialPattern = /selling section 1202.*?maximum (\d+)%.*?collectibles.*?maximum (\d+)%.*?unrecaptured section 1250.*?maximum (\d+)%/i;
    const specialMatch = normalized.match(specialPattern);
    if (specialMatch) {
      result.specialRates = {
        qualifiedSmallBusinessStock: `${specialMatch[1]}%`,
        collectibles: `${specialMatch[2]}%`,
        unrecaptured1250Gain: `${specialMatch[3]}%`
      };
    }

    console.log('\nFinal result:', JSON.stringify(result, null, 2));
    return result;
    
  } catch (error) {
    console.error('Error in scrapeCapitalGains:', error);
    throw error;
  }
}

// NY State Income Tax Tables
async function scrapeNysTaxRates(url) {
  try {
    const browser = await puppeteer.launch({
      headless: 'new'
    });
    const page = await browser.newPage();
    
    // Navigate to the page and wait for it to load
    await page.goto(url, {
      waitUntil: 'networkidle0'
    });

    // Wait for tables to be present
    await page.waitForSelector('.tableborder');

    const result = {};

    // Function to parse table data
    const parseTable = async (tableId, label) => {
      const data = await page.evaluate((selector) => {
        const rows = document.querySelectorAll(`${selector} tbody tr`);
        const tableData = [];
        
        // Skip first two header rows
        for (let i = 2; i < rows.length; i++) {
          const cols = rows[i].querySelectorAll('td');
          if (cols.length === 7) {
            const over = cols[0].textContent.trim().replace('$', '').replace(/,/g, '');
            const butNotOver = cols[1].textContent.trim();
            const baseTax = cols[2].textContent.trim().replace('$', '').replace(/,/g, '') || '0';
            const rate = cols[4].textContent.trim().replace('%', '');
            const excessOver = cols[6].textContent.trim().replace('$', '').replace(/,/g, '') || '0';

            tableData.push({
              over: Number(over),
              but_not_over: butNotOver === '----' ? null : Number(butNotOver.replace('$', '').replace(/,/g, '')),
              base_tax: Number(baseTax),
              plus: cols[3].textContent.trim() || null,
              rate: Number(rate),
              of_excess_over: Number(excessOver)
            });
          }
        }
        return tableData;
      }, `#${tableId}`);

      return data;
    };

    // Parse each table
    const tables = {
      'table-28': 'married_jointly_or_surviving_spouse',
      'table-29': 'single_or_married_separately',
      'table-30': 'head_of_household'
    };

    for (const [tableId, label] of Object.entries(tables)) {
      result[label] = await parseTable(tableId, label);
      console.log(`Processed ${label}: ${result[label].length} entries`);
    }

    await browser.close();
    return result;

  } catch (error) {
    console.error('Error scraping tax rates:', error);
    throw error;
  }
}

async function saveToYaml(data, filename) {
  try {
    const yamlData = yaml.dump(data, {
      indent: 2,
      lineWidth: -1
    });

    const rootDir = process.cwd();
    const filePath = path.join(rootDir, filename);
    fs.writeFileSync(filePath, yamlData, 'utf8');
    console.log(`YAML file saved successfully at: ${filePath}`);
  } catch (error) {
    console.error(`Error saving ${filename}:`, error);
  }
}