import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import "@/models/Investment";
import "@/models/InvestmentType";
import "@/models/User";
import "@/models/Scenario";
import mongoose from 'mongoose';

export async function GET() {
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

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const scenarios = await Scenario.find({
      $or: [
        { owner: user._id },
        { viewPermissions: user._id },
        { editPermissions: user._id },
      ]
    }).select('investments');

    //eslint-disable-next-line
    const investmentIds = scenarios.flatMap((scenario: any) => scenario.investments);

    const investments = await Investment.find({ _id: { $in: investmentIds } })
      .populate('investmentType');

    // Extract unique investment types
    const uniqueInvestmentTypesMap = new Map();
    investments.forEach(investment => {
      const type = investment.investmentType;
      if (type && !uniqueInvestmentTypesMap.has(type._id.toString())) {
        uniqueInvestmentTypesMap.set(type._id.toString(), type);
      }
    });

    const uniqueInvestmentTypes = Array.from(uniqueInvestmentTypesMap.values());

    return NextResponse.json({ success: true, data: uniqueInvestmentTypes }, { status: 200 });

  } catch (error) {
    console.error('Error fetching user investment types:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user investment types' },
      { status: 500 }
    );
  }
}
