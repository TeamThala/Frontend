import { NextResponse } from 'next/server';
import { RMDService } from '@/services/rmdService';
import { Investment, RmdStrategy } from '@/types/rmd';

export async function POST(request: Request) {
  try {
    const { year, age, pretaxAccounts, rmdStrategy } = await request.json();

    // Validate input
    if (!year || !age || !pretaxAccounts || !rmdStrategy) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get RMD service instance
    const rmdService = RMDService.getInstance();

    // Ensure we have the RMD table for the year
    await rmdService.getRmdTable(year);

    // Execute RMD distribution
    const distribution = await rmdService.executeRmdDistribution(
      year,
      age,
      pretaxAccounts as Investment[],
      rmdStrategy as RmdStrategy
    );

    return NextResponse.json({ distribution });
  } catch (error) {
    console.error('Error in RMD calculation:', error);
    return NextResponse.json(
      { error: 'Failed to calculate RMD' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const age = parseInt(searchParams.get('age') || '72');

    // Get RMD service instance
    const rmdService = RMDService.getInstance();

    // Get RMD table for the year
    const rmdTable = await rmdService.getRmdTable(year);

    // Calculate RMD factor for the age
    const factor = rmdService.getRmdFactor(age);

    return NextResponse.json({ year, age, factor, rmdTable });
  } catch (error) {
    console.error('Error in RMD factor lookup:', error);
    return NextResponse.json(
      { error: 'Failed to get RMD factor' },
      { status: 500 }
    );
  }
} 