import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";

export async function POST(request: NextRequest) {
    await dbConnect();
    const body = await request.json();
    console.log(body);
    return NextResponse.json({ message: "Scenario created successfully" });
}


