import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Game, Group, Player } from "@/lib/models";
import { sendWhatsApp } from "@/lib/twilio";
import { buildAnnouncementMessage } from "@/lib/whatsapp-bot";
import { hashPin, formatDate, formatTime } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { gameId, pin } = await req.json();

    if (!gameId || !pin) {
      return NextResponse.json({ error: "Missing gameId or pin" }, { status: 400 });
    }

    const game = await Game.findById(gameId);
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const group = await Group.findById(game.groupId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (hashPin(pin) !== group.adminPin) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 403 });
    }

    const players = await Player.find({ groupId: group._id }).lean();

    if (!players || players.length === 0) {
      return NextResponse.json({
        error: "No players registered. Players need to message the bot first.",
      }, { status: 400 });
    }

    const message = buildAnnouncementMessage(
      group.name,
      group.sport,
      formatDate(game.date),
      formatTime(game.time),
      game.location,
      game.capacity
    );

    let sent = 0;
    let failed = 0;

    for (const player of players) {
      try {
        await sendWhatsApp(player.phone, message);
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${player.phone}:`, err);
        failed++;
      }
    }

    return NextResponse.json({ sent, failed, total: players.length });
  } catch (err) {
    console.error("Announce error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
