import { GET, POST } from '@/app/api/rmd/route';
import { RMDService } from '@/services/rmdService';
import { Investment, RmdStrategy, RmdDistribution } from '@/types/rmd';
import { expect } from '@jest/globals';

// Mock RMDService
jest.mock('@/services/rmdService', () => ({
  RMDService: {
    getInstance: jest.fn()
  }
}));

describe('RMD API Endpoints', () => {
  const mockRmdTable = {
    year: 2024,
    table: {
      72: 27.4,
      73: 26.5,
      74: 25.5,
      75: 24.6,
      76: 23.7,
      80: 20.2,
      85: 16.0
    },
    isDefault: false
  };

  const mockInvestments: Investment[] = [
    {
      id: 'pretax1',
      name: 'Traditional IRA',
      balance: 100000,
      accountType: 'pretax'
    },
    {
      id: 'pretax2',
      name: '401(k)',
      balance: 200000,
      accountType: 'pretax'
    },
    {
      id: 'roth1',
      name: 'Roth IRA',
      balance: 50000,
      accountType: 'roth'
    }
  ];

  const mockRmdStrategy: RmdStrategy = {
    name: 'Default RMD Strategy',
    investmentOrder: ['pretax1', 'pretax2']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (RMDService.getInstance as jest.Mock).mockReturnValue({
      getRmdTable: jest.fn().mockResolvedValue(mockRmdTable),
      getRmdFactor: jest.fn().mockImplementation((age) => {
        // For GET endpoint, use the current age's factor
        // For POST endpoint, use the previous year's factor
        return mockRmdTable.table[age];
      }),
      executeRmdDistribution: jest.fn().mockImplementation((year, age, accounts, strategy) => {
        const factor = mockRmdTable.table[age];
        const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
        const distributionAmount = Number((totalBalance / factor).toFixed(2));

        if (totalBalance === 0) {
          return Promise.resolve({
            year,
            age,
            pretaxAccountBalance: 0,
            distributionAmount: 0,
            distributedInvestments: []
          });
        }

        const distributedInvestments: { investmentId: string; amount: number }[] = [];
        let remainingAmount = distributionAmount;

        // Process all accounts in the strategy order
        for (const investmentId of strategy.investmentOrder) {
          const account = accounts.find(acc => acc.id === investmentId);
          if (account) {
            const amount = remainingAmount > 0 
              ? Number(Math.min(account.balance, remainingAmount).toFixed(2))
              : 0;
            distributedInvestments.push({
              investmentId,
              amount
            });
            remainingAmount = Number((remainingAmount - amount).toFixed(2));
          }
        }

        return Promise.resolve({
          year,
          age,
          pretaxAccountBalance: totalBalance,
          distributionAmount,
          distributedInvestments
        });
      })
    });
  });

  describe('GET /api/rmd', () => {
    it('should return RMD factor and table for valid age', async () => {
      const request = new Request('http://localhost/api/rmd?distributionYear=2024&age=74');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('distributionYear', 2024);
      expect(data).toHaveProperty('age', 74);
      expect(data).toHaveProperty('previousYearAge', 73);
      expect(data).toHaveProperty('factor', 26.5); // Factor for age 73 from default table
      expect(data).toHaveProperty('rmdTable');
    });

    it('should return error for age below RMD threshold', async () => {
      const request = new Request('http://localhost/api/rmd?distributionYear=2024&age=72');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('RMDs start at age 73 and are paid in the year the person turns 74');
    });

    it('should handle non-numeric age', async () => {
      const request = new Request('http://localhost/api/rmd?distributionYear=2024&age=invalid');
      const response = await GET(request);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('age', null);
    });

    it('should handle missing age parameter', async () => {
      const request = new Request('http://localhost/api/rmd?distributionYear=2024');
      const response = await GET(request);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('age', 74); // Default age should be used
    });

    it('should handle maximum age (120)', async () => {
      const request = new Request('http://localhost/api/rmd?distributionYear=2024&age=120');
      const response = await GET(request);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('age', 120);
      expect(data).toHaveProperty('previousYearAge', 119);
    });
  });

  describe('POST /api/rmd', () => {
    it('should calculate RMD for single pretax account', async () => {
      const request = new Request('http://localhost/api/rmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distributionYear: 2024,
          age: 74,
          previousYearPretaxAccounts: [mockInvestments[0]],
          rmdStrategy: mockRmdStrategy
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.distribution).toHaveProperty('distributionAmount', 3921.57); // 100000 / 25.5
      expect(data.distribution.distributedInvestments).toHaveLength(1);
      expect(data.distribution.distributedInvestments[0]).toEqual({
        investmentId: 'pretax1',
        amount: 3921.57
      });
    });

    it('should calculate RMD for multiple pretax accounts', async () => {
      const request = new Request('http://localhost/api/rmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distributionYear: 2024,
          age: 74,
          previousYearPretaxAccounts: [mockInvestments[0], mockInvestments[1]],
          rmdStrategy: mockRmdStrategy
        })
      });

      const response = await POST(request);
      const data = await response.json();

      const totalBalance = 300000; // 100000 + 200000
      const distributionAmount = Number((totalBalance / 25.5).toFixed(2)); // 11764.71

      expect(response.status).toBe(200);
      expect(data.distribution).toHaveProperty('distributionAmount', distributionAmount);
      expect(data.distribution.distributedInvestments).toHaveLength(2);
      expect(data.distribution.distributedInvestments[0]).toEqual({
        investmentId: 'pretax1',
        amount: 11764.71
      });
      expect(data.distribution.distributedInvestments[1]).toEqual({
        investmentId: 'pretax2',
        amount: 0
      });
    });

    it('should handle RMD with zero balance', async () => {
      const request = new Request('http://localhost/api/rmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distributionYear: 2024,
          age: 74,
          previousYearPretaxAccounts: [],
          rmdStrategy: mockRmdStrategy
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.distribution).toHaveProperty('distributionAmount', 0);
      expect(data.distribution.distributedInvestments).toHaveLength(0);
    });

    it('should handle different RMD strategies', async () => {
      const reverseStrategy: RmdStrategy = {
        name: 'Reverse RMD Strategy',
        investmentOrder: ['pretax2', 'pretax1']
      };

      const request = new Request('http://localhost/api/rmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distributionYear: 2024,
          age: 74,
          previousYearPretaxAccounts: [mockInvestments[0], mockInvestments[1]],
          rmdStrategy: reverseStrategy
        })
      });

      const response = await POST(request);
      const data = await response.json();

      const totalBalance = 300000; // 100000 + 200000
      const distributionAmount = Number((totalBalance / 25.5).toFixed(2)); // 11764.71

      expect(response.status).toBe(200);
      expect(data.distribution).toHaveProperty('distributionAmount', distributionAmount);
      expect(data.distribution.distributedInvestments).toHaveLength(2);
      expect(data.distribution.distributedInvestments[0]).toEqual({
        investmentId: 'pretax2',
        amount: 11764.71
      });
      expect(data.distribution.distributedInvestments[1]).toEqual({
        investmentId: 'pretax1',
        amount: 0
      });
    });

    it('should handle different ages with correct factors', async () => {
      const ages = [74, 80, 85];
      const expectedFactors = [25.5, 20.2, 16.0];

      for (let i = 0; i < ages.length; i++) {
        const request = new Request('http://localhost/api/rmd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            distributionYear: 2024,
            age: ages[i],
            previousYearPretaxAccounts: [mockInvestments[0]],
            rmdStrategy: mockRmdStrategy
          })
        });

        const response = await POST(request);
        const data = await response.json();

        const expectedAmount = Number((100000 / expectedFactors[i]).toFixed(2));
        expect(response.status).toBe(200);
        expect(data.distribution).toHaveProperty('distributionAmount', expectedAmount);
        expect(data.distribution.distributedInvestments).toHaveLength(1);
        expect(data.distribution.distributedInvestments[0]).toEqual({
          investmentId: 'pretax1',
          amount: expectedAmount
        });
      }
    });

    it('should handle invalid RMD strategy', async () => {
      const request = new Request('http://localhost/api/rmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distributionYear: 2024,
          age: 74,
          previousYearPretaxAccounts: [mockInvestments[0]],
          rmdStrategy: { invalid: 'strategy' }
        })
      });
      const response = await POST(request);
      expect(response.status).toBe(500); // Current implementation returns 500 for invalid strategy
    });

    it('should handle large account balances', async () => {
      const largeBalanceInvestment = {
        ...mockInvestments[0],
        balance: 10000000
      };
      const request = new Request('http://localhost/api/rmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distributionYear: 2024,
          age: 74,
          previousYearPretaxAccounts: [largeBalanceInvestment],
          rmdStrategy: mockRmdStrategy
        })
      });
      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.distribution.distributionAmount).toBeGreaterThan(0);
    });

    it('should handle negative balances', async () => {
      const negativeBalanceInvestment = {
        ...mockInvestments[0],
        balance: -1000
      };
      const request = new Request('http://localhost/api/rmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distributionYear: 2024,
          age: 74,
          previousYearPretaxAccounts: [negativeBalanceInvestment],
          rmdStrategy: mockRmdStrategy
        })
      });
      const response = await POST(request);
      expect(response.status).toBe(200); // Current implementation allows negative balances
    });

    it('should handle decimal ages', async () => {
      const request = new Request('http://localhost/api/rmd?distributionYear=2024&age=73.5');
      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it('should handle missing required fields in POST', async () => {
      const request = new Request('http://localhost/api/rmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing required fields
          distributionYear: 2024
        })
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
}); 