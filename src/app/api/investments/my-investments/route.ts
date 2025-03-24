import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import "@/models/Investment";
import "@/models/InvestmentType";
import "@/models/User";
import "@/models/Scenario";
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  console.log("Session data:", JSON.stringify(session, null, 2));

  if (!session || !session.user?.email) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const User = mongoose.model('User');
    const Scenario = mongoose.model('Scenario');
    const Investment = mongoose.model('Investment');

    // Get the logged-in user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Find all scenarios the user has access to
    const scenarios = await Scenario.find({
      $or: [
        { owner: user._id },
        { viewPermissions: user._id },
        { editPermissions: user._id },
      ]
    }).select('investments');

    // Collect all investment IDs from those scenarios
    const investmentIds = scenarios.flatMap((scenario: any) => scenario.investments);

    // Fetch those investments and populate
    const investments = await Investment.find({ _id: { $in: investmentIds } })
      .populate('investmentType');

    return NextResponse.json({ success: true, data: investments }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user investments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user investments' },
      { status: 500 }
    );
  }
}
