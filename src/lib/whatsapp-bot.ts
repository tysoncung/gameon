import { supabase } from "./supabase";

// Parse incoming WhatsApp message into a command
export type BotCommand =
  | { type: "in"; guests: number }
  | { type: "out" }
  | { type: "maybe" }
  | { type: "status" }
  | { type: "stats" }
  | { type: "unknown" };

export function parseCommand(text: string): BotCommand {
  const msg = text.trim().toLowerCase();

  // Check for "in +N" or "yes +N" patterns
  const plusMatch = msg.match(/^(?:in|yes|y)\s*\+\s*(\d+)$/);
  if (plusMatch) {
    return { type: "in", guests: parseInt(plusMatch[1], 10) };
  }

  // Simple commands
  if (/^(in|yes|y)$/i.test(msg)) {
    return { type: "in", guests: 0 };
  }
  if (/^(out|no|n)$/i.test(msg)) {
    return { type: "out" };
  }
  if (/^(maybe|m)$/i.test(msg)) {
    return { type: "maybe" };
  }
  if (/^(status|list)$/i.test(msg)) {
    return { type: "status" };
  }
  if (/^(stats)$/i.test(msg)) {
    return { type: "stats" };
  }

  return { type: "unknown" };
}

// Get or create a player by phone number in a group
export async function getOrCreatePlayer(
  phone: string,
  name: string,
  groupId: string
): Promise<{ id: string; name: string }> {
  // Try to find existing
  const { data: existing } = await supabase
    .from("players")
    .select("*")
    .eq("phone", phone)
    .eq("group_id", groupId)
    .single();

  if (existing) {
    // Update name if changed
    if (existing.name !== name) {
      await supabase
        .from("players")
        .update({ name })
        .eq("id", existing.id);
    }
    return { id: existing.id, name: existing.name };
  }

  // Create new player
  const { data: newPlayer } = await supabase
    .from("players")
    .insert({ phone, name, group_id: groupId })
    .select()
    .single();

  return { id: newPlayer!.id, name };
}

// Find the most recent upcoming game for a group
export async function findActiveGame(groupId: string) {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("games")
    .select("*")
    .eq("group_id", groupId)
    .eq("status", "upcoming")
    .gte("date", today)
    .order("date", { ascending: true })
    .order("time", { ascending: true })
    .limit(1)
    .single();

  return data;
}

// Handle RSVP (in/out/maybe) with +N guest support
export async function handleRsvp(
  gameId: string,
  playerName: string,
  playerPhone: string,
  status: "in" | "out" | "maybe",
  guests: number = 0
): Promise<{
  message: string;
  promoted?: string; // player promoted from waitlist
}> {
  // Get game details
  const { data: game } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (!game) return { message: "Game not found." };

  // Get current RSVPs
  const { data: rsvps } = await supabase
    .from("rsvps")
    .select("*")
    .eq("game_id", gameId)
    .eq("status", "in")
    .order("created_at", { ascending: true });

  const currentRsvps = rsvps || [];

  // Count total spots taken (players + their guests)
  const existingRsvp = currentRsvps.find(
    (r) => r.player_name === playerName || r.player_phone === playerPhone
  );
  const spotsTaken = currentRsvps.reduce((sum, r) => {
    // Don't count the current player's old RSVP
    if (r.player_name === playerName || r.player_phone === playerPhone) return sum;
    return sum + 1 + (r.guests || 0);
  }, 0);

  let waitlistPosition: number | null = null;
  let promoted: string | undefined;

  if (status === "in") {
    const spotsNeeded = 1 + guests;
    const spotsAvailable = game.capacity - spotsTaken;

    if (spotsNeeded > spotsAvailable) {
      // Waitlist
      const waitlistedCount = currentRsvps.filter(
        (r) => r.waitlist_position !== null && r.player_name !== playerName
      ).length;
      waitlistPosition = waitlistedCount + 1;
    }
  }

  // Upsert the RSVP
  const { error } = await supabase.from("rsvps").upsert(
    {
      game_id: gameId,
      player_name: playerName,
      player_phone: playerPhone,
      status,
      guests: status === "in" ? guests : 0,
      waitlist_position: waitlistPosition,
    },
    { onConflict: "game_id,player_name" }
  );

  if (error) return { message: "Error saving RSVP: " + error.message };

  // If someone went "out", try to promote from waitlist
  if (status === "out") {
    promoted = await promoteFromWaitlist(gameId, game.capacity);
  }

  // Build response message
  const newSpotsTaken = await countSpotsTaken(gameId);

  if (status === "in") {
    const guestText = guests > 0 ? ` (+${guests} guest${guests > 1 ? "s" : ""})` : "";
    if (waitlistPosition) {
      return {
        message: `Got it ${playerName}! Game is full - you're #${waitlistPosition} on the waitlist${guestText}. ${newSpotsTaken}/${game.capacity} spots filled.`,
      };
    }
    return {
      message: `Got it ${playerName}! You're in${guestText}. ${newSpotsTaken}/${game.capacity} spots filled.`,
      promoted,
    };
  }

  if (status === "out") {
    return {
      message: `Got it ${playerName}, you're out. ${newSpotsTaken}/${game.capacity} spots filled.`,
      promoted,
    };
  }

  // maybe
  return {
    message: `Got it ${playerName}, marked as maybe. ${newSpotsTaken}/${game.capacity} spots filled.`,
  };
}

