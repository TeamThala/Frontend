import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Investment from '@/models/Investment';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await dbConnect();
  const { id } = params;

  try {
    const investment = await Investment.findById(id).populate('investmentType');

    if (!investment) {
      return NextResponse.json({ success: false, error: 'Investment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: investment }, { status: 200 });
  } catch (error) {
    console.error('Error fetching investment:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch investment' }, { status: 500 });
  }
}
