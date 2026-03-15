import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Group, Game, Rsvp } from "@/lib/models";

// GET /api/explore?sport=Soccer&page=1
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const sport = searchParams.get("sport") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = 20;

    // Find public groups, optionally filtered by sport
    const groupFilter: Record<string, unknown> = { isPublic: true };
    if (sport && sport !== "All") {
      groupFilter.sport = sport;
    }

    const publicGroups = await Group.find(groupFilter).select("_id name sport location inviteCode").lean();

    if (publicGroups.length === 0) {
      return NextResponse.json({ games: [], total: 0, page, pages: 0 });
    }

    const groupIds = publicGroups.map((g) => g._id);
    const groupMap = new Map(publicGroups.map((g) => [g._id.toString(), g]));

    // Get upcoming games from public groups
    const today = new Date().toISOString().split("T")[0];
    const total = await Game.countDocuments({
      groupId: { $in: groupIds },
      date: { $gte: today },
      status: { $in: ["open", "confirmed"] },
    });

    const games = await Game.find({
      groupId: { $in: groupIds },
      date: { $gte: today },
      status: { $in: ["open", "confirmed"] },
    })
      .sort({ date: 1, time: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get RSVP counts for each game
    const gameIds = games.map((g) => g._id);
    const rsvpCounts = await Rsvp.aggregate([
      { $match: { gameId: { $in: gameIds }, status: "in", waitlistPosition: null } },
      { $group: { _id: "$gameId", count: { $sum: 1 }, guests: { $sum: "$guests" } } },
    ]);
    const countMap = new Map(
      rsvpCounts.map((r) => [r._id.toString(), r.count + r.guests])
    );

    const results = games.map((game) => {
      const group = groupMap.get(game.groupId.toString());
      const confirmed = countMap.get(game._id.toString()) || 0;
      return {
        _id: game._id,
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
          : null,
      };
    });

    return NextResponse.json({
      games: results,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("GET /api/explore error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
