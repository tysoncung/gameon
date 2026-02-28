import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendWhatsApp } from "@/lib/twilio";
import { buildAnnouncementMessage } from "@/lib/whatsapp-bot";
import { hashPin, formatDate, formatTime } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { gameId, pin } = await req.json();

    if (!gameId || !pin) {
      return NextResponse.json({ error: "Missing gameId or pin" }, { status: 400 });
    }

    // Get game with group info
    const { data: game } = await supabase
      .from("games")
      .select("*, groups!inner(*)")
      .eq("id", gameId)
      .single();

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const group = (game as any).groups;

    // Verify admin PIN
    if (hashPin(pin) !== group.pin_hash) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 403 });
    }

    // Get all players in this group
    const { data: players } = await supabase
      .from("players")
      .select("phone, name")
      .eq("group_id", group.id);

    if (!players || players.length === 0) {
      return NextResponse.json({
        error: "No players registered. Players need to message the bot first.",
      }, { status: 400 });
    }

    // Build and send announcement
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
