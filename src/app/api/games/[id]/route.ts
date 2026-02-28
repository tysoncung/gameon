import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Game, Group, Rsvp } from "@/lib/models";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const game = await Game.findById(id).lean();
    if (!game) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const group = await Group.findById(game.groupId).lean();
    const rsvps = await Rsvp.find({ gameId: id }).sort({ createdAt: 1 }).lean();

    return NextResponse.json({ game, group, rsvps });
  } catch (err) {
    console.error("GET game error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
