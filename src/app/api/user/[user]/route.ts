import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import "@/models/Investment";
import "@/models/Event";
import "@/models/User";
import "@/models/Scenario";

import Scenario from "@/models/Scenario";

export async function GET(req: NextRequest, { params }: { params: Promise<{ user: string }> }) {
  await dbConnect();
  const { user } = await params;

  try {
    const scenarios = await Scenario.find({
      $or: [
        { owner: user },
        { viewPermissions: user },
        { editPermissions: user }
      ]
    })
    .populate('investments')
    .populate('eventSeries')
    .populate('owner', 'name email');

    return NextResponse.json({ success: true, data: scenarios }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user scenarios:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch user scenarios' }, { status: 500 });
  }
}
