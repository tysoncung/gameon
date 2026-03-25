import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Group, Game, Rsvp, Profile } from "@/lib/models";
import { scoreGames } from "@/lib/matching";

// GET /api/recommended?profileId=xxx&limit=10
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get("profileId");
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") || "10")));

    if (!profileId) {
      return NextResponse.json({ error: "profileId required" }, { status: 400 });
    }

    // Load the player's profile
    const profile = await Profile.findById(profileId).lean();
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Find all public groups
    const publicGroups = await Group.find({ isPublic: true })
      .select("_id name sport location inviteCode")
      .lean();

    if (publicGroups.length === 0) {
      return NextResponse.json({ games: [], matchQuality: "no_games" });
    }

    const groupIds = publicGroups.map((g) => g._id);
    const groupMap = new Map(publicGroups.map((g) => [g._id.toString(), g]));

    // Get upcoming open games
    const today = new Date().toISOString().split("T")[0];
    const games = await Game.find({
      groupId: { $in: groupIds },
      date: { $gte: today },
      status: { $in: ["open", "confirmed"] },
    })
      .sort({ date: 1, time: 1 })
      .limit(100) // cap to prevent huge queries
      .lean();

    // Get RSVP counts
    const gameIds = games.map((g) => g._id);
    const rsvpCounts = await Rsvp.aggregate([
      { $match: { gameId: { $in: gameIds }, status: "in", waitlistPosition: null } },
      { $group: { _id: "$gameId", count: { $sum: 1 }, guests: { $sum: "$guests" } } },
    ]);
    const countMap = new Map(
      rsvpCounts.map((r) => [r._id.toString(), r.count + r.guests])
    );

    // Build game candidates
    const candidates = games.map((game) => {
      const group = groupMap.get(game.groupId.toString());
      const confirmed = countMap.get(game._id.toString()) || 0;
      return {
        _id: game._id.toString(),
        date: game.date,
        time: game.time,
        location: game.location,
        capacity: game.capacity,
        confirmed,
        spotsLeft: Math.max(0, game.capacity - confirmed),
        group: group
          ? {
              name: group.name,
              sport: group.sport,
              location: group.location,
              inviteCode: group.inviteCode,
            }
          : null!,
      };
    }).filter((g) => g.group !== null);

    // Score and rank
    const matched = scoreGames(
      {
        sports: profile.sports || [],
        availability: profile.availability || [],
        location: profile.location || "",
      },
      candidates
    );

    // Determine match quality
    const topScore = matched.length > 0 ? matched[0].score : 0;
    let matchQuality: string;
    if (topScore >= 60) matchQuality = "great";
    else if (topScore >= 40) matchQuality = "good";
    else if (topScore >= 20) matchQuality = "fair";
    else matchQuality = "low";

    return NextResponse.json({
      games: matched.slice(0, limit),
      total: matched.length,
      matchQuality,
      profileSummary: {
        sports: (profile.sports || []).map((s: { name: string; skill: string }) => s.name),
        availability: profile.availability || [],
        location: profile.location || "",
      },
    });
  } catch (err) {
    console.error("GET /api/recommended error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
