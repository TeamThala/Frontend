import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const event = await Event.findById(id)
        .populate({
          path: 'eventType.assetAllocation.investment',
          populate: {
            path: 'investmentType'
          }
        });
      
      if (!event) {
        return res.status(404).json({ success: false, error: 'Event not found' });
      }
      
      res.status(200).json({ success: true, data: event });
    } catch (error) {
      console.error('Error fetching event:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch event' });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}