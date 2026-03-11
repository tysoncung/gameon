import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Group } from "@/lib/models";
import { hashPin, generateInviteCode } from "@/lib/utils";

// GET /api/groups - list all groups
export async function GET() {
  try {
    await connectDB();
    const groups = await Group.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(groups);
  } catch (err) {
    console.error("GET /api/groups error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST /api/groups - create a group
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, sport, defaultCapacity, location, pin, isPublic } = body;

    if (!name || !pin || pin.length < 4) {
      return NextResponse.json({ error: "Name and PIN (4+ chars) required" }, { status: 400 });
    }

    const inviteCode = generateInviteCode();
    const group = await Group.create({
      name,
      sport: sport || "Soccer",
      defaultCapacity: defaultCapacity || 10,
      location: location || "",
      inviteCode,
      adminPin: hashPin(pin),
      isPublic: isPublic !== false,
    });

    return NextResponse.json({ inviteCode: group.inviteCode });
  } catch (err) {
    console.error("POST /api/groups error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
