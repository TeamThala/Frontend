import { RmdTable, RmdTableData, Investment, RmdStrategy, RmdDistribution } from '@/types/rmd';
import RMDTable from '@/models/RMDTable';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class RMDService {
  private static instance: RMDService;
  private currentRmdTable: RmdTable | null = null;

  private constructor() {}

  public static getInstance(): RMDService {
    if (!RMDService.instance) {
      RMDService.instance = new RMDService();
    }
    return RMDService.instance;
  }

  /**
   * Get the RMD factor for a given age from the RMD table
   */
  public getRmdFactor(age: number): number {
    if (!this.currentRmdTable) {
      throw new Error('RMD table not loaded');
    }
    const factor = this.currentRmdTable[age];
    if (!factor) {
      throw new Error(`No RMD factor found for age ${age}`);
    }
    return factor;
  }

  /**
   * Calculate the RMD amount for a given age and account balance
   */
  public calculateRmd(accountBalance: number, age: number): number {
    const factor = this.getRmdFactor(age);
    return accountBalance / factor;
  }

  /**
   * Get the RMD table for a given year, fetching from database or scraping if needed
   */
  public async getRmdTable(year: number): Promise<RmdTable> {
    // Try to get from database first
    const dbTable = await RMDTable.findOne({ year });
    if (dbTable) {
      // Convert from database format to our internal format
      const table: RmdTable = {};
      dbTable.table.forEach(entry => {
        table[entry.age] = entry.distributionPeriod;
      });
      this.currentRmdTable = table;
      return table;
    }

    // If not in database, scrape and store
    const scrapedTable = await this.scrapeRmdTable();
    await this.storeRmdTable(scrapedTable, year);
    this.currentRmdTable = scrapedTable.table;
    return scrapedTable.table;
  }

  /**
   * Scrape the RMD table from IRS website
   */
  private async scrapeRmdTable(): Promise<RmdTableData> {
    try {
      const url = 'https://www.irs.gov/publications/p590b#en_US_2024_publink100090310';
      const { data: html } = await axios.get(url);
      const $ = cheerio.load(html);
      
      const rmdTable: RmdTable = {};
      const tableSection = $('a[name="en_US_2024_publink100090310"]').closest('.table');
      
      if (tableSection.length > 0) {
        tableSection.find('table tr').each((index, row) => {
          const cells = $(row).find('td');
          if (cells.length >= 4) {
            // First pair (left side of table)
            const age1 = parseInt($(cells[0]).text().trim());
            const period1 = parseFloat($(cells[1]).text().trim());
            
            // Second pair (right side of table)
            const age2 = parseInt($(cells[2]).text().trim());
            const period2 = parseFloat($(cells[3]).text().trim());
            
            if (!isNaN(age1) && !isNaN(period1)) {
              rmdTable[age1] = period1;
            }
            
            if (!isNaN(age2) && !isNaN(period2)) {
              rmdTable[age2] = period2;
            }
          }
        });
      }

      if (Object.keys(rmdTable).length === 0) {
        throw new Error('Failed to scrape RMD table');
      }

      return {
        year: new Date().getFullYear(),
        table: rmdTable
      };
    } catch (error) {
      console.error('Error scraping RMD table:', error);
      throw error;
    }
  }

  /**
   * Store the RMD table in the database
   */
  private async storeRmdTable(tableData: RmdTableData, year: number): Promise<void> {
    // Convert from our internal format to database format
    const tableEntries = Object.entries(tableData.table).map(([age, period]) => ({
      age: parseInt(age),
      distributionPeriod: period
    }));

    await RMDTable.create({
      year,
      table: tableEntries,
      updatedAt: new Date()
    });
  }

  /**
   * Execute RMD distributions according to the specified strategy
   */
  public async executeRmdDistribution(
    year: number,
    age: number,
    pretaxAccounts: Investment[],
    rmdStrategy: RmdStrategy
  ): Promise<RmdDistribution> {
    // Calculate total RMD amount
    const totalPretaxBalance = pretaxAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const rmdAmount = this.calculateRmd(totalPretaxBalance, age);

    // Execute distributions according to strategy
    const distributedInvestments: { investmentId: string; amount: number }[] = [];
    let remainingAmount = rmdAmount;

    for (const investmentId of rmdStrategy.investmentOrder) {
      if (remainingAmount <= 0) break;

      const investment = pretaxAccounts.find(acc => acc.id === investmentId);
      if (!investment) continue;

      const distributionAmount = Math.min(investment.balance, remainingAmount);
      distributedInvestments.push({
        investmentId,
        amount: distributionAmount
      });

      remainingAmount -= distributionAmount;
    }

    return {
      year,
      age,
      pretaxAccountBalance: totalPretaxBalance,
      distributionAmount: rmdAmount,
      distributedInvestments
    };
  }
} 