import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';

import '@/models/User';
import '@/models/Scenario';
import '@/models/Event';

export async function GET(req: NextRequest) {
  await dbConnect();

  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const User = mongoose.model('User');
    const Scenario = mongoose.model('Scenario');
    const Event = mongoose.model('Event');

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get scenarios the user can access
    const scenarios = await Scenario.find({
      $or: [
        { owner: user._id },
        { viewPermissions: user._id },
        { editPermissions: user._id }
      ]
    }).select('eventSeries');

    // Get unique event IDs
    const eventIds = [
      ...new Set(scenarios.flatMap((scenario: any) => scenario.eventSeries.map((id: any) => id.toString())))
    ];

    // Fetch events
    const events = await Event.find({ _id: { $in: eventIds } });

    return NextResponse.json({ success: true, data: events }, { status: 200 });

  } catch (error) {
    console.error('Error fetching user events:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch user events' }, { status: 500 });
  }
}
