import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Investment from '@/models/Investment';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const investments = await Investment.find({}).populate('investmentType');
      res.status(200).json({ success: true, data: investments });
    } catch (error) {
      console.error('Error fetching investments:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch investments' });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}