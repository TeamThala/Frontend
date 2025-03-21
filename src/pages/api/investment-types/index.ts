import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import InvestmentType from '@/models/InvestmentType';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const investmentTypes = await InvestmentType.find({});
      res.status(200).json({ success: true, data: investmentTypes });
    } catch (error) {
      console.error('Error fetching investment types:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch investment types' });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}