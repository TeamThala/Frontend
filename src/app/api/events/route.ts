import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';

export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const events = await Event.find({});
    return NextResponse.json({ success: true, data: events }, { status: 200 });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch events' }, { status: 500 });
  }
}
