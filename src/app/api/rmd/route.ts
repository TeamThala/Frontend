import { NextResponse } from 'next/server';
import { RMDService } from '@/services/rmdService';
import { Investment, RmdStrategy } from '@/types/rmd';

export async function POST(request: Request) {
  try {
    const { distributionYear, age, previousYearPretaxAccounts, rmdStrategy } = await request.json();

    // Validate input
    if (!distributionYear || !age || !previousYearPretaxAccounts || !rmdStrategy) {
      return NextResponse.json(
        { error: 'Missing required parameters. Need: distributionYear, age, previousYearPretaxAccounts, rmdStrategy' },
        { status: 400 }
      );
    }

    // Get RMD service instance
    const rmdService = RMDService.getInstance();

    // Ensure we have the RMD table for the previous year (when RMD was determined)
    await rmdService.getRmdTable(distributionYear - 1);

    // Execute RMD distribution
    const distribution = await rmdService.executeRmdDistribution(
      distributionYear,
      age,
      previousYearPretaxAccounts as Investment[],
      rmdStrategy as RmdStrategy
    );

    return NextResponse.json({ distribution });
  } catch (error) {
    console.error('Error in RMD calculation:', error);
    return NextResponse.json(
      { error: 'Failed to calculate RMD', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const distributionYear = parseInt(searchParams.get('distributionYear') || new Date().getFullYear().toString());
    const age = parseInt(searchParams.get('age') || '74');

    if (age < 74) {
      return NextResponse.json(
        { error: 'RMDs start at age 73 and are paid in the year the person turns 74' },
        { status: 400 }
      );
    }

    // Get RMD service instance
    const rmdService = RMDService.getInstance();

    // Get RMD table for the previous year (when RMD was determined)
    const rmdTable = await rmdService.getRmdTable(distributionYear - 1);

    // Calculate RMD factor for the previous year's age
    const factor = rmdService.getRmdFactor(age - 1);

    return NextResponse.json({ 
      distributionYear, 
      age,
      previousYearAge: age - 1,
      factor, 
      rmdTable,
      note: 'RMD factors are based on age and account balances as of December 31 of the previous year'
    });
  } catch (error) {
    console.error('Error in RMD factor lookup:', error);
    return NextResponse.json(
      { error: 'Failed to get RMD factor', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 