import { connectDB } from "./mongodb";
import { Group, Game, Rsvp, Player, OptOut } from "./models";

// Parse incoming WhatsApp message into a command
export type BotCommand =
  | { type: "in"; guests: number; onBehalf?: string }
  | { type: "out"; onBehalf?: string }
  | { type: "maybe"; onBehalf?: string }
  | { type: "status" }
  | { type: "stats" }
  | { type: "stop" }
  | { type: "start" }
  | { type: "help" }
  | { type: "create"; day: string; time: string; sport?: string; location?: string; capacity?: number }
  | { type: "unknown" };

export function parseCommand(text: string): BotCommand {
  const msg = text.trim();
  const msgLower = msg.toLowerCase();

  // "in @Name +N" or "yes @Name +2" - RSVP on behalf with guests
  const onBehalfPlusMatch = msg.match(/^(?:in|yes|y)\s+@?([a-zA-Z][a-zA-Z0-9_ ]*?)\s*\+\s*(\d+)$/i);
  if (onBehalfPlusMatch) {
    return { type: "in", guests: parseInt(onBehalfPlusMatch[2], 10), onBehalf: onBehalfPlusMatch[1].trim() };
  }

  // "in @Name" or "yes @Name" - RSVP on behalf
  const onBehalfInMatch = msg.match(/^(?:in|yes|y)\s+@?([a-zA-Z][a-zA-Z0-9_ ]+)$/i);
  if (onBehalfInMatch) {
    return { type: "in", guests: 0, onBehalf: onBehalfInMatch[1].trim() };
  }

  // "out @Name" - mark someone else as out
  const onBehalfOutMatch = msg.match(/^(?:out|no|n)\s+@?([a-zA-Z][a-zA-Z0-9_ ]+)$/i);
  if (onBehalfOutMatch) {
    return { type: "out", onBehalf: onBehalfOutMatch[1].trim() };
  }

  // "maybe @Name"
  const onBehalfMaybeMatch = msg.match(/^(?:maybe|m)\s+@?([a-zA-Z][a-zA-Z0-9_ ]+)$/i);
  if (onBehalfMaybeMatch) {
    return { type: "maybe", onBehalf: onBehalfMaybeMatch[1].trim() };
  }

  // Check for "in +N" or "yes +N" patterns (self)
  const plusMatch = msgLower.match(/^(?:in|yes|y)\s*\+\s*(\d+)$/);
  if (plusMatch) {
    return { type: "in", guests: parseInt(plusMatch[1], 10) };
  }

  // Simple commands
  if (/^(in|yes|y)$/i.test(msgLower)) {
    return { type: "in", guests: 0 };
  }
  if (/^(out|no|n)$/i.test(msgLower)) {
    return { type: "out" };
  }
  if (/^(maybe|m)$/i.test(msgLower)) {
    return { type: "maybe" };
  }
  if (/^(status|list)$/i.test(msgLower)) {
    return { type: "status" };
  }
  if (/^(stats)$/i.test(msgLower)) {
    return { type: "stats" };
  }

  // --- Natural language matching ---

  // "in" variations
  const inPhrases = [
    "i'm in", "im in", "count me in", "yes please", "yep", "yeah", "sure",
    "down", "lets go", "let's go", "i'll be there", "ill be there", "coming",
    "sign me up", "absolutely", "for sure", "definitely", "i'm down", "im down",
  ];
  if (inPhrases.includes(msgLower)) {
    return { type: "in", guests: 0 };
  }

  // "out" variations
  const outPhrases = [
    "i'm out", "im out", "can't make it", "cant make it", "not coming", "pass",
    "skip", "nah", "nope", "can't", "cant", "won't make it", "wont make it",
    "sorry can't", "sorry cant", "not this time", "count me out",
  ];
  if (outPhrases.includes(msgLower)) {
    return { type: "out" };
  }

  // "maybe" variations
  const maybePhrases = [
    "not sure", "might come", "let me check", "possibly", "perhaps",
    "we'll see", "well see", "tentative", "idk", "might",
  ];
  if (maybePhrases.includes(msgLower)) {
    return { type: "maybe" };
  }

  // "status" variations
  const statusPhrases = [
    "who's in", "whos in", "who's coming", "whos coming", "how many",
    "numbers", "attendance", "lineup", "roster",
  ];
  if (statusPhrases.includes(msgLower)) {
    return { type: "status" };
  }

  // opt-out / opt-in / help commands
  if (/^(stop|unsubscribe|opt.?out|quiet|mute|no.?more|leave)$/i.test(msgLower)) {
    return { type: "stop" };
  }
  if (/^(start|subscribe|opt.?in|resume|unmute|rejoin)$/i.test(msgLower)) {
    return { type: "start" };
  }
  if (/^(help|commands|\?)$/i.test(msgLower)) {
    return { type: "help" };
  }

  // "create" command: create <day> <time> <sport> at <location> [for <capacity>]
  // e.g. "create Sunday 10am Soccer at Willetton Reserve"
  // e.g. "create tomorrow 6pm Basketball at the park for 12"
  const createMatch = msg.match(
    /^create\s+(\w+)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s+(.+?)(?:\s+at\s+(.+?))?(?:\s+for\s+(\d+))?$/i
  );
  if (createMatch) {
    const [, dayStr, timeStr, sportAndMaybeLoc, locationFromAt, capacityStr] = createMatch;
    let sport = sportAndMaybeLoc.trim();
    let location = locationFromAt?.trim();
    
    // If no "at" separator, sport is the whole middle part
    // Clean up sport name
    sport = sport.replace(/\s+at$/, "").trim();

    return {
      type: "create",
      day: dayStr,
      time: normalizeTime(timeStr),
      sport: sport || undefined,
      location: location || undefined,
      capacity: capacityStr ? parseInt(capacityStr, 10) : undefined,
    };
  }

  return { type: "unknown" };
}

