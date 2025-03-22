import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import "@/models/Investment";
import "@/models/Event";
import "@/models/User";
import "@/models/InvestmentType";
import Scenario from '@/models/Scenario';

export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const scenarios = await Scenario.find({})
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

    return NextResponse.json({ success: true, data: scenarios }, { status: 200 });
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch scenarios' }, { status: 500 });
  }
}
