"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { SPORTS, formatDate, formatTime } from "@/lib/utils";

const SPORT_EMOJI: Record<string, string> = {
  Soccer: "⚽", Basketball: "🏀", Tennis: "🎾", Volleyball: "🏐",
  Badminton: "🏸", Baseball: "⚾", Football: "🏈", Cricket: "🏏",
  Hockey: "🏑", Pickleball: "🥒", "Ultimate Frisbee": "🥏", Other: "🎯",
};

type ActivityItem = {
  id: string;
  type: "rsvp" | "game_created" | "game_full" | "game_completed";
  timestamp: string;
  playerName?: string;
  sport: string;
  groupName: string;
  inviteCode: string;
  gameId: string;
  gameDate: string;
  gameTime: string;
  location: string;
  capacity?: number;
  confirmed?: number;
};

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function ActivityIcon({ type }: { type: ActivityItem["type"] }) {
  switch (type) {
    case "rsvp":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#10b981]/20 text-sm">
          ✋
        </div>
      );
    case "game_created":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-sm">
          🆕
        </div>
      );
    case "game_full":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20 text-sm">
          🔥
        </div>
      );
    case "game_completed":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-sm">
          ✅
        </div>
      );
  }
}

function ActivityMessage({ item }: { item: ActivityItem }) {
  const emoji = SPORT_EMOJI[item.sport] || "🎯";

  switch (item.type) {
    case "rsvp":
      return (
        <p className="text-sm">
          <span className="font-semibold text-white">{item.playerName}</span>
          <span className="text-[#a3a3a3]"> joined </span>
          <Link
            href={`/g/${item.inviteCode}/game/${item.gameId}`}
            className="font-medium text-[#10b981] hover:underline"
          >
            {emoji} {item.groupName}
          </Link>
          <span className="text-[#a3a3a3]">
            {" "}— {formatDate(item.gameDate)} at {formatTime(item.gameTime)}
          </span>
        </p>
      );
    case "game_created":
      return (
        <p className="text-sm">
          <span className="text-[#a3a3a3]">New game posted in </span>
          <Link
            href={`/g/${item.inviteCode}/game/${item.gameId}`}
            className="font-medium text-[#10b981] hover:underline"
          >
            {emoji} {item.groupName}
          </Link>
          <span className="text-[#a3a3a3]">
            {" "}— {formatDate(item.gameDate)} at {formatTime(item.gameTime)}
            {item.location && ` · ${item.location}`}
          </span>
        </p>
      );
    case "game_full":
      return (
        <p className="text-sm">
          <Link
            href={`/g/${item.inviteCode}/game/${item.gameId}`}
            className="font-medium text-[#10b981] hover:underline"
          >
            {emoji} {item.groupName}
          </Link>
          <span className="text-[#a3a3a3]">
            {" "}is full! {item.confirmed}/{item.capacity} confirmed
            {" "}— {formatDate(item.gameDate)}
          </span>
        </p>
      );
    case "game_completed":
      return (
        <p className="text-sm">
          <Link
            href={`/g/${item.inviteCode}/game/${item.gameId}`}
            className="font-medium text-[#10b981] hover:underline"
          >
            {emoji} {item.groupName}
          </Link>
          <span className="text-[#a3a3a3]"> game completed — nice session!</span>
        </p>
      );
  }
}

export default function ActivityPage() {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState("All");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadActivity = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (sport !== "All") params.set("sport", sport);
      params.set("limit", "30");

      const res = await fetch(`/api/activity?${params}`);
      const data = await res.json();
      setActivity(data.activity || []);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [sport]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadActivity, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadActivity]);

  // Group activities by day
  const grouped = activity.reduce<Record<string, ActivityItem[]>>((acc, item) => {
    const date = new Date(item.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let label: string;
    if (date.toDateString() === today.toDateString()) {
      label = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = "Yesterday";
    } else {
      label = date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    }

    if (!acc[label]) acc[label] = [];
    acc[label].push(item);
    return acc;
  }, {});

  return (
    <div>
      <Link href="/" className="mb-4 inline-block text-sm text-[#a3a3a3] hover:text-white">
        ← Home
      </Link>

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold">📡 Activity Feed</h1>
          <p className="text-[#a3a3a3]">
            See what&apos;s happening across GameOn — new games, RSVPs, and more.
          </p>
        </div>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`mt-1 rounded-full px-3 py-1 text-xs font-medium transition ${
            autoRefresh
              ? "bg-[#10b981]/20 text-[#10b981]"
              : "border border-[#262626] text-[#a3a3a3]"
          }`}
          title={autoRefresh ? "Auto-refreshing every 30s" : "Auto-refresh paused"}
        >
          {autoRefresh ? "● Live" : "○ Paused"}
        </button>
      </div>

      {/* Sport Filter */}
      <div className="scrollbar-hide -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <FilterPill label="All" value="All" active={sport} onClick={setSport} />
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

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-[#a3a3a3]">Loading activity...</p>
        </div>
      ) : activity.length === 0 ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
          <div className="mb-3 text-4xl">📡</div>
          <h2 className="mb-2 text-xl font-bold">No activity yet</h2>
          <p className="mb-4 max-w-sm text-[#a3a3a3]">
            When players join games and new matches are created, you&apos;ll see it all here.
          </p>
          <Link
            href="/explore"
            className="rounded-xl bg-[#10b981] px-6 py-3 font-semibold text-white transition hover:bg-[#059669]"
          >
            Explore Games
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#a3a3a3]">
                {day}
              </h2>
              <div className="space-y-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-xl border border-[#262626] bg-[#141414] p-3 transition hover:border-[#1a1a1a]"
                  >
                    <ActivityIcon type={item.type} />
                    <div className="min-w-0 flex-1">
                      <ActivityMessage item={item} />
                      <p className="mt-0.5 text-xs text-[#666]">{timeAgo(item.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