// Normalize time strings like "10am", "6pm", "14:30", "6:30pm" to "HH:MM"
function normalizeTime(timeStr: string): string {
  const t = timeStr.trim().toLowerCase();
  
  // Match "6pm", "10am", "6:30pm", "10:30am"
  const match = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2] || "00";
    const period = match[3];
    
    if (period === "pm" && hours !== 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, "0")}:${minutes}`;
  }
  
  // Match "14:30" or "9:00"
  const militaryMatch = t.match(/^(\d{1,2}):(\d{2})$/);
  if (militaryMatch) {
    return `${militaryMatch[1].padStart(2, "0")}:${militaryMatch[2]}`;
  }
  
  // Just a number like "10" - assume AM
  const plainMatch = t.match(/^(\d{1,2})$/);
  if (plainMatch) {
    return `${plainMatch[1].padStart(2, "0")}:00`;
  }
  
  return "10:00"; // fallback
}

// Resolve a day name ("sunday", "tomorrow", "monday") to a YYYY-MM-DD date string
export function resolveDay(dayStr: string): string {
  const d = dayStr.toLowerCase();
  const now = new Date();
  
  if (d === "today") {
    return formatDateISO(now);
  }
  
  if (d === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateISO(tomorrow);
  }
  
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayIndex = dayNames.indexOf(d);
  
  if (dayIndex !== -1) {
    const currentDay = now.getDay();
    let daysAhead = dayIndex - currentDay;
    if (daysAhead <= 0) daysAhead += 7; // Always next occurrence
    const target = new Date(now);
    target.setDate(target.getDate() + daysAhead);
    return formatDateISO(target);
  }
  
  // Try parsing as a date directly (e.g. "2026-04-05" or "Apr 5")
  const parsed = new Date(dayStr);
  if (!isNaN(parsed.getTime())) {
    return formatDateISO(parsed);
  }
  
  // Fallback: next 7 days from now
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  return formatDateISO(nextWeek);
}

function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Get or create a player by phone number in a group
export async function getOrCreatePlayer(
  phone: string,
  name: string,
  groupId: string
): Promise<{ id: string; name: string }> {
  await connectDB();

  const existing = await Player.findOne({ phone, groupId });

  if (existing) {
    if (existing.name !== name) {
      existing.name = name;
      await existing.save();
    }
    return { id: existing._id.toString(), name: existing.name };
  }

  const newPlayer = await Player.create({ phone, name, groupId });
  return { id: newPlayer._id.toString(), name };
}

// Find the most recent upcoming game for a group
export async function findActiveGame(groupId: string) {
  await connectDB();
  const today = new Date().toISOString().split("T")[0];

  const game = await Game.findOne({
    groupId,
    status: { $in: ["open", "confirmed"] },
    date: { $gte: today },
  })
    .sort({ date: 1, time: 1 })
    .lean();

  return game;
}

// Handle RSVP (in/out/maybe) with +N guest support
export async function handleRsvp(
  gameId: string,
  playerName: string,
  playerPhone: string,
  status: "in" | "out" | "maybe",
  guests: number = 0,
  addedBy?: string
): Promise<{
  message: string;
  promoted?: string;
}> {
  await connectDB();

  const game = await Game.findById(gameId);
  if (!game) return { message: "Game not found." };

  // Get current "in" RSVPs
  const currentRsvps = await Rsvp.find({ gameId, status: "in" }).sort({ createdAt: 1 }).lean();

  // Count total spots taken excluding this player
  const spotsTaken = currentRsvps.reduce((sum, r) => {
    if (r.playerName === playerName || (playerPhone && r.playerPhone === playerPhone)) return sum;
    return sum + 1 + (r.guests || 0);
  }, 0);

  let waitlistPosition: number | null = null;
  let promoted: string | undefined;

  if (status === "in") {
    const spotsNeeded = 1 + guests;
    const spotsAvailable = game.capacity - spotsTaken;

    if (spotsNeeded > spotsAvailable) {
      const waitlistedCount = currentRsvps.filter(
        (r) => r.waitlistPosition !== null && r.playerName !== playerName
      ).length;
      waitlistPosition = waitlistedCount + 1;
    }
  }

  // Upsert the RSVP
  const rsvpData: Record<string, unknown> = {
    gameId,
    playerName,
    playerPhone: playerPhone || null,
    status,
    guests: status === "in" ? guests : 0,
    waitlistPosition,
  };
  if (addedBy) {
    rsvpData.addedBy = addedBy;
  }

  await Rsvp.findOneAndUpdate(
    { gameId, playerName },
    { $set: rsvpData, $setOnInsert: { createdAt: new Date() } },
    { upsert: true, new: true }
  );

  // If someone went "out", try to promote from waitlist
  if (status === "out") {
    promoted = await promoteFromWaitlist(gameId, game.capacity);
  }

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

  return {
    message: `Got it ${playerName}, marked as maybe. ${newSpotsTaken}/${game.capacity} spots filled.`,
  };
}

async function countSpotsTaken(gameId: string): Promise<number> {
  const rsvps = await Rsvp.find({ gameId, status: "in", waitlistPosition: null }).lean();
  return rsvps.reduce((sum, r) => sum + 1 + (r.guests || 0), 0);
}

async function promoteFromWaitlist(
  gameId: string,
  capacity: number
): Promise<string | undefined> {
  const spotsTaken = await countSpotsTaken(gameId);
  if (spotsTaken >= capacity) return undefined;

  const waitlisted = await Rsvp.find({
    gameId,
    status: "in",
    waitlistPosition: { $ne: null },
  }).sort({ waitlistPosition: 1 }).limit(1);

  if (waitlisted.length === 0) return undefined;

  const promoted = waitlisted[0];
  const spotsNeeded = 1 + (promoted.guests || 0);
  const spotsAvailable = capacity - spotsTaken;

  if (spotsNeeded > spotsAvailable) return undefined;

  // Promote
  await Rsvp.updateOne({ _id: promoted._id }, { $set: { waitlistPosition: null } });

  // Recalculate remaining waitlist positions
  const remaining = await Rsvp.find({
    gameId,
    status: "in",
    waitlistPosition: { $ne: null },
  }).sort({ waitlistPosition: 1 });

  for (let i = 0; i < remaining.length; i++) {
    await Rsvp.updateOne({ _id: remaining[i]._id }, { $set: { waitlistPosition: i + 1 } });
  }

  return promoted.playerName;
}

// Build status message for a game
export async function buildStatusMessage(gameId: string): Promise<string> {
  await connectDB();

  const game = await Game.findById(gameId).lean();
  if (!game) return "No active game found.";

  const group = await Group.findById(game.groupId).lean();
  if (!group) return "No active game found.";

  const allRsvps = await Rsvp.find({ gameId }).sort({ createdAt: 1 }).lean();

  const ins = allRsvps.filter((r) => r.status === "in" && !r.waitlistPosition);
  const waitlist = allRsvps.filter((r) => r.status === "in" && r.waitlistPosition);
  const maybes = allRsvps.filter((r) => r.status === "maybe");
  const outs = allRsvps.filter((r) => r.status === "out");

  const totalSpots = ins.reduce((s, r) => s + 1 + (r.guests || 0), 0);

  let msg = `-- ${group.name} --\n`;
  msg += `${game.date} at ${game.time}\n`;
  msg += `${game.location || "Location TBD"}\n`;
  msg += `${totalSpots}/${game.capacity} spots filled\n\n`;

  if (ins.length > 0) {
    msg += `IN (${ins.length}):\n`;
    ins.forEach((r, i) => {
      const guestTag = r.guests > 0 ? ` (+${r.guests})` : "";
      const byTag = !r.playerPhone && r.addedBy ? ` (added by ${r.addedBy})` : "";
      msg += `${i + 1}. ${r.playerName}${guestTag}${byTag}\n`;
    });
    msg += "\n";
  }

  if (waitlist.length > 0) {
    msg += `WAITLIST (${waitlist.length}):\n`;
    waitlist
      .sort((a, b) => (a.waitlistPosition || 0) - (b.waitlistPosition || 0))
      .forEach((r) => {
        const guestTag = r.guests > 0 ? ` (+${r.guests})` : "";
        msg += `#${r.waitlistPosition} ${r.playerName}${guestTag}\n`;
      });
    msg += "\n";
  }

  if (maybes.length > 0) {
    msg += `MAYBE (${maybes.length}):\n`;
    maybes.forEach((r) => {
      msg += `- ${r.playerName}\n`;
    });
    msg += "\n";
  }

  if (outs.length > 0) {
    msg += `OUT (${outs.length}):\n`;
    outs.forEach((r) => {
      msg += `- ${r.playerName}\n`;
    });
  }

  return msg.trim();
}

