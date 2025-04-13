import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Scenario from "@/models/Scenario";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { scenarioId, targetEmail, permission } = await req.json();

    if (!scenarioId || !targetEmail || !["view", "edit"].includes(permission)) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const scenario = await Scenario.findById(scenarioId);
    if (!scenario) {
      return NextResponse.json({ success: false, error: "Scenario not found" }, { status: 404 });
    }

    const targetUser = await User.findOne({ email: targetEmail });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "User not found with provided email" }, { status: 404 });
    }

    const userId = targetUser._id;

    const alreadyHasView = scenario.viewPermissions.includes(userId);
    const alreadyHasEdit = scenario.editPermissions.includes(userId);

    if (permission === "view") {
      // Remove from edit if exists
      if (alreadyHasEdit) {
        scenario.editPermissions = scenario.editPermissions.filter(id => !id.equals(userId));
        targetUser.readWriteScenarios = targetUser.readWriteScenarios.filter(id => !id.equals(scenario._id));
      }

      if (!alreadyHasView) {
        scenario.viewPermissions.push(userId);
        targetUser.readScenarios.push(scenario._id);
      }
    } else if (permission === "edit") {
      // Remove from view if exists
      if (alreadyHasView) {
        scenario.viewPermissions = scenario.viewPermissions.filter(id => !id.equals(userId));
        targetUser.readScenarios = targetUser.readScenarios.filter(id => !id.equals(scenario._id));
      }

      if (!alreadyHasEdit) {
        scenario.editPermissions.push(userId);
        targetUser.readWriteScenarios.push(scenario._id);
      }
    }

    await scenario.save();
    await targetUser.save();

    return NextResponse.json({ success: true, message: `Scenario shared with ${targetEmail} as ${permission}` });
  } catch (error) {
    console.error("Share scenario error:", error);
    return NextResponse.json({ success: false, error: "Failed to share scenario" }, { status: 500 });
  }
}
