import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Group, Game } from "@/lib/models";
import { hashPin } from "@/lib/utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  try {
    await connectDB();
    const { inviteCode } = await params;
    const group = await Group.findOne({ inviteCode }).lean();
    if (!group) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const games = await Game.find({ groupId: group._id })
      .sort({ date: 1, time: 1 })
      .lean();

    return NextResponse.json({ group, games });
  } catch (err) {
    console.error("GET group error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// PATCH /api/groups/[inviteCode] - update group settings (requires admin PIN)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  try {
    await connectDB();
    const { inviteCode } = await params;
    const body = await req.json();
    const { pin, isPublic } = body;

    if (!pin) {
      return NextResponse.json({ error: "Admin PIN required" }, { status: 400 });
    }

    const group = await Group.findOne({ inviteCode });
    if (!group) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (hashPin(pin) !== group.adminPin) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 403 });
    }

    if (typeof isPublic === "boolean") {
      group.isPublic = isPublic;
    }

    await group.save();
    return NextResponse.json({ ok: true, isPublic: group.isPublic });
  } catch (err) {
    console.error("PATCH group error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
