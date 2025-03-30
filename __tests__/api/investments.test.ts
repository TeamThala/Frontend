import { GET } from '@/app/api/investments/route';
import Investment from '@/models/Investment';

jest.mock('@/lib/dbConnect', () => jest.fn(() => Promise.resolve()));
jest.mock('@/models/Investment');

describe('GET /api/investments', () => {
  const mockInvestments = [
    {
      _id: 'inv1',
      value: 10000,
      taxStatus: 'taxable',
      investmentType: { name: 'Stocks' },
    },
  ];

  beforeEach(() => {
    const populateMock = jest.fn().mockResolvedValue(mockInvestments);

    (Investment.find as jest.Mock).mockReturnValue({ populate: populateMock });
  });

  it('returns 200 and investment data on success', async () => {
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockInvestments);
  });

  it('returns 500 on failure', async () => {
    // force error
    (Investment.find as jest.Mock).mockImplementation(() => {
      throw new Error('DB fail');
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
  });
});
