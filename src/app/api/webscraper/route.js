//merged route.js
import axios from 'axios';
import * as cheerio from 'cheerio';
import { NextResponse } from 'next/server';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // 1. Tax Brackets Scraper
    const taxBracketsUrl = 'https://www.irs.gov/filing/federal-income-tax-rates-and-brackets';
    const labels = ["rate", "from", "upto"];
    const mainLabels = ["single", "married-joint", "married-separate", "head-of-household"];
    
    const taxBrackets = await scrapeTaxBrackets(taxBracketsUrl, labels, mainLabels);
    await saveToYaml(taxBrackets, 'tax_brackets.yaml');

    // 2. Standard Deductions Scraper
    const deductionsUrl = 'https://www.irs.gov/publications/p17#en_US_2024_publink1000283782';
    const standardDeductions = await scrapeStandardDeductions(deductionsUrl);
    await saveToYaml({ standardDeductions }, 'standard_deductions.yaml');

    // 3. Capital Gains Scraper
    const capitalGainsUrl = 'https://www.irs.gov/taxtopics/tc409';
    const capitalGains = await scrapeCapitalGains(capitalGainsUrl);
    await saveToYaml({ capitalGainsRates: capitalGains }, 'capital_gains.yaml');

    // Return all results
    return NextResponse.json({
      taxBrackets,
      standardDeductions,
      capitalGains
    });

  } catch (error) {
    console.error('Error in main scraper:', error);
    return NextResponse.json({ error: 'Failed to scrape data' }, { status: 500 });
  }
}

async function scrapeTaxBrackets(url, labels, mainLabels) {
  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });

  const $ = cheerio.load(html);
  const table = $('table.table.complex-table.table-striped.table-bordered.table-responsive');
  const result = {};
  let currentMainLabel = mainLabels[0];
  let currentIndex = 0;

  table.find('tbody tr').each((i, tr) => {
    const row = {};
    const cells = $(tr).find('td');
    
    if (cells.length > 0) {
      cells.each((j, td) => {
        const cellText = $(td).text().trim();
        if (cellText) {
          row[labels[j]] = cellText;
        }
      });

      if (Object.keys(row).length > 0) {
        if (!result[currentMainLabel]) {
          result[currentMainLabel] = [];
        }

        const currentSection = result[currentMainLabel];
        const has10PercentRate = currentSection.some(item => item.rate === "10%");
        const previousRate = currentSection.length > 0 ? 
          currentSection[currentSection.length - 1].rate : null;

        if (row.rate === "10%" && (has10PercentRate || previousRate === "37%")) {
          currentIndex++;
          if (currentIndex < mainLabels.length) {
            currentMainLabel = mainLabels[currentIndex];
            if (!result[currentMainLabel]) {
              result[currentMainLabel] = [];
            }
          }
        }

        result[currentMainLabel].push(row);
      }
    }
  });

  return result;
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
