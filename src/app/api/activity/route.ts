import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Game, Group, Rsvp } from "@/lib/models";

export const dynamic = "force-dynamic";

type ActivityItem = {
  id: string;
  type: "rsvp" | "game_created" | "game_full" | "game_completed";
  timestamp: string;
  playerName?: string;
  sport: string;
  groupName: string;
  inviteCode: string;
  gameId: string;
  gameDate: string;
  gameTime: string;
  location: string;
  capacity?: number;
  confirmed?: number;
};

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 50);
    const sport = searchParams.get("sport");

    // Get public groups (optionally filtered by sport)
    const groupFilter: Record<string, unknown> = { isPublic: true };
    if (sport && sport !== "All") groupFilter.sport = sport;
    const groups = await Group.find(groupFilter).lean();
    const groupMap = new Map(groups.map((g) => [g._id.toString(), g]));
    const groupIds = groups.map((g) => g._id);

    if (groupIds.length === 0) {
      return NextResponse.json({ activity: [], total: 0 });
    }

    // Fetch recent games from public groups
    const recentGames = await Game.find({
      groupId: { $in: groupIds },
      createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }, // last 14 days
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const gameIds = recentGames.map((g) => g._id);
    const gameMap = new Map(recentGames.map((g) => [g._id.toString(), g]));

    // Fetch recent RSVPs for those games
    const recentRsvps = await Rsvp.find({
      gameId: { $in: gameIds },
      status: "in",
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const activity: ActivityItem[] = [];

    // RSVP events
    for (const rsvp of recentRsvps) {
      const game = gameMap.get(rsvp.gameId.toString());
      if (!game) continue;
      const group = groupMap.get(game.groupId.toString());
      if (!group) continue;

      activity.push({
        id: `rsvp-${rsvp._id}`,
        type: "rsvp",
        timestamp: (rsvp.createdAt as Date).toISOString(),
        playerName: rsvp.playerName,
        sport: group.sport,
        groupName: group.name,
        inviteCode: group.inviteCode,
        gameId: game._id.toString(),
        gameDate: game.date,
        gameTime: game.time,
        location: game.location || group.location || "",
      });
    }

    // Game created events
    for (const game of recentGames) {
      const group = groupMap.get(game.groupId.toString());
      if (!group) continue;

      // Count confirmed RSVPs for this game
      const confirmed = recentRsvps.filter(
        (r) => r.gameId.toString() === game._id.toString()
      ).length;

      activity.push({
        id: `game-${game._id}`,
        type: game.status === "completed"
          ? "game_completed"
          : confirmed >= game.capacity
          ? "game_full"
          : "game_created",
        timestamp: (game.createdAt as Date).toISOString(),
        sport: group.sport,
        groupName: group.name,
        inviteCode: group.inviteCode,
        gameId: game._id.toString(),
        gameDate: game.date,
        gameTime: game.time,
        location: game.location || group.location || "",
        capacity: game.capacity,
        confirmed,
      });
    }

    // Sort by timestamp descending
    activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      activity: activity.slice(0, limit),
      total: activity.length,
    });
  } catch (error) {
    console.error("Activity feed error:", error);
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
  }
}