async function countSpotsTaken(gameId: string): Promise<number> {
  const { data } = await supabase
    .from("rsvps")
    .select("guests")
    .eq("game_id", gameId)
    .eq("status", "in")
    .is("waitlist_position", null);

  if (!data) return 0;
  return data.reduce((sum, r) => sum + 1 + (r.guests || 0), 0);
}

async function promoteFromWaitlist(
  gameId: string,
  capacity: number
): Promise<string | undefined> {
  const spotsTaken = await countSpotsTaken(gameId);
  if (spotsTaken >= capacity) return undefined;

  // Find first person on waitlist
  const { data: waitlisted } = await supabase
    .from("rsvps")
    .select("*")
    .eq("game_id", gameId)
    .eq("status", "in")
    .not("waitlist_position", "is", null)
    .order("waitlist_position", { ascending: true })
    .limit(1);

  if (!waitlisted || waitlisted.length === 0) return undefined;

  const promoted = waitlisted[0];

  // Check if promoting this person (+ guests) fits
  const spotsNeeded = 1 + (promoted.guests || 0);
  const spotsAvailable = capacity - spotsTaken;

  if (spotsNeeded > spotsAvailable) return undefined;

  // Promote them
  await supabase
    .from("rsvps")
    .update({ waitlist_position: null })
    .eq("id", promoted.id);

  // Recalculate remaining waitlist positions
  const { data: remaining } = await supabase
    .from("rsvps")
    .select("id")
    .eq("game_id", gameId)
    .eq("status", "in")
    .not("waitlist_position", "is", null)
    .order("waitlist_position", { ascending: true });

  if (remaining) {
    for (let i = 0; i < remaining.length; i++) {
      await supabase
        .from("rsvps")
        .update({ waitlist_position: i + 1 })
        .eq("id", remaining[i].id);
    }
  }

  return promoted.player_name;
}

