import { POST } from '@/app/api/investment-types/route';
import InvestmentType from '@/models/InvestmentType';

jest.mock('@/lib/dbConnect', () => jest.fn(() => Promise.resolve()));
jest.mock('@/models/InvestmentType');

describe('POST /api/investment-types', () => {
  const mockBody = {
    name: 'Growth Fund',
    description: 'Long-term growth investment',
    expectedAnnualReturn: {
      type: 'fixed',
      valueType: 'percentage',
      value: 0.07,
    },
    expenseRatio: 0.01,
    expectedAnnualIncome: {
      type: 'fixed',
      valueType: 'percentage',
      value: 0.02,
    },
    taxability: true,
  };

  it('returns 201 and created investment type', async () => {
    const mockCreated = { ...mockBody, _id: 'mock-id-123' };
    (InvestmentType.create as jest.Mock).mockResolvedValue(mockCreated);

    const req = {
      json: async () => mockBody,
    } as any;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockCreated);
  });

  it('returns 500 on DB failure', async () => {
    (InvestmentType.create as jest.Mock).mockImplementation(() => {
      throw new Error('DB crash');
    });

    const req = {
      json: async () => mockBody,
    } as any;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/Failed to create/);
  });
});
