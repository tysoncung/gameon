"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase, type Group, type Game, type Rsvp } from "@/lib/supabase";
import { formatDate, formatTime, hashPin } from "@/lib/utils";

type RsvpWithGame = Rsvp & { games?: Game; guests?: number };

export default function AdminDashboard() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [rsvpFeed, setRsvpFeed] = useState<RsvpWithGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [announcing, setAnnouncing] = useState<string | null>(null);
  const [announceResult, setAnnounceResult] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    const { data } = await supabase.from("groups").select("*").order("created_at", { ascending: false });
    setGroups(data || []);
    setLoading(false);
  }

  const selectGroup = useCallback(async (group: Group) => {
    setSelectedGroup(group);
    setAuthenticated(false);
    setPin("");

    // Load games
    const { data: gamesList } = await supabase
      .from("games")
      .select("*")
      .eq("group_id", group.id)
      .order("date", { ascending: false });
    setGames(gamesList || []);
  }, []);

  const authenticate = () => {
    if (!selectedGroup) return;
    if (hashPin(pin) === selectedGroup.pin_hash) {
      setAuthenticated(true);
      loadRsvpFeed(selectedGroup.id);
    } else {
      alert("Invalid PIN");
    }
  };

  async function loadRsvpFeed(groupId: string) {
    const { data: groupGames } = await supabase
      .from("games")
      .select("id")
      .eq("group_id", groupId);

    if (!groupGames || groupGames.length === 0) return;

    const gameIds = groupGames.map((g) => g.id);

    const { data: rsvps } = await supabase
      .from("rsvps")
      .select("*")
      .in("game_id", gameIds)
      .order("created_at", { ascending: false })
      .limit(50);

    setRsvpFeed((rsvps || []) as RsvpWithGame[]);
  }

  // Realtime RSVP subscription
  useEffect(() => {
    if (!authenticated || !selectedGroup) return;

    const channel = supabase
      .channel("admin-rsvps")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rsvps" },
        () => {
          loadRsvpFeed(selectedGroup.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authenticated, selectedGroup]);

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

      {/* Group selector */}
      {!selectedGroup ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-[#a3a3a3]">Select a Group</h2>
          {groups.length === 0 ? (
            <p className="py-4 text-center text-[#a3a3a3]">No groups yet.</p>
          ) : (
            <div className="space-y-3">
              {groups.map((g) => (
                <button
                  key={g.id}
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

          {/* Games with announce buttons */}
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
                      key={game.id}
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
                            href={`/g/${selectedGroup.invite_code}/game/${game.id}`}
                            className="mt-1 inline-block text-xs text-[#10b981] hover:underline"
                          >
                            View RSVP page
                          </Link>
                        </div>
                        {isUpcoming && (
                          <button
                            onClick={() => sendAnnouncement(game.id)}
                            disabled={announcing === game.id}
                            className="shrink-0 rounded-lg bg-[#10b981] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#059669] disabled:opacity-50"
                          >
                            {announcing === game.id ? "Sending..." : "Send Announcement"}
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

          {/* Live RSVP feed */}
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
                    key={rsvp.id}
                    className="flex items-center justify-between rounded-lg bg-[#141414] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <StatusBadge status={rsvp.status} />
                      <div>
                        <span className="font-medium">{rsvp.player_name}</span>
                        {(rsvp as any).guests > 0 && (
                          <span className="ml-1 text-sm text-[#a3a3a3]">
                            (+{(rsvp as any).guests})
                          </span>
                        )}
                        {rsvp.waitlist_position && (
                          <span className="ml-2 text-xs text-yellow-500">
                            waitlist #{rsvp.waitlist_position}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-[#a3a3a3]">
                      {new Date(rsvp.created_at).toLocaleString()}
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
