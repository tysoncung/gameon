import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Profile, Rsvp, Game, Group } from "@/lib/models";

// GET /api/profile/[id] - get profile with game history
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const profile = await Profile.findById(id).lean();

    if (!profile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Get recent game history (RSVPs matching this player's name)
    const rsvps = await Rsvp.find({
      playerName: { $regex: new RegExp(`^${profile.name}$`, "i") },
      status: "in",
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Enrich with game + group info
    const gameHistory = [];
    for (const rsvp of rsvps) {
      const game = await Game.findById(rsvp.gameId).lean();
      if (!game) continue;
      const group = await Group.findById(game.groupId).lean();
      gameHistory.push({
        gameId: game._id,
        date: game.date,
        time: game.time,
        location: game.location,
        sport: group?.sport || "Unknown",
        groupName: group?.name || "Unknown",
        inviteCode: group?.inviteCode || "",
      });
    }

    // Calculate reliability score
    const totalGames = profile.gamesPlayed || 0;
    const noShows = profile.gamesNoShow || 0;
    const reliability = totalGames > 0
      ? Math.round(((totalGames - noShows) / totalGames) * 100)
      : null;

    return NextResponse.json({
      profile,
      gameHistory,
      reliability,
      totalRsvps: rsvps.length,
    });
  } catch (err) {
    console.error("GET profile detail error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
