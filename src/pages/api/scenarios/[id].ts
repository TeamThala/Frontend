import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import "@/models/Investment";
import "@/models/Event";
import "@/models/User";
import "@/models/InvestmentType";
import Scenario from '@/models/Scenario';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const { id } = req.query;
  const scenarioId = Array.isArray(id) ? id[0] : id;

  // ✅ Guard against undefined or invalid ObjectId
  if (!scenarioId || !mongoose.Types.ObjectId.isValid(scenarioId)) {
    return res.status(400).json({ success: false, error: "Invalid scenario ID" });
  }

  if (req.method === 'GET') {
    try {
      const scenario = await Scenario.findById(scenarioId)
        .populate({
          path: 'investments',
          populate: { path: 'investmentType' }
        })
        .populate('eventSeries')
        .populate('spendingStrategy')
        .populate('expenseWithdrawalStrategy')
        .populate('owner', 'name email')
        .populate('viewPermissions', 'name email')
        .populate('editPermissions', 'name email');

      if (!scenario) {
        return res.status(404).json({ success: false, error: 'Scenario not found' });
      }

      res.status(200).json({ success: true, data: scenario });
    } catch (error) {
      console.error('Error fetching scenario:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch scenario' });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
