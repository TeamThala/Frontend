import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import InvestmentType from '@/models/InvestmentType';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await params;

  try {
    const investmentType = await InvestmentType.findById(id);

    if (!investmentType) {
      return NextResponse.json({ success: false, error: 'Investment type not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: investmentType }, { status: 200 });
  } catch (error) {
    console.error('Error fetching investment type:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch investment type' }, { status: 500 });
  }
}
