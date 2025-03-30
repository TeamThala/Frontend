import { NextResponse,NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import InvestmentType from '@/models/InvestmentType';

export async function GET() {
  await dbConnect();

  try {
    const investmentTypes = await InvestmentType.find({});
    return NextResponse.json({ success: true, data: investmentTypes }, { status: 200 });
  } catch (error) {
    console.error('Error fetching investment types:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch investment types' }, { status: 500 });
  }
}
export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const body = await req.json();
    const created = await InvestmentType.create(body);

    return NextResponse.json(
      { success: true, message: 'Investment type created', data: created },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating investment type:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create investment type' },
      { status: 500 }
    );
  }
}
