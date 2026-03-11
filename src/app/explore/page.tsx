"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { SPORTS, formatDate, formatTime } from "@/lib/utils";

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

type ExploreGame = {
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
  } | null;
};

export default function ExplorePage() {
  const [games, setGames] = useState<ExploreGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const loadGames = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sport !== "All") params.set("sport", sport);
      params.set("page", page.toString());

      const res = await fetch(`/api/explore?${params}`);
      const data = await res.json();
      setGames(data.games || []);
      setTotalPages(data.pages || 0);
      setTotal(data.total || 0);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [sport, page]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  useEffect(() => {
    setPage(1);
  }, [sport]);

  return (
    <div>
      <Link href="/" className="mb-4 inline-block text-sm text-[#a3a3a3] hover:text-white">
        ← Home
      </Link>

      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold">
          🔍 Explore Games
        </h1>
        <p className="text-[#a3a3a3]">
          Find pickup games near you. No invite needed — just show up and play.
        </p>
      </div>

      {/* Sport Filter Pills */}
      <div className="mb-6 flex flex-wrap gap-2">
        <FilterPill label="All Sports" value="All" active={sport} onClick={setSport} />
        {SPORTS.map((s) => (
          <FilterPill
            key={s}
            label={`${SPORT_EMOJI[s] || "🎯"} ${s}`}
            value={s}
            active={sport}
            onClick={setSport}
          />
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-[#a3a3a3]">Finding games...</p>
        </div>
      ) : games.length === 0 ? (
        <EmptyState sport={sport} />
      ) : (
        <>
          <p className="mb-4 text-sm text-[#a3a3a3]">
            {total} upcoming {total === 1 ? "game" : "games"} found
          </p>

          <div className="space-y-3">
            {games.map((game) => (
              <ExploreGameCard key={game._id} game={game} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-[#262626] px-4 py-2 text-sm transition hover:border-[#10b981] disabled:opacity-30"
              >
                ← Prev
              </button>
              <span className="text-sm text-[#a3a3a3]">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-[#262626] px-4 py-2 text-sm transition hover:border-[#10b981] disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ExploreGameCard({ game }: { game: ExploreGame }) {
  if (!game.group) return null;

  const emoji = SPORT_EMOJI[game.group.sport] || "🎯";
  const fillPercent = Math.min(100, (game.confirmed / game.capacity) * 100);
  const isFull = game.spotsLeft === 0;

  return (
    <Link
      href={`/g/${game.group.inviteCode}/game/${game._id}`}
      className="block rounded-xl border border-[#262626] bg-[#141414] p-4 transition hover:border-[#10b981]"
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <div>
            <p className="font-semibold">{game.group.name}</p>
            <p className="text-xs text-[#a3a3a3]">{game.group.sport}</p>
          </div>
        </div>
        {isFull ? (
          <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-400">
            Full
          </span>
        ) : (
          <span className="rounded-full bg-[#10b981]/20 px-2.5 py-0.5 text-xs font-medium text-[#10b981]">
            {game.spotsLeft} {game.spotsLeft === 1 ? "spot" : "spots"} left
          </span>
        )}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-[#a3a3a3]">📅 </span>
          {formatDate(game.date)} at {formatTime(game.time)}
        </div>
        <div>
          <span className="text-[#a3a3a3]">📍 </span>
          {game.location || game.group.location || "TBD"}
        </div>
      </div>

      {/* Mini capacity bar */}
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

function FilterPill({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active: string;
  onClick: (v: string) => void;
}) {
  const isActive = active === value;
  return (
    <button
      onClick={() => onClick(value)}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        isActive
          ? "bg-[#10b981] text-white"
          : "border border-[#262626] bg-[#141414] text-[#a3a3a3] hover:border-[#10b981] hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({ sport }: { sport: string }) {
  return (
    <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
      <div className="mb-3 text-4xl">🏟️</div>
      <h2 className="mb-2 text-xl font-bold">No games found</h2>
      <p className="mb-4 max-w-sm text-[#a3a3a3]">
        {sport !== "All"
          ? `No upcoming ${sport} games right now. Try a different sport or check back later.`
          : "No public games scheduled yet. Be the first — create a group and make it discoverable!"}
      </p>
      <Link
        href="/create"
        className="rounded-xl bg-[#10b981] px-6 py-3 font-semibold text-white transition hover:bg-[#059669]"
      >
        Create a Group
      </Link>
    </div>
  );
}
