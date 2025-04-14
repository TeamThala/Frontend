import { RmdTable, RmdTableData, Investment, RmdStrategy, RmdDistribution } from '@/types/rmd';
import RMDTable from '@/models/RMDTable';

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
   * Get the RMD table for a given year, fetching from database or using scraper endpoint if needed
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

    // If not in database, use the scraper endpoint
    try {
      const response = await fetch('/api/rmdscraper');
      if (!response.ok) {
        throw new Error('Failed to fetch RMD table from scraper');
      }
      const data = await response.json();
      const scrapedTable = data.rmdTable as RmdTableData;

      // Store in database for future use
      await this.storeRmdTable(scrapedTable, year);
      
      this.currentRmdTable = scrapedTable.table;
      return scrapedTable.table;
    } catch (error) {
      console.error('Error fetching RMD table:', error);
      throw new Error('Failed to get RMD table');
    }
  }

  /**
   * Store the RMD table in the database
   */
  private async storeRmdTable(tableData: RmdTableData, year: number): Promise<void> {
    try {
      console.log('Converting RMD table data for storage:', { year, tableSize: Object.keys(tableData.table).length });
      
      // Convert from our internal format to database format
      const tableEntries = Object.entries(tableData.table).map(([age, distributionPeriod]) => ({
        age: parseInt(age),
        distributionPeriod
      }));

      console.log('Converted table entries:', tableEntries);

      // Create or update the table for the year
      const result = await RMDTable.findOneAndUpdate(
        { year },
        {
          year,
          table: tableEntries,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      console.log('Stored RMD table in database:', {
        year: result.value?.year,
        entriesCount: result.value?.table?.length,
        id: result.value?._id
      });
    } catch (error: any) {
      console.error('Error storing RMD table:', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to store RMD table in database: ${error.message}`);
    }
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