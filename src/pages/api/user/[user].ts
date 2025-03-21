import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Investment from "@/models/Investment";
import Event from "@/models/Event";
import User from "@/models/User";
import Scenario from "@/models/Scenario";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const { userId } = req.query;

  if (req.method === 'GET') {
    try {
      // Find scenarios where user is owner or has view/edit permissions
      const scenarios = await Scenario.find({
        $or: [
          { owner: userId },
          { viewPermissions: userId },
          { editPermissions: userId }
        ]
      })
      .populate('investments')
      .populate('eventSeries')
      .populate('owner', 'name email');
      
      res.status(200).json({ success: true, data: scenarios });
    } catch (error) {
      console.error('Error fetching user scenarios:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch user scenarios' });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