// Build status message for a game
export async function buildStatusMessage(gameId: string): Promise<string> {
  const { data: game } = await supabase
    .from("games")
    .select("*, groups!inner(name, sport)")
    .eq("id", gameId)
    .single();

  if (!game) return "No active game found.";

  const { data: rsvps } = await supabase
    .from("rsvps")
    .select("*")
    .eq("game_id", gameId)
    .order("created_at", { ascending: true });

  const allRsvps = rsvps || [];
  const ins = allRsvps.filter((r) => r.status === "in" && !r.waitlist_position);
  const waitlist = allRsvps.filter((r) => r.status === "in" && r.waitlist_position);
  const maybes = allRsvps.filter((r) => r.status === "maybe");
  const outs = allRsvps.filter((r) => r.status === "out");

  const totalSpots = ins.reduce((s, r) => s + 1 + (r.guests || 0), 0);

  let msg = `-- ${(game as any).groups.name} --\n`;
  msg += `${game.date} at ${game.time}\n`;
  msg += `${game.location || "Location TBD"}\n`;
  msg += `${totalSpots}/${game.capacity} spots filled\n\n`;

  if (ins.length > 0) {
    msg += `IN (${ins.length}):\n`;
    ins.forEach((r, i) => {
      const guestTag = r.guests > 0 ? ` (+${r.guests})` : "";
      msg += `${i + 1}. ${r.player_name}${guestTag}\n`;
    });
    msg += "\n";
  }

  if (waitlist.length > 0) {
    msg += `WAITLIST (${waitlist.length}):\n`;
    waitlist
      .sort((a, b) => (a.waitlist_position || 0) - (b.waitlist_position || 0))
      .forEach((r) => {
        const guestTag = r.guests > 0 ? ` (+${r.guests})` : "";
        msg += `#${r.waitlist_position} ${r.player_name}${guestTag}\n`;
      });
    msg += "\n";
  }

  if (maybes.length > 0) {
    msg += `MAYBE (${maybes.length}):\n`;
    maybes.forEach((r) => {
      msg += `- ${r.player_name}\n`;
    });
    msg += "\n";
  }

  if (outs.length > 0) {
    msg += `OUT (${outs.length}):\n`;
    outs.forEach((r) => {
      msg += `- ${r.player_name}\n`;
    });
  }

  return msg.trim();
}

// Build stats/leaderboard message
export async function buildStatsMessage(groupId: string): Promise<string> {
  const { data: games } = await supabase
    .from("games")
    .select("id")
    .eq("group_id", groupId);

  if (!games || games.length === 0) return "No games played yet.";

  const gameIds = games.map((g) => g.id);

  const { data: rsvps } = await supabase
    .from("rsvps")
    .select("*")
    .in("game_id", gameIds);

  if (!rsvps || rsvps.length === 0) return "No RSVPs yet.";

  const playerMap = new Map<
    string,
    { inCount: number; total: number }
  >();

  for (const r of rsvps) {
    if (!playerMap.has(r.player_name)) {
      playerMap.set(r.player_name, { inCount: 0, total: 0 });
    }
    const p = playerMap.get(r.player_name)!;
    p.total++;
    if (r.status === "in") p.inCount++;
  }

  const sorted = Array.from(playerMap.entries())
    .map(([name, s]) => ({
      name,
      rate: Math.round((s.inCount / s.total) * 100),
      inCount: s.inCount,
      total: s.total,
    }))
    .sort((a, b) => b.rate - a.rate);

  let msg = "-- Attendance Leaderboard --\n\n";
  sorted.forEach((p, i) => {
    const medal = i === 0 ? " [MVP]" : i === 1 ? " [2nd]" : i === 2 ? " [3rd]" : "";
    msg += `${i + 1}. ${p.name} - ${p.rate}% (${p.inCount}/${p.total} games)${medal}\n`;
  });

  return msg.trim();
}

// Build game announcement message
export function buildAnnouncementMessage(
  groupName: string,
  sport: string,
  date: string,
  time: string,
  location: string,
  capacity: number
): string {
  return (
    `Game On! ${groupName}\n` +
    `${sport} - ${date} at ${time}\n` +
    `Location: ${location || "TBD"}\n` +
    `${capacity} spots available.\n\n` +
    `Reply to RSVP:\n` +
    `- "in" or "yes" = I'm in\n` +
    `- "in +2" = I'm in, bringing 2\n` +
    `- "out" or "no" = I'm out\n` +
    `- "maybe" = Maybe\n` +
    `- "status" = See who's in/out\n` +
    `- "stats" = Attendance leaderboard`
  );
}
