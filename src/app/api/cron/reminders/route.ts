import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Game, Group, Player, Reminder } from "@/lib/models";
import { sendWhatsApp } from "@/lib/twilio";
import { buildStatusMessage } from "@/lib/whatsapp-bot";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const now = new Date();
    const results: string[] = [];

    const upcomingGames = await Game.find({
      status: "upcoming",
      date: { $gte: now.toISOString().split("T")[0] },
    }).lean();

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
      const existing = await Reminder.findOne({
        gameId: game._id,
        reminderType,
      });

      if (existing) continue;

      const players = await Player.find({ groupId: game.groupId }).lean();
      if (!players || players.length === 0) continue;

      const group = await Group.findById(game.groupId).lean();
      if (!group) continue;

      const status = await buildStatusMessage(game._id.toString());
      const timeLabel = reminderType === "24h" ? "tomorrow" : "in 2 hours";

      const reminder =
        `Reminder: ${group.name} is ${timeLabel}!\n` +
        `${game.date} at ${game.time} @ ${game.location || "TBD"}\n\n` +
        `${status}\n\n` +
        `Haven't RSVP'd? Reply "in" or "out" now!`;

      for (const player of players) {
        try {
          await sendWhatsApp(player.phone, reminder);
        } catch (err) {
          console.error(`Failed to send reminder to ${player.phone}:`, err);
        }
      }

      await Reminder.create({
        gameId: game._id,
        reminderType,
      });

      results.push(`Sent ${reminderType} reminder for game ${game._id} to ${players.length} players`);
    }

    return NextResponse.json({ message: "Reminders processed", sent: results });
  } catch (err) {
    console.error("Reminder cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
