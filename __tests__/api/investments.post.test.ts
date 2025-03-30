import { POST } from '@/app/api/investments/route';
import Investment from '@/models/Investment';

jest.mock('@/lib/dbConnect', () => jest.fn(() => Promise.resolve()));
jest.mock('@/models/Investment');

describe('POST /api/investments', () => {
  const mockBody = {
    value: 10000,
    taxStatus: 'taxable',
    investmentType: '649d1234abcd5678ef901234' // fake ObjectId
  };

  it('returns 201 and created investment', async () => {
    const mockCreated = { ...mockBody, _id: 'mock-id-123' };
    (Investment.create as jest.Mock).mockResolvedValue(mockCreated);

    const req = {
      json: async () => mockBody,
    } as any;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockCreated);
  });

  it('returns 500 on DB error', async () => {
    (Investment.create as jest.Mock).mockImplementation(() => {
      throw new Error('DB fail');
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
