import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const events = await Event.find({});
      res.status(200).json({ success: true, data: events });
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch events' });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}