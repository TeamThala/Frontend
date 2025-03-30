import {NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/dbConnect';
import "@/models/Investment";
import "@/models/Event";
import "@/models/User";
import "@/models/InvestmentType";
import Scenario from '@/models/Scenario';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth';

export async function GET() {
  await dbConnect();

  // Get the user session
  const session = await getServerSession(authOptions);
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
    const createdScenarios = await Scenario.find({
      _id: { $in: user.createdScenarios }
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

    // Find scenarios where the user has read permissions
    const readScenarios = await Scenario.find({
      _id: { $in: user.readScenarios }
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
    .populate('editPermissions', 'name email')

    // Find scenarios where the user has read and write permissions
    const readWriteScenarios = await Scenario.find({
      _id: { $in: user.readWriteScenarios }
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
    .populate('editPermissions', 'name email')
    
    const responsePayload = {
      "createdScenarios": createdScenarios,
      "readScenarios": readScenarios,
      "readWriteScenarios": readWriteScenarios
    }

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    console.error('Error fetching user scenarios:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user scenarios' }, 
      { status: 500 }
    );
  }
}