import { GET } from '@/app/api/investment-types/route';
import InvestmentType from '@/models/InvestmentType';

jest.mock('@/lib/dbConnect', () => jest.fn(() => Promise.resolve()));
jest.mock('@/models/InvestmentType');

describe('GET /api/investment-types', () => {
  const mockTypes = [
    { _id: 't1', name: 'Stocks' },
  ];

  beforeEach(() => {
    (InvestmentType.find as jest.Mock).mockResolvedValue(mockTypes);
  });

  it('returns 200 and investment types on success', async () => {
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockTypes);
  });

  it('returns 500 on DB error', async () => {
    (InvestmentType.find as jest.Mock).mockImplementation(() => {
      throw new Error('DB fail');
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
  });
});
