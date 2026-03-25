/**
 * GameOn Matching Engine
 *
 * Scores and ranks games based on a player's profile:
 * - Sport match (exact sport preference)
 * - Skill alignment (prefer games where players are at similar skill levels)
 * - Day availability (games on days the player is free)
 * - Spot urgency (games filling up get a boost)
 * - Freshness (sooner games rank higher)
 */

export type MatchedGame = {
  gameId: string;
  score: number;
  reasons: string[];
  game: {
    _id: string;
    date: string;
    time: string;
    location: string;
    capacity: number;
    confirmed: number;
    spotsLeft: number;
    group: {
      name: string;
      sport: string;
      location: string;
      inviteCode: string;
    };
  };
};

type ProfileData = {
  sports: { name: string; skill: string }[];
  availability: string[];
  location: string;
};

type GameCandidate = {
  _id: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  confirmed: number;
  spotsLeft: number;
  group: {
    name: string;
    sport: string;
    location: string;
    inviteCode: string;
  };
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function scoreGames(profile: ProfileData, games: GameCandidate[]): MatchedGame[] {
  const sportMap = new Map(profile.sports.map((s) => [s.name.toLowerCase(), s]));
  const availDays = new Set(profile.availability.map((d) => d.toLowerCase()));

  const scored = games
    .filter((g) => g.spotsLeft > 0 && g.group) // only games with spots
    .map((game) => {
      let score = 0;
      const reasons: string[] = [];

      // 1. Sport match (0-40 points)
      const sportPref = sportMap.get(game.group.sport.toLowerCase());
      if (sportPref) {
        score += 40;
        reasons.push(`Matches your ${game.group.sport} preference`);
      } else if (sportMap.size === 0) {
        // No sport preferences set — give partial score to everything
        score += 15;
      }

      // 2. Day availability (0-25 points)
      const gameDate = new Date(game.date + "T00:00:00");
      const dayName = DAY_NAMES[gameDate.getDay()];
      if (availDays.has(dayName.toLowerCase())) {
        score += 25;
        reasons.push(`You're usually free on ${dayName}s`);
      } else if (availDays.size === 0) {
        // No availability set — partial score
        score += 10;
      }

      // 3. Spot urgency — games almost full get a boost (0-15 points)
      const fillPercent = game.confirmed / game.capacity;
      if (fillPercent >= 0.7 && fillPercent < 1) {
        const urgencyScore = Math.round(fillPercent * 15);
        score += urgencyScore;
        if (game.spotsLeft <= 3) {
          reasons.push(`Only ${game.spotsLeft} spot${game.spotsLeft === 1 ? "" : "s"} left!`);
        }
      }

      // 4. Freshness — sooner games get more points (0-15 points)
      const now = new Date();
      const gameDay = new Date(game.date + "T00:00:00");
      const daysAway = Math.max(0, (gameDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysAway <= 1) {
        score += 15;
        reasons.push("Happening today/tomorrow");
      } else if (daysAway <= 3) {
        score += 12;
        reasons.push("Coming up this week");
      } else if (daysAway <= 7) {
        score += 8;
      } else {
        score += Math.max(0, 5 - Math.floor(daysAway / 7));
      }

      // 5. Location proximity hint (0-5 points) — basic string matching
      if (
        profile.location &&
        game.group.location &&
        game.group.location.toLowerCase().includes(profile.location.toLowerCase().split(",")[0].trim())
      ) {
        score += 5;
        reasons.push("Near your location");
      }

      return {
        gameId: game._id.toString(),
        score,
        reasons,
        game,
      };
    });

  // Sort by score descending, then by date ascending as tiebreaker
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.game.date.localeCompare(b.game.date);
  });

  return scored;
}
