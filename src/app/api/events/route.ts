import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';

export async function GET() {
  await dbConnect();

  try {
    const events = await Event.find({});
    return NextResponse.json({ success: true, data: events }, { status: 200 });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch events' }, { status: 500 });
  }
}
export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const body = await req.json();

    const newEvent = await Event.create(body);

    return NextResponse.json({
      success: true,
      message: 'Event created successfully',
      data: newEvent,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create event',
    }, { status: 500 });
  }
}