import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import InvestmentType from '@/models/InvestmentType';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const investmentType = await InvestmentType.findById(id);
      
      if (!investmentType) {
        return res.status(404).json({ success: false, error: 'Investment type not found' });
      }
      
      res.status(200).json({ success: true, data: investmentType });
    } catch (error) {
      console.error('Error fetching investment type:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch investment type' });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}