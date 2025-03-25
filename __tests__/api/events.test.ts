import { GET } from '@/app/api/events/route';
import Event from '@/models/Event';

jest.mock('@/lib/dbConnect', () => jest.fn(() => Promise.resolve()));
jest.mock('@/models/Event');

describe('GET /api/events', () => {
  const mockEvents = [
    { _id: 'e1', name: 'Test Event' },
  ];

  beforeEach(() => {
    (Event.find as jest.Mock).mockResolvedValue(mockEvents);
  });

  it('returns 200 and events on success', async () => {
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockEvents);
  });

  it('returns 500 on DB error', async () => {
    (Event.find as jest.Mock).mockImplementation(() => {
      throw new Error('DB error');
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
  });
});
