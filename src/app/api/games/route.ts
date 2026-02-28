import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Group, Game } from "@/lib/models";
import { hashPin } from "@/lib/utils";

// POST /api/games - create a game
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { inviteCode, pin, date, time, location, capacity, recurring } = body;

    if (!inviteCode || !pin || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const group = await Group.findOne({ inviteCode });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (hashPin(pin) !== group.adminPin) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 403 });
    }

    await Game.create({
      groupId: group._id,
      date,
      time: time || "10:00",
      location: location || group.location || "",
      capacity: capacity || group.defaultCapacity,
      recurring: !!recurring,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/games error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
