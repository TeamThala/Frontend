import { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import Investment from "@/models/Investment";
import Event from "@/models/Event";
import User from "@/models/User";
import Scenario from "@/models/Scenario";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const scenarios = await Scenario.find({})
        .populate('investments')
        .populate('eventSeries')
        .populate('owner', 'name email')
        .populate('viewPermissions', 'name email')
        .populate('editPermissions', 'name email');
      res.status(200).json({ success: true, data: scenarios });
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch scenarios' });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}