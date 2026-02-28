import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Game, Rsvp } from "@/lib/models";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id: gameId } = await params;
    const { playerName, status } = await req.json();

    if (!playerName || !status) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const game = await Game.findById(gameId);
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // Get current "in" RSVPs to determine waitlist
    const currentIns = await Rsvp.find({ gameId, status: "in" }).sort({ createdAt: 1 }).lean();

    // Count spots excluding this player
    const spotsTaken = currentIns.reduce((sum, r) => {
      if (r.playerName === playerName) return sum;
      return sum + 1 + (r.guests || 0);
    }, 0);

    let waitlistPosition: number | null = null;
    if (status === "in" && spotsTaken >= game.capacity) {
      const waitlistedCount = currentIns.filter(
        (r) => r.waitlistPosition !== null && r.playerName !== playerName
      ).length;
      waitlistPosition = waitlistedCount + 1;
    }

    await Rsvp.findOneAndUpdate(
      { gameId, playerName },
      {
        $set: {
          gameId,
          playerName,
          status,
          guests: 0,
          waitlistPosition,
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, new: true }
    );

    // If someone went "out", recalculate waitlist
    if (status === "out") {
      await recalcWaitlist(gameId, game.capacity);
    }

    // Re-fetch rsvps
    const rsvps = await Rsvp.find({ gameId }).sort({ createdAt: 1 }).lean();
    return NextResponse.json({ rsvps });
  } catch (err) {
    console.error("POST rsvp error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function recalcWaitlist(gameId: string, capacity: number) {
  const allIns = await Rsvp.find({ gameId, status: "in" }).sort({ createdAt: 1 });

  let spotsFilled = 0;
  for (const rsvp of allIns) {
    const spotsNeeded = 1 + (rsvp.guests || 0);
    if (spotsFilled + spotsNeeded <= capacity) {
      if (rsvp.waitlistPosition !== null) {
        rsvp.waitlistPosition = null;
        await rsvp.save();
      }
      spotsFilled += spotsNeeded;
    } else {
      const newPos = allIns.filter(
        (r) =>
          r.createdAt < rsvp.createdAt &&
          r.waitlistPosition !== null
      ).length + 1;
      if (rsvp.waitlistPosition !== newPos) {
        rsvp.waitlistPosition = newPos;
        await rsvp.save();
      }
    }
  }
}
