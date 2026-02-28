import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Group, Game } from "@/lib/models";

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
