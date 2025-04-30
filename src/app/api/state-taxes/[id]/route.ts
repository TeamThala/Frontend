import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import StateTax from "@/models/StateTax";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Adjust path as needed
import { Session } from "next-auth";

// Use the same ExtendedSession interface
interface ExtendedSession extends Session {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    _id?: string;
    id?: string;
    isAdmin?: boolean;
  }
}

// GET /api/state-taxes/[id] - Get a specific state tax configuration
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const stateTax = await StateTax.findById(params.id).populate("createdBy", "name email");
    
    if (!stateTax) {
      return NextResponse.json(
        { error: "State tax configuration not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(stateTax);
  } catch (error) {
    console.error("Failed to fetch state tax configuration:", error);
    return NextResponse.json(
      { error: "Failed to fetch state tax configuration" },
      { status: 500 }
    );
  }
}

// PUT /api/state-taxes/[id] - Update a state tax configuration
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in to update a state tax configuration" },
        { status: 401 }
      );
    }
    
    const stateTax = await StateTax.findById(params.id);
    
    if (!stateTax) {
      return NextResponse.json(
        { error: "State tax configuration not found" },
        { status: 404 }
      );
    }
    
    // Check if user is authorized to update (either admin or creator)
    const userId = session.user._id || session.user.id;
    const isAdmin = session.user.isAdmin || false;
    
    if (stateTax.createdBy && stateTax.createdBy.toString() !== userId && !isAdmin) {
      return NextResponse.json(
        { error: "You are not authorized to update this state tax configuration" },
        { status: 403 }
      );
    }
    
    // Don't allow updating of default configurations unless admin
    if (stateTax.isDefault && !isAdmin) {
      return NextResponse.json(
        { error: "Default state tax configurations cannot be updated" },
        { status: 403 }
      );
    }
    
    const data = await req.json();
    
    // Update the configuration
    const updatedStateTax = await StateTax.findByIdAndUpdate(
      params.id,
      {
        ...data,
        lastUpdated: new Date()
      },
      { new: true }
    );
    
    return NextResponse.json(updatedStateTax);
  } catch (error) {
    console.error("Failed to update state tax configuration:", error);
    return NextResponse.json(
      { error: "Failed to update state tax configuration" },
      { status: 500 }
    );
  }
} 