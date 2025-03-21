import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Investment from '@/models/Investment';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const investment = await Investment.findById(id).populate('investmentType');
      
      if (!investment) {
        return res.status(404).json({ success: false, error: 'Investment not found' });
      }
      
      res.status(200).json({ success: true, data: investment });
    } catch (error) {
      console.error('Error fetching investment:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch investment' });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}