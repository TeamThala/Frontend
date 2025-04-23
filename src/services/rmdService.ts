import { RmdTable, RmdTableData, Investment, RmdStrategy, RmdDistribution } from '@/types/rmd';
import RMDTable from '@/models/RMDTable';
import { Document } from 'mongodb';

// Interface for MongoDB RMD table document
interface RmdTableDocument extends Document {
  year: number;
  table: Array<{ age: number; distributionPeriod: number }>;
  updatedAt: Date;
  isDefault: boolean;
}

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
   * Get the RMD factor for a given age
   */
  public getRmdFactor(age: number): number {
    if (!this.currentRmdTable) {
      throw new Error('RMD table not loaded');
    }
    const factor = this.currentRmdTable[age];
    if (factor === undefined) {
      throw new Error(`No RMD factor found for age ${age}`);
    }
    return factor;
  }

  /**
   * Calculate the RMD amount for a distribution year based on previous year's balance and age
   * @param accountBalance The total balance of pre-tax accounts as of December 31 of the previous year
   * @param age The person's age at the end of the previous year
   * @returns The RMD amount that must be distributed by December 31 of the current year
   */
  public calculateRmd(accountBalance: number, age: number): number {
    if (age < 73) { // RMD calculations only start at age 73
      throw new Error('RMD calculations start at age 73 per SECURE 2.0 Act');
    }
    
    if (accountBalance < 0) {
      throw new Error('Account balance cannot be negative');
    }

    const factor = this.getRmdFactor(age);
    return accountBalance / factor;
  }

  /**
   * Retrieve the RMD table from DB or scrape if missing
   */
  public async getRmdTable(year: number): Promise<RmdTable> {
    // Get data from MongoDB directly
    const dbTable = await RMDTable.findOne({ year }) as unknown as RmdTableDocument | null;

    if (dbTable && Array.isArray(dbTable.table)) {
      const table: RmdTable = {};
      dbTable.table.forEach((entry: { age: number; distributionPeriod: number }) => {
        table[entry.age] = entry.distributionPeriod;
      });
      this.currentRmdTable = table;
      return table;
    }

    // Fallback: use scraper API
    try {
      const response = await fetch('/api/rmdscraper');
      if (!response.ok) throw new Error('Failed to fetch RMD table from scraper');
      const data = (await response.json()) as { rmdTable: RmdTableData };

      // Store in database first
      await this.storeRmdTable(data.rmdTable, year);

      // Convert scraped data to RmdTable format
      const table: RmdTable = {};
      Object.entries(data.rmdTable.table).forEach(([age, distributionPeriod]) => {
        table[parseInt(age)] = distributionPeriod;
      });
      
      this.currentRmdTable = table;
      return table;
    } catch (error) {
      console.error('Error fetching RMD table:', error);
      throw new Error('Failed to get RMD table');
    }
  }

  /**
   * Store the fetched RMD table into the database
   */
  private async storeRmdTable(tableData: RmdTableData, year: number): Promise<void> {
    try {
      const tableEntries = Object.entries(tableData.table).map(([age, distributionPeriod]) => ({
        age: parseInt(age, 10),
        distributionPeriod,
      }));

      const result = await RMDTable.findOneAndUpdate(
        { year },
        {
          year,
          table: tableEntries,
          updatedAt: new Date(),
          isDefault: tableData.isDefault ?? false,
        },
        {
          upsert: true,
          returnDocument: 'after',
        }
      );

      console.log('Stored RMD table:', {
        year: result?.year,
        count: result?.table?.length,
        id: result?._id,
      });
    } catch (err) {
      if (err instanceof Error) {
        console.error('Error storing RMD table:', err.message);
        throw new Error(`Failed to store RMD table: ${err.message}`);
      } else {
        throw new Error('Unknown error storing RMD table');
      }
    }
  }

  /**
   * Execute RMD distributions according to strategy.
   * @param distributionYear The year in which the RMD must be distributed (Y+1)
   * @param age The person's current age in the distribution year
   * @param previousYearPretaxAccounts Pre-tax accounts with balances as of December 31 of previous year
   * @param rmdStrategy Strategy determining which accounts to withdraw from
   */
  public async executeRmdDistribution(
    distributionYear: number,
    age: number,
    previousYearPretaxAccounts: Investment[],
    rmdStrategy: RmdStrategy
  ): Promise<RmdDistribution> {
    // Validate age requirements per SECURE 2.0 Act
    if (age < 74) {
      throw new Error('RMDs start at age 73 and are paid in the year the person turns 74');
    }

    // Calculate RMD using previous year's values
    const previousYearAge = age - 1;  // Age at the end of the year for which RMD is being calculated
    const previousYearBalance = previousYearPretaxAccounts.reduce((sum, inv) => sum + inv.balance, 0);
    
    // Calculate RMD amount that must be distributed by December 31 of distributionYear
    const rmdAmount = this.calculateRmd(previousYearBalance, previousYearAge);

    const distributedInvestments: RmdDistribution['distributedInvestments'] = [];
    let remaining = rmdAmount;

    for (const investmentId of rmdStrategy.investmentOrder) {
      if (remaining <= 0) break;

      const investment = previousYearPretaxAccounts.find(acc => acc.id === investmentId);
      if (!investment) continue;

      const distribution = Math.min(investment.balance, remaining);
      distributedInvestments.push({ investmentId, amount: distribution });
      remaining -= distribution;
    }

    return {
      year: distributionYear,
      age,
      pretaxAccountBalance: previousYearBalance,
      distributionAmount: rmdAmount,
      distributedInvestments,
    };
  }
}
