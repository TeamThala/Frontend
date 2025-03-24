import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/dbConnect';
import "@/models/Investment";
import "@/models/Event";
import "@/models/User";
import "@/models/InvestmentType";
import Scenario from '@/models/Scenario';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  await dbConnect();

  // Get the user session
  const session = await getServerSession(authOptions);
  console.log("Session data:", JSON.stringify(session, null, 2));
  // Check if user is authenticated
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' }, 
      { status: 401 }
    );
  }

  try {
    // First find the user by email
    const User = mongoose.model('User');
    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' }, 
        { status: 404 }
      );
    }

    // Find scenarios where the user is the owner or has permissions
    const scenarios = await Scenario.find({
      $or: [
        { owner: user._id },
        { viewPermissions: user._id },
        { editPermissions: user._id }
      ]
    })
    .populate({
      path: 'investments',
      populate: { path: 'investmentType' }
    })
    .populate('eventSeries')
    .populate('spendingStrategy')
    .populate('expenseWithdrawalStrategy')
    .populate('owner', 'name email')
    .populate('viewPermissions', 'name email')
    .populate('editPermissions', 'name email');

    return NextResponse.json({ success: true, data: scenarios }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user scenarios:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user scenarios' }, 
      { status: 500 }
    );
  }
}