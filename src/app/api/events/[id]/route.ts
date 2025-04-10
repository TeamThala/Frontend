import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await params;

  try {
    const event = await Event.findById(id)
      .populate({
        path: 'eventType.assetAllocation.investment',
        populate: {
          path: 'investmentType'
        }
      });

    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: event }, { status: 200 });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch event' }, { status: 500 });
  }
}
