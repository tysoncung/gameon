"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatDate, formatTime, hashPin } from "@/lib/utils";

type GroupData = {
  _id: string;
  name: string;
  sport: string;
  location: string;
  inviteCode: string;
  adminPin: string;
};

type GameData = {
  _id: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  status: string;
};

type RsvpData = {
  _id: string;
  playerName: string;
  status: string;
  guests: number;
  waitlistPosition: number | null;
  createdAt: string;
};

export default function AdminDashboard() {
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);
  const [games, setGames] = useState<GameData[]>([]);
  const [rsvpFeed, setRsvpFeed] = useState<RsvpData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [announcing, setAnnouncing] = useState<string | null>(null);
  const [announceResult, setAnnounceResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((data) => {
        setGroups(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const selectGroup = useCallback(async (group: GroupData) => {
    setSelectedGroup(group);
    setAuthenticated(false);
    setPin("");

    const res = await fetch(`/api/groups/${group.inviteCode}`);
    const data = await res.json();
    setGames(data.games || []);
  }, []);

  const authenticate = () => {
    if (!selectedGroup) return;
    if (hashPin(pin) === selectedGroup.adminPin) {
      setAuthenticated(true);
      loadRsvpFeed();
    } else {
      alert("Invalid PIN");
    }
  };

  const loadRsvpFeed = useCallback(async () => {
    if (!games.length) return;
    // Load RSVPs for all games
    const allRsvps: RsvpData[] = [];
    for (const game of games.slice(0, 5)) {
      try {
        const res = await fetch(`/api/games/${game._id}`);
        const data = await res.json();
        if (data.rsvps) {
          allRsvps.push(...data.rsvps);
        }
      } catch {
        // ignore
      }
    }
    allRsvps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setRsvpFeed(allRsvps.slice(0, 50));
  }, [games]);

  // Poll for updates
  useEffect(() => {
    if (!authenticated) return;
    const interval = setInterval(loadRsvpFeed, 15000);
    return () => clearInterval(interval);
  }, [authenticated, loadRsvpFeed]);

  const sendAnnouncement = async (gameId: string) => {
    setAnnouncing(gameId);
    setAnnounceResult(null);

    try {
      const res = await fetch("/api/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, pin }),
      });
      const data = await res.json();

      if (res.ok) {
        setAnnounceResult(`Sent to ${data.sent} players (${data.failed} failed)`);
      } else {
        setAnnounceResult(`Error: ${data.error}`);
      }
    } catch {
      setAnnounceResult("Network error");
    }

    setAnnouncing(null);
  };

  if (loading) {
    return <p className="py-8 text-center text-[#a3a3a3]">Loading...</p>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/" className="mb-2 inline-block text-sm text-[#a3a3a3] hover:text-white">
            &larr; Home
          </Link>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
      </div>

      {!selectedGroup ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-[#a3a3a3]">Select a Group</h2>
          {groups.length === 0 ? (
            <p className="py-4 text-center text-[#a3a3a3]">No groups yet.</p>
          ) : (
            <div className="space-y-3">
              {groups.map((g) => (
                <button
                  key={g._id}
                  onClick={() => selectGroup(g)}
                  className="block w-full rounded-xl border border-[#262626] bg-[#141414] p-4 text-left transition hover:border-[#10b981]"
                >
                  <p className="font-semibold">{g.name}</p>
                  <p className="text-sm text-[#a3a3a3]">{g.sport} -- {g.location || "No location"}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : !authenticated ? (
        <div>
          <button
            onClick={() => setSelectedGroup(null)}
            className="mb-4 text-sm text-[#a3a3a3] hover:text-white"
          >
            &larr; Back to groups
          </button>
          <h2 className="mb-4 text-lg font-semibold">{selectedGroup.name} - Enter Admin PIN</h2>
          <div className="flex gap-3">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && authenticate()}
              placeholder="Admin PIN"
              className="input max-w-xs"
            />
            <button
              onClick={authenticate}
              className="rounded-xl bg-[#10b981] px-6 py-3 font-semibold text-white transition hover:bg-[#059669]"
            >
              Unlock
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={() => { setSelectedGroup(null); setAuthenticated(false); }}
            className="mb-4 text-sm text-[#a3a3a3] hover:text-white"
          >
            &larr; Back to groups
          </button>
          <h2 className="mb-6 text-lg font-semibold">{selectedGroup.name}</h2>

          <div className="mb-8">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#a3a3a3]">
              Games
            </h3>
            {games.length === 0 ? (
              <p className="py-4 text-center text-[#a3a3a3]">No games scheduled.</p>
            ) : (
              <div className="space-y-3">
                {games.map((game) => {
                  const isUpcoming = game.date >= new Date().toISOString().split("T")[0] && game.status !== "cancelled";
                  return (
                    <div
                      key={game._id}
                      className="rounded-xl border border-[#262626] bg-[#141414] p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">
                            {formatDate(game.date)} at {formatTime(game.time)}
                          </p>
                          <p className="text-sm text-[#a3a3a3]">
                            {game.location || "TBD"} -- Cap: {game.capacity}
                          </p>
                          <Link
                            href={`/g/${selectedGroup.inviteCode}/game/${game._id}`}
                            className="mt-1 inline-block text-xs text-[#10b981] hover:underline"
                          >
                            View RSVP page
                          </Link>
                        </div>
                        {isUpcoming && (
                          <button
                            onClick={() => sendAnnouncement(game._id)}
                            disabled={announcing === game._id}
                            className="shrink-0 rounded-lg bg-[#10b981] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#059669] disabled:opacity-50"
                          >
                            {announcing === game._id ? "Sending..." : "Send Announcement"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {announceResult && (
              <p className="mt-3 text-sm text-[#a3a3a3]">{announceResult}</p>
            )}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#a3a3a3]">
              Live RSVP Feed
            </h3>
            {rsvpFeed.length === 0 ? (
              <p className="py-4 text-center text-[#a3a3a3]">No RSVPs yet.</p>
            ) : (
              <div className="space-y-2">
                {rsvpFeed.map((rsvp) => (
                  <div
                    key={rsvp._id}
                    className="flex items-center justify-between rounded-lg bg-[#141414] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <StatusBadge status={rsvp.status} />
                      <div>
                        <span className="font-medium">{rsvp.playerName}</span>
                        {rsvp.guests > 0 && (
                          <span className="ml-1 text-sm text-[#a3a3a3]">
                            (+{rsvp.guests})
                          </span>
                        )}
                        {rsvp.waitlistPosition && (
                          <span className="ml-2 text-xs text-yellow-500">
                            waitlist #{rsvp.waitlistPosition}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-[#a3a3a3]">
                      {new Date(rsvp.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    in: "bg-[#10b981]",
    out: "bg-red-600",
    maybe: "bg-yellow-600",
  };
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-bold uppercase text-white ${colors[status] || "bg-gray-600"}`}
    >
      {status}
    </span>
  );
}
