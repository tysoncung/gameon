import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Game, Group, Player, Reminder, Rsvp, OptOut } from "@/lib/models";
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

    // --- Lifecycle transitions ---

    // 1. Open games past cutoffTime: confirm or cancel based on minPlayers
    const openGamesWithCutoff = await Game.find({
      status: "open",
      cutoffTime: { $ne: null },
    }).lean();

    for (const game of openGamesWithCutoff) {
      if (!game.cutoffTime) continue;
      const cutoff = new Date(game.cutoffTime);
      if (now < cutoff) continue;

      const rsvpCount = await Rsvp.countDocuments({ gameId: game._id, status: "in" });

      if (game.minPlayers > 0 && rsvpCount < game.minPlayers) {
        await Game.updateOne({ _id: game._id }, { $set: { status: "cancelled" } });
        results.push(`Game ${game._id} auto-cancelled (${rsvpCount}/${game.minPlayers} min players)`);
      } else {
        await Game.updateOne({ _id: game._id }, { $set: { status: "confirmed" } });
        results.push(`Game ${game._id} auto-confirmed (${rsvpCount} RSVPs, min ${game.minPlayers})`);
      }
    }

    // 2. Open/confirmed games past their date+time → completed
    const activeGames = await Game.find({
      status: { $in: ["open", "confirmed"] },
    }).lean();

    for (const game of activeGames) {
      const gameDateTime = new Date(`${game.date}T${game.time}`);
      if (now > gameDateTime) {
        await Game.updateOne({ _id: game._id }, { $set: { status: "completed" } });
        results.push(`Game ${game._id} auto-completed (past game time)`);
      }
    }

    // --- Reminders ---

    const upcomingGames = await Game.find({
      status: { $in: ["open", "confirmed"] },
      date: { $gte: now.toISOString().split("T")[0] },
    }).lean();

    if (!upcomingGames || upcomingGames.length === 0) {
      return NextResponse.json({ message: "Lifecycle processed, no upcoming games for reminders", sent: results });
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

      // Get all opted-out phones for this group in one query
      const groupIdStr = game.groupId.toString();
      const optedOutDocs = await OptOut.find({
        phone: { $in: players.map((p) => p.phone) },
        $or: [{ groupId: null }, { groupId: game.groupId }],
      }).lean();
      const optedOutPhones = new Set(optedOutDocs.map((o) => o.phone));

      const eligiblePlayers = players.filter((p) => !optedOutPhones.has(p.phone));
      if (eligiblePlayers.length === 0) continue;

      const status = await buildStatusMessage(game._id.toString());
      const timeLabel = reminderType === "24h" ? "tomorrow" : "in 2 hours";

      const reminder =
        `Reminder: ${group.name} is ${timeLabel}!\n` +
        `${game.date} at ${game.time} @ ${game.location || "TBD"}\n\n` +
        `${status}\n\n` +
        `Haven't RSVP'd? Reply "in" or "out" now!\n` +
        `Reply "stop" to stop receiving reminders.`;

      let sentCount = 0;
      for (const player of eligiblePlayers) {
        try {
          await sendWhatsApp(player.phone, reminder);
          sentCount++;
        } catch (err) {
          console.error(`Failed to send reminder to ${player.phone}:`, err);
        }
      }

      await Reminder.create({
        gameId: game._id,
        reminderType,
      });

      const skippedCount = players.length - eligiblePlayers.length;
      const skippedNote = skippedCount > 0 ? ` (${skippedCount} opted out)` : "";
      results.push(`Sent ${reminderType} reminder for game ${game._id} to ${sentCount}/${players.length} players${skippedNote}`);
    }

    return NextResponse.json({ message: "Reminders processed", sent: results });
  } catch (err) {
    console.error("Reminder cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
