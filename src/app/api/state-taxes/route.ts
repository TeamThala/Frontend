import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import StateTax from "@/models/StateTax";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Adjust path as needed
import { Session } from "next-auth";

// Add this interface for typed user info
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

// GET /api/state-taxes - Get all state tax configurations or filter by state code
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const searchParams = req.nextUrl.searchParams;
    const stateCode = searchParams.get("stateCode");
    
    // Filter by stateCode if provided
    const query = stateCode ? { code: stateCode } : {};
    const stateTaxes = await StateTax.find(query).populate("createdBy", "name email");
    
    return NextResponse.json(stateTaxes);
  } catch (error) {
    console.error("Failed to fetch state tax configurations:", error);
    return NextResponse.json(
      { error: "Failed to fetch state tax configurations" },
      { status: 500 }
    );
  }
}

// POST /api/state-taxes - Create a new state tax configuration
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in to create a state tax configuration" },
        { status: 401 }
      );
    }
    
    const data = await req.json();
    
    // Validate required fields
    if (!data.code || !data.name || !data.yaml) {
      return NextResponse.json(
        { error: "State code, name, and YAML content are required" },
        { status: 400 }
      );
    }
    
    // Get user ID from session with proper typing
    const userId = session.user._id || session.user.id;
    
    // Create new state tax configuration
    const stateTax = await StateTax.create({
      ...data,
      createdBy: userId,
      lastUpdated: new Date()
    });
    
    return NextResponse.json(stateTax, { status: 201 });
  } catch (error) {
    console.error("Failed to create state tax configuration:", error);
    return NextResponse.json(
      { error: "Failed to create state tax configuration" },
      { status: 500 }
    );
  }
}

// DELETE /api/state-taxes - Delete a state tax configuration
export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in to delete a state tax configuration" },
        { status: 401 }
      );
    }
    
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "State tax ID is required" },
        { status: 400 }
      );
    }
    
    // Get the tax configuration
    const stateTax = await StateTax.findById(id);
    
    if (!stateTax) {
      return NextResponse.json(
        { error: "State tax configuration not found" },
        { status: 404 }
      );
    }
    
    // Check if user is authorized to delete (either admin or creator)
    const userId = session.user._id || session.user.id;
    const isAdmin = session.user.isAdmin || false;
    
    if (stateTax.createdBy && stateTax.createdBy.toString() !== userId && !isAdmin) {
      return NextResponse.json(
        { error: "You are not authorized to delete this state tax configuration" },
        { status: 403 }
      );
    }
    
    // Don't allow deletion of default configurations unless admin
    if (stateTax.isDefault && !isAdmin) {
      return NextResponse.json(
        { error: "Default state tax configurations cannot be deleted" },
        { status: 403 }
      );
    }
    
    // Delete the configuration
    await StateTax.findByIdAndDelete(id);
    
    return NextResponse.json({ message: "State tax configuration deleted successfully" });
  } catch (error) {
    console.error("Failed to delete state tax configuration:", error);
    return NextResponse.json(
      { error: "Failed to delete state tax configuration" },
      { status: 500 }
    );
  }
} 