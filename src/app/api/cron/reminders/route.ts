import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendWhatsApp } from "@/lib/twilio";
import { buildStatusMessage } from "@/lib/whatsapp-bot";

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const results: string[] = [];

    // Find games that need 24h or 2h reminders
    const { data: upcomingGames } = await supabase
      .from("games")
      .select("*, groups!inner(*)")
      .eq("status", "upcoming")
      .gte("date", now.toISOString().split("T")[0]);

    if (!upcomingGames || upcomingGames.length === 0) {
      return NextResponse.json({ message: "No upcoming games", sent: [] });
    }

    for (const game of upcomingGames) {
      const gameDateTime = new Date(`${game.date}T${game.time}`);
      const hoursUntil = (gameDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      let reminderType: "24h" | "2h" | null = null;

      if (hoursUntil > 23 && hoursUntil <= 25) {
        reminderType = "24h";
      } else if (hoursUntil > 1.5 && hoursUntil <= 2.5) {
        reminderType = "2h";
      }

      if (!reminderType) continue;

      // Check if reminder already sent
      const { data: existing } = await supabase
        .from("reminders")
        .select("id")
        .eq("game_id", game.id)
        .eq("reminder_type", reminderType)
        .single();

      if (existing) continue;

      // Get all players in this group with phone numbers
      const { data: players } = await supabase
        .from("players")
        .select("phone, name")
        .eq("group_id", game.group_id);

      if (!players || players.length === 0) continue;

      // Build reminder message
      const status = await buildStatusMessage(game.id);
      const group = (game as any).groups;
      const timeLabel = reminderType === "24h" ? "tomorrow" : "in 2 hours";

      const reminder =
        `Reminder: ${group.name} is ${timeLabel}!\n` +
        `${game.date} at ${game.time} @ ${game.location || "TBD"}\n\n` +
        `${status}\n\n` +
        `Haven't RSVP'd? Reply "in" or "out" now!`;

      // Send to all players
      for (const player of players) {
        try {
          await sendWhatsApp(player.phone, reminder);
        } catch (err) {
          console.error(`Failed to send reminder to ${player.phone}:`, err);
        }
      }

      // Mark reminder as sent
      await supabase.from("reminders").insert({
        game_id: game.id,
        reminder_type: reminderType,
      });

      results.push(`Sent ${reminderType} reminder for game ${game.id} to ${players.length} players`);
    }

    return NextResponse.json({ message: "Reminders processed", sent: results });
  } catch (err) {
    console.error("Reminder cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
