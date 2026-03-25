"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatDate, formatTime } from "@/lib/utils";

const SPORT_EMOJI: Record<string, string> = {
  Soccer: "⚽",
  Basketball: "🏀",
  Tennis: "🎾",
  Volleyball: "🏐",
  Badminton: "🏸",
  Baseball: "⚾",
  Football: "🏈",
  Cricket: "🏏",
  Hockey: "🏑",
  Pickleball: "🥒",
  "Ultimate Frisbee": "🥏",
  Other: "🎯",
};

type MatchedGame = {
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

type ProfileSummary = {
  sports: string[];
  availability: string[];
  location: string;
};

export default function ForYouPage() {
  const [matches, setMatches] = useState<MatchedGame[]>([]);
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(null);
  const [matchQuality, setMatchQuality] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [noProfile, setNoProfile] = useState(false);

  const loadRecommendations = useCallback(async () => {
    setLoading(true);

    // First, get the profile ID from localStorage name
    const savedName = localStorage.getItem("gameon_name");
    if (!savedName) {
      setNoProfile(true);
      setLoading(false);
      return;
    }

    try {
      // Get profile by name
      const profileRes = await fetch(`/api/profile?name=${encodeURIComponent(savedName)}`);
      const profileData = await profileRes.json();

      if (!profileData.profile) {
        setNoProfile(true);
        setLoading(false);
        return;
      }

      // Get recommendations
      const recRes = await fetch(`/api/recommended?profileId=${profileData.profile._id}&limit=15`);
      const recData = await recRes.json();

      setMatches(recData.games || []);
      setMatchQuality(recData.matchQuality || "");
      setProfileSummary(recData.profileSummary || null);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-3 text-4xl animate-pulse">🤖</div>
          <p className="text-[#a3a3a3]">Finding your perfect games...</p>
        </div>
      </div>
    );
  }

  if (noProfile) {
    return (
      <div>
        <Link href="/" className="mb-4 inline-block text-sm text-[#a3a3a3] hover:text-white">
          ← Home
        </Link>
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
          <div className="mb-3 text-4xl">👤</div>
          <h2 className="mb-2 text-xl font-bold">Set up your profile first</h2>
          <p className="mb-6 max-w-sm text-[#a3a3a3]">
            We need to know your sport preferences, availability, and location to recommend the best games for you.
          </p>
          <Link
            href="/profile"
            className="rounded-xl bg-[#10b981] px-6 py-3 font-semibold text-white transition hover:bg-[#059669]"
          >
            Create Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link href="/" className="mb-4 inline-block text-sm text-[#a3a3a3] hover:text-white">
        ← Home
      </Link>

      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold">🤖 For You</h1>
        <p className="text-[#a3a3a3]">
          Games picked based on your sports, availability, and location.
        </p>
      </div>

      {/* Profile context chip */}
      {profileSummary && (
        <div className="mb-6 rounded-xl border border-[#262626] bg-[#141414] p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-[#a3a3a3]">Matching based on:</span>
            {profileSummary.sports.map((s) => (
              <span
                key={s}
                className="rounded-full bg-[#10b981]/20 px-2.5 py-0.5 text-xs font-medium text-[#10b981]"
              >
                {SPORT_EMOJI[s] || "🎯"} {s}
              </span>
            ))}
            {profileSummary.availability.length > 0 && (
              <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                📅 {profileSummary.availability.map((d) => d.slice(0, 3)).join(", ")}
              </span>
            )}
            {profileSummary.location && (
              <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-medium text-purple-400">
                📍 {profileSummary.location}
              </span>
            )}
            <Link href="/profile" className="ml-auto text-xs text-[#10b981] hover:underline">
              Edit preferences →
            </Link>
          </div>
        </div>
      )}

      {/* Match quality indicator */}
      {matchQuality && matches.length > 0 && (
        <div className="mb-4">
          <MatchQualityBadge quality={matchQuality} count={matches.length} />
        </div>
      )}

      {/* Results */}
      {matches.length === 0 ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
          <div className="mb-3 text-4xl">🏟️</div>
          <h2 className="mb-2 text-xl font-bold">No matches yet</h2>
          <p className="mb-4 max-w-sm text-[#a3a3a3]">
            No public games match your profile right now. Check back later or browse all games.
          </p>
          <Link
            href="/explore"
            className="rounded-xl border border-[#262626] bg-[#141414] px-6 py-3 font-semibold transition hover:border-[#10b981]"
          >
            Browse All Games
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match, idx) => (
            <RecommendedGameCard key={match.gameId} match={match} rank={idx + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function RecommendedGameCard({ match, rank }: { match: MatchedGame; rank: number }) {
  const { game, score, reasons } = match;
  const emoji = SPORT_EMOJI[game.group.sport] || "🎯";
  const fillPercent = Math.min(100, (game.confirmed / game.capacity) * 100);
  const isFull = game.spotsLeft === 0;

  return (
    <Link
      href={`/g/${game.group.inviteCode}/game/${game._id}`}
      className="block rounded-xl border border-[#262626] bg-[#141414] p-4 transition hover:border-[#10b981]"
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#10b981]/20 text-sm font-bold text-[#10b981]">
            #{rank}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{emoji}</span>
            <div>
              <p className="font-semibold">{game.group.name}</p>
              <p className="text-xs text-[#a3a3a3]">{game.group.sport}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MatchScore score={score} />
          {isFull ? (
            <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-400">
              Full
            </span>
          ) : (
            <span className="rounded-full bg-[#10b981]/20 px-2.5 py-0.5 text-xs font-medium text-[#10b981]">
              {game.spotsLeft} left
            </span>
          )}
        </div>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-[#a3a3a3]">📅 </span>
          {formatDate(game.date)} at {formatTime(game.time)}
        </div>
        <div>
          <span className="text-[#a3a3a3]">📍 </span>
          {game.location || game.group.location || "TBD"}
        </div>
      </div>

      {/* Match reasons */}
      {reasons.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {reasons.map((reason, i) => (
            <span
              key={i}
              className="rounded-full bg-[#1a1a1a] px-2 py-0.5 text-xs text-[#a3a3a3]"
            >
              ✨ {reason}
            </span>
          ))}
        </div>
      )}

      {/* Capacity bar */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#262626]">
          <div
            className={`h-full rounded-full transition-all ${isFull ? "bg-red-500" : "bg-[#10b981]"}`}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
        <span className="text-xs text-[#a3a3a3]">
          {game.confirmed}/{game.capacity}
        </span>
      </div>
    </Link>
  );
}

function MatchScore({ score }: { score: number }) {
  let color = "text-[#a3a3a3]";
  if (score >= 60) color = "text-[#10b981]";
  else if (score >= 40) color = "text-yellow-400";
  else if (score >= 20) color = "text-orange-400";

  return (
    <span className={`text-xs font-bold ${color}`} title="Match score">
      {score}%
    </span>
  );
}

function MatchQualityBadge({ quality, count }: { quality: string; count: number }) {
  const config: Record<string, { emoji: string; label: string; color: string }> = {
    great: { emoji: "🎯", label: "Great matches!", color: "text-[#10b981]" },
    good: { emoji: "👍", label: "Good matches", color: "text-yellow-400" },
    fair: { emoji: "🔍", label: "Some matches", color: "text-orange-400" },
    low: { emoji: "💡", label: "Try updating your profile for better matches", color: "text-[#a3a3a3]" },
  };

  const c = config[quality] || config.low;

  return (
    <p className={`text-sm ${c.color}`}>
      {c.emoji} {c.label} — {count} game{count !== 1 ? "s" : ""} found
    </p>
  );
}
