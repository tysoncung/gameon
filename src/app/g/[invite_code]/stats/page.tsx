"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase, type Group } from "@/lib/supabase";

type PlayerStat = {
  name: string;
  total_games: number;
  in_count: number;
  out_count: number;
  maybe_count: number;
  attendance_rate: number;
  flake_rate: number;
};

export default function StatsPage() {
  const params = useParams();
  const inviteCode = params.invite_code as string;
  const [group, setGroup] = useState<Group | null>(null);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [inviteCode]);

  async function loadStats() {
    const { data: g } = await supabase
      .from("groups")
      .select("*")
      .eq("invite_code", inviteCode)
      .single();

    if (!g) {
      setLoading(false);
      return;
    }
    setGroup(g);

    // Get all games for this group
    const { data: games } = await supabase
      .from("games")
      .select("id")
      .eq("group_id", g.id);

    if (!games || games.length === 0) {
      setLoading(false);
      return;
    }

    const gameIds = games.map((gm) => gm.id);

    // Get all RSVPs for these games
    const { data: rsvps } = await supabase
      .from("rsvps")
      .select("*")
      .in("game_id", gameIds);

    if (!rsvps) {
      setLoading(false);
      return;
    }

    // Aggregate by player
    const playerMap = new Map<string, { in: number; out: number; maybe: number; games: Set<string> }>();

    for (const r of rsvps) {
      if (!playerMap.has(r.player_name)) {
        playerMap.set(r.player_name, { in: 0, out: 0, maybe: 0, games: new Set() });
      }
      const p = playerMap.get(r.player_name)!;
      p.games.add(r.game_id);
      if (r.status === "in") p.in++;
      else if (r.status === "out") p.out++;
      else if (r.status === "maybe") p.maybe++;
    }

    const totalGames = games.length;
    const playerStats: PlayerStat[] = [];

    playerMap.forEach((val, name) => {
      const total = val.in + val.out + val.maybe;
      playerStats.push({
        name,
        total_games: val.games.size,
        in_count: val.in,
        out_count: val.out,
        maybe_count: val.maybe,
        attendance_rate: total > 0 ? Math.round((val.in / total) * 100) : 0,
        flake_rate: total > 0 ? Math.round((val.out / total) * 100) : 0,
      });
    });

    // Sort by attendance rate desc
    playerStats.sort((a, b) => b.attendance_rate - a.attendance_rate);
    setStats(playerStats);
    setLoading(false);
  }

  if (loading) return <p className="py-8 text-center text-[#a3a3a3]">Loading...</p>;
  if (!group) return <p className="py-8 text-center text-[#a3a3a3]">Group not found</p>;

  return (
    <div>
      <Link
        href={`/g/${inviteCode}`}
        className="mb-4 inline-block text-sm text-[#a3a3a3] hover:text-white"
      >
        &larr; {group.name}
      </Link>

      <h1 className="mb-6 text-2xl font-bold">Attendance Stats</h1>

      {stats.length === 0 ? (
        <p className="py-8 text-center text-[#a3a3a3]">No stats yet. Play some games first!</p>
      ) : (
        <div className="space-y-3">
          {stats.map((player, i) => (
            <div
              key={player.name}
              className="rounded-xl border border-[#262626] bg-[#141414] p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#262626] text-sm font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{player.name}</p>
                    <p className="text-xs text-[#a3a3a3]">
                      {player.in_count} in / {player.out_count} out / {player.maybe_count} maybe
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#10b981]">{player.attendance_rate}%</p>
                  <p className="text-xs text-[#a3a3a3]">attendance</p>
                </div>
              </div>

              {/* Attendance bar */}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#262626]">
                <div
                  className="h-full rounded-full bg-[#10b981]"
                  style={{ width: `${player.attendance_rate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
