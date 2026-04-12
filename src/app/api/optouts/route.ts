import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { OptOut, Group } from "@/lib/models";
import { hashPin } from "@/lib/utils";

// GET /api/optouts?groupId=xxx&pin=xxx
// Returns list of opted-out phones for a group (admin only)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  const pin = searchParams.get("pin");

  if (!groupId || !pin) {
    return NextResponse.json({ error: "groupId and pin required" }, { status: 400 });
  }

  try {
    await connectDB();

    const group = await Group.findById(groupId).lean();
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (hashPin(pin) !== group.adminPin) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 403 });
    }

    const optOuts = await OptOut.find({
      $or: [{ groupId: null }, { groupId }],
    })
      .sort({ optedOutAt: -1 })
      .lean();

    return NextResponse.json({
      optOuts: optOuts.map((o) => ({
        _id: o._id.toString(),
        phone: o.phone,
        scope: o.groupId ? "group" : "global",
        optedOutAt: o.optedOutAt,
      })),
    });
  } catch (err) {
    console.error("OptOut GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// DELETE /api/optouts
// Re-subscribes a player (removes their opt-out)
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, groupId, pin } = body;

    if (!phone || !groupId || !pin) {
      return NextResponse.json({ error: "phone, groupId, and pin required" }, { status: 400 });
    }

    await connectDB();

    const group = await Group.findById(groupId).lean();
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (hashPin(pin) !== group.adminPin) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 403 });
    }

    await OptOut.deleteMany({
      phone,
      $or: [{ groupId: null }, { groupId }],
    });

    return NextResponse.json({ success: true, message: `${phone} re-subscribed` });
  } catch (err) {
    console.error("OptOut DELETE error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
