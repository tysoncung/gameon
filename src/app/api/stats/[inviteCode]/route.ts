import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Group, Game, Rsvp } from "@/lib/models";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  try {
    await connectDB();
    const { inviteCode } = await params;
    const group = await Group.findOne({ inviteCode }).lean();
    if (!group) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const games = await Game.find({ groupId: group._id }).select("_id").lean();
    if (games.length === 0) {
      return NextResponse.json({ group, stats: [] });
    }

    const gameIds = games.map((g) => g._id);
    const rsvps = await Rsvp.find({ gameId: { $in: gameIds } }).lean();

    const playerMap = new Map<string, { inCount: number; outCount: number; maybeCount: number; games: Set<string> }>();

    for (const r of rsvps) {
      if (!playerMap.has(r.playerName)) {
        playerMap.set(r.playerName, { inCount: 0, outCount: 0, maybeCount: 0, games: new Set() });
      }
      const p = playerMap.get(r.playerName)!;
      p.games.add(r.gameId.toString());
      if (r.status === "in") p.inCount++;
      else if (r.status === "out") p.outCount++;
      else if (r.status === "maybe") p.maybeCount++;
    }

    const stats = Array.from(playerMap.entries())
      .map(([name, val]) => {
        const total = val.inCount + val.outCount + val.maybeCount;
        return {
          name,
          totalGames: val.games.size,
          inCount: val.inCount,
          outCount: val.outCount,
          maybeCount: val.maybeCount,
          attendanceRate: total > 0 ? Math.round((val.inCount / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.attendanceRate - a.attendanceRate);

    return NextResponse.json({ group, stats });
  } catch (err) {
    console.error("GET stats error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
