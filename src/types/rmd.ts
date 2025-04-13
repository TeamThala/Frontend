// RMD types
export interface RmdTable {
  [age: number]: number;
}

export interface RmdTableData {
  year: number;
  table: RmdTable;
  isDefault?: boolean;
}

// Represents an investment account
export interface Investment {
  id: string;
  name: string;
  balance: number;
  accountType: 'pretax' | 'aftertax' | 'roth';
}

// RMD strategy defines the order in which investments should be distributed
export interface RmdStrategy {
  name: string;
  investmentOrder: string[]; // Array of investment IDs in order of liquidation
}

// Represents a single RMD distribution event
export interface RmdDistribution {
  year: number;
  age: number;
  pretaxAccountBalance: number;  // Total pre-tax balance before distribution
  distributionAmount: number;    // Total required distribution amount
  distributedInvestments: {      // Details of which investments were distributed
    investmentId: string;
    amount: number;
  }[];
} 