// Build stats/leaderboard message
export async function buildStatsMessage(groupId: string): Promise<string> {
  await connectDB();

  const games = await Game.find({ groupId }).select("_id").lean();
  if (games.length === 0) return "No games played yet.";

  const gameIds = games.map((g) => g._id);
  const rsvps = await Rsvp.find({ gameId: { $in: gameIds } }).lean();
  if (rsvps.length === 0) return "No RSVPs yet.";

  const playerMap = new Map<string, { inCount: number; total: number }>();

  for (const r of rsvps) {
    if (!playerMap.has(r.playerName)) {
      playerMap.set(r.playerName, { inCount: 0, total: 0 });
    }
    const p = playerMap.get(r.playerName)!;
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

// Create a game from WhatsApp bot command
export async function createGameFromBot(
  groupId: string,
  date: string,
  time: string,
  sport?: string,
  location?: string,
  capacity?: number
): Promise<{ success: boolean; message: string; gameId?: string }> {
  await connectDB();

  const group = await Group.findById(groupId).lean();
  if (!group) return { success: false, message: "Group not found." };

  const game = await Game.create({
    groupId: group._id,
    date,
    time,
    location: location || group.location || "",
    capacity: capacity || group.defaultCapacity,
    status: "open",
    minPlayers: 0,
    cutoffTime: null,
    recurring: false,
  });

  const sportName = sport || group.sport;
  const loc = location || group.location || "TBD";
  const cap = capacity || group.defaultCapacity;

  const announcement = buildAnnouncementMessage(
    group.name,
    sportName,
    date,
    time,
    loc,
    cap
  );

  return {
    success: true,
    message: announcement,
    gameId: game._id.toString(),
  };
}

// Check if a player has opted out of reminders
export async function isOptedOut(phone: string, groupId?: string): Promise<boolean> {
  await connectDB();
  const query: Record<string, unknown> = { phone };
  if (groupId) {
    // Opted out globally OR from this specific group
    const optOut = await OptOut.findOne({
      phone,
      $or: [{ groupId: null }, { groupId }],
    }).lean();
    return !!optOut;
  } else {
    const optOut = await OptOut.findOne({ phone, groupId: null }).lean();
    return !!optOut;
  }
}

// Opt a player out of reminders
export async function optOut(
  phone: string,
  groupId?: string
): Promise<{ message: string }> {
  await connectDB();

  // Use null for global opt-out, or the specific groupId
  const gId = groupId || null;

  try {
    await OptOut.findOneAndUpdate(
      { phone, groupId: gId },
      { $set: { phone, groupId: gId, optedOutAt: new Date() } },
      { upsert: true, new: true }
    );
  } catch {
    // Duplicate key — already opted out, that's fine
  }

  if (groupId) {
    const group = await Group.findById(groupId).lean();
    const groupName = group?.name || "this group";
    return {
      message:
        `You've stopped receiving reminders for ${groupName}. ` +
        `You can still RSVP any time. ` +
        `Reply "start" to re-enable reminders.`,
    };
  }

  return {
    message:
      "You've stopped receiving all GameOn reminders. " +
      "You can still RSVP any time by messaging this number. " +
      "Reply \"start\" to re-enable reminders.",
  };
}

// Opt a player back in to reminders
export async function optIn(
  phone: string,
  groupId?: string
): Promise<{ message: string }> {
  await connectDB();

  const gId = groupId || null;

  // Remove the specific opt-out (and the global one too if re-joining a group)
  await OptOut.deleteMany({
    phone,
    $or: [
      { groupId: gId },
      ...(groupId ? [{ groupId: null }] : []),
    ],
  });

  if (groupId) {
    const group = await Group.findById(groupId).lean();
    const groupName = group?.name || "this group";
    return {
      message:
        `Welcome back! You're now receiving reminders for ${groupName} again. ` +
        `Reply "stop" at any time to opt out.`,
    };
  }

  return {
    message:
      "Welcome back! You're now receiving GameOn reminders again. " +
      "Reply \"stop\" at any time to opt out.",
  };
}

// Build help message
export function buildHelpMessage(): string {
  return (
    "GameOn Commands:\n\n" +
    "RSVP:\n" +
    "  in / yes — I'm playing\n" +
    "  out / no — I'm out\n" +
    "  maybe — Not sure yet\n" +
    "  in +2 — I'm in, bringing 2 guests\n" +
    "  in @Dave — Add Dave\n" +
    "  out @Dave — Remove Dave\n\n" +
    "INFO:\n" +
    "  status — Who's in/out\n" +
    "  stats — Attendance leaderboard\n\n" +
    "REMINDERS:\n" +
    "  stop — Stop receiving reminders\n" +
    "  start — Re-enable reminders\n\n" +
    "ADMIN:\n" +
    '  create Sunday 10am Soccer at Willetton Reserve\n' +
    "  create tomorrow 6pm Basketball at the park for 12"
  );
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
    `- "in @Dave" = Add Dave\n` +
    `- "in @Dave +1" = Add Dave + 1 guest\n` +
    `- "out" or "no" = I'm out\n` +
    `- "out @Dave" = Mark Dave as out\n` +
    `- "maybe" = Maybe\n` +
    `- "status" = See who's in/out\n` +
    `- "stats" = Attendance leaderboard`
  );
}
