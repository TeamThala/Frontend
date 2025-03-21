import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import "@/models/Investment";
import "@/models/Event";
import "@/models/User";
import "@/models/InvestmentType";
import Scenario from '@/models/Scenario';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await dbConnect();
  const scenarioId = params.id;

  if (!scenarioId || !mongoose.Types.ObjectId.isValid(scenarioId)) {
    return NextResponse.json({ success: false, error: "Invalid scenario ID" }, { status: 400 });
  }

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
      return NextResponse.json({ success: false, error: 'Scenario not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: scenario }, { status: 200 });
  } catch (error) {
    console.error('Error fetching scenario:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch scenario' }, { status: 500 });
  }
}
