// pages/api/state-taxes.ts (or src/app/api/state-taxes/route.ts)

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { getServerSession } from "next-auth/next";
import User from "@/models/User";
import TaxFile from "@/models/TaxFile";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file") as Blob;
  const stateCode = form.get("stateCode") as string;

  const content = await file.text();
  const taxFile = await TaxFile.create({ user: user._id, state: stateCode, content });

  // update user's map
  user.stateTaxFiles.set(stateCode, taxFile._id.toString());
  await user.save();

  return NextResponse.json({ success: true, fileId: taxFile._id });
}
