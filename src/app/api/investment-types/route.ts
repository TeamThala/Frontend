import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import InvestmentType from '@/models/InvestmentType';

export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const investmentTypes = await InvestmentType.find({});
    return NextResponse.json({ success: true, data: investmentTypes }, { status: 200 });
  } catch (error) {
    console.error('Error fetching investment types:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch investment types' }, { status: 500 });
  }
}
