import { POST } from '@/app/api/events/route';
import Event from '@/models/Event';

jest.mock('@/lib/dbConnect', () => jest.fn(() => Promise.resolve()));
jest.mock('@/models/Event');

describe('POST /api/events', () => {
  const mockEventBody = {
    name: 'Test Event',
    description: 'Testing an event post',
    startYear: { type: 'fixed', year: 2025 },
    eventType: {
      type: 'income',
      amount: 1000,
      expectedAnnualChange: {
        type: 'fixed',
        valueType: 'amount',
        value: 0,
      },
      inflationAdjustment: false,
      percentageOfIncome: 0,
      socialSecurity: false,
    },
  };

  it('returns 201 and created event on success', async () => {
    const mockCreated = { ...mockEventBody, _id: 'mockedid123' };
    (Event.create as jest.Mock).mockResolvedValue(mockCreated);

    const req = {
      json: async () => mockEventBody,
    } as any;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockCreated);
  });

  it('returns 500 if Event.create fails', async () => {
    (Event.create as jest.Mock).mockImplementation(() => {
      throw new Error('DB failure');
    });

    const req = {
      json: async () => mockEventBody,
    } as any;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/Failed to create/);
  });
});
