import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Investment from '@/models/Investment';

export async function GET() {
  await dbConnect();

  try {
    const investments = await Investment.find({}).populate('investmentType');
    return NextResponse.json({ success: true, data: investments }, { status: 200 });
  } catch (error) {
    console.error('Error fetching investments:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch investments' }, { status: 500 });
  }
}
export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const body = await req.json();
    const created = await Investment.create(body);

    return NextResponse.json(
      { success: true, message: 'Investment created', data: created },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating investment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create investment' },
      { status: 500 }
    );
  }
}