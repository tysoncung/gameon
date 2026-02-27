"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase, type Game, type Group, type Rsvp } from "@/lib/supabase";
import { formatDate, formatTime } from "@/lib/utils";

export default function GamePage() {
  const params = useParams();
  const inviteCode = params.invite_code as string;
  const gameId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    const { data: g } = await supabase
      .from("groups")
      .select("*")
      .eq("invite_code", inviteCode)
      .single();
    setGroup(g);

    const { data: gm } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single();
    setGame(gm);

    const { data: r } = await supabase
      .from("rsvps")
      .select("*")
      .eq("game_id", gameId)
      .order("created_at", { ascending: true });
    setRsvps(r || []);
    setLoading(false);
  }, [inviteCode, gameId]);

  useEffect(() => {
    loadData();

    // Realtime subscription
    const channel = supabase
      .channel(`rsvps-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rsvps", filter: `game_id=eq.${gameId}` },
        () => {
          // Reload rsvps on any change
          supabase
            .from("rsvps")
            .select("*")
            .eq("game_id", gameId)
            .order("created_at", { ascending: true })
            .then(({ data }) => setRsvps(data || []));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData, gameId]);

  // Restore name from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("gameon_name");
    if (saved) setName(saved);
  }, []);

  const handleRsvp = async (status: "in" | "out" | "maybe") => {
    if (!name.trim()) {
      alert("Enter your name first!");
      return;
    }
    setSubmitting(true);
    localStorage.setItem("gameon_name", name.trim());

    const inCount = rsvps.filter((r) => r.status === "in" && r.player_name !== name.trim()).length;
    const isWaitlisted = status === "in" && game && inCount >= game.capacity;

    // Upsert RSVP
    const { error } = await supabase
      .from("rsvps")
      .upsert(
        {
          game_id: gameId,
          player_name: name.trim(),
          status,
          waitlist_position: isWaitlisted ? inCount - (game?.capacity || 0) + 1 : null,
        },
        { onConflict: "game_id,player_name" }
      );

    if (error) {
      alert("Error: " + error.message);
    }

    // Recalculate waitlist positions after someone drops out
    if (status === "out") {
      await recalcWaitlist();
    }

    setSubmitting(false);
  };

  const recalcWaitlist = async () => {
    if (!game) return;
    const { data: current } = await supabase
      .from("rsvps")
      .select("*")
      .eq("game_id", gameId)
      .eq("status", "in")
      .order("created_at", { ascending: true });

    if (!current) return;

    for (let i = 0; i < current.length; i++) {
      const isOver = i >= game.capacity;
      await supabase
        .from("rsvps")
        .update({ waitlist_position: isOver ? i - game.capacity + 1 : null })
        .eq("id", current[i].id);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <p className="py-8 text-center text-[#a3a3a3]">Loading...</p>;
  if (!game || !group) return <p className="py-8 text-center text-[#a3a3a3]">Game not found</p>;

  const ins = rsvps.filter((r) => r.status === "in" && !r.waitlist_position);
  const waitlist = rsvps.filter((r) => r.status === "in" && r.waitlist_position);
  const maybes = rsvps.filter((r) => r.status === "maybe");
  const outs = rsvps.filter((r) => r.status === "out");
  const spotsLeft = Math.max(0, game.capacity - ins.length);
  const myRsvp = rsvps.find((r) => r.player_name === name.trim());

  return (
    <div>
      <Link
        href={`/g/${inviteCode}`}
        className="mb-4 inline-block text-sm text-[#a3a3a3] hover:text-white"
      >
        &larr; {group.name}
      </Link>

      {/* Game Info */}
      <div className="mb-6 rounded-xl border border-[#262626] bg-[#141414] p-5">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">
              {formatDate(game.date)} at {formatTime(game.time)}
            </h1>
            <p className="text-[#a3a3a3]">{game.location || "Location TBD"}</p>
          </div>
          <button
            onClick={copyLink}
            className="shrink-0 rounded-lg border border-[#262626] bg-[#1a1a1a] px-3 py-1.5 text-xs transition hover:border-[#10b981]"
          >
            {copied ? "Copied!" : "Share"}
          </button>
        </div>

        {/* Capacity bar */}
        <div className="mb-1 flex justify-between text-sm">
          <span>
            {ins.length}/{game.capacity} confirmed
          </span>
          <span className="text-[#a3a3a3]">
            {spotsLeft > 0 ? `${spotsLeft} spots left` : "FULL"}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#262626]">
          <div
            className="h-full rounded-full bg-[#10b981] transition-all"
            style={{ width: `${Math.min(100, (ins.length / game.capacity) * 100)}%` }}
          />
        </div>
        {waitlist.length > 0 && (
          <p className="mt-1 text-xs text-[#a3a3a3]">{waitlist.length} on waitlist</p>
        )}
      </div>

      {/* RSVP Section */}
      <div className="mb-6 rounded-xl border border-[#262626] bg-[#141414] p-5">
        <h2 className="mb-3 text-lg font-semibold">RSVP</h2>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input mb-3"
        />
        <div className="grid grid-cols-3 gap-2">
          <RsvpButton
            label="I'm In"
            active={myRsvp?.status === "in"}
            color="bg-[#10b981]"
            onClick={() => handleRsvp("in")}
            disabled={submitting}
          />
          <RsvpButton
            label="Maybe"
            active={myRsvp?.status === "maybe"}
            color="bg-yellow-600"
            onClick={() => handleRsvp("maybe")}
            disabled={submitting}
          />
          <RsvpButton
            label="Out"
            active={myRsvp?.status === "out"}
            color="bg-red-600"
            onClick={() => handleRsvp("out")}
            disabled={submitting}
          />
        </div>
        {myRsvp?.waitlist_position && (
          <p className="mt-2 text-center text-sm text-yellow-500">
            Game is full - you are #{myRsvp.waitlist_position} on the waitlist
          </p>
        )}
      </div>

      {/* Player Lists */}
      <PlayerList title={`In (${ins.length})`} players={ins.map((r) => r.player_name)} color="text-[#10b981]" />
      {waitlist.length > 0 && (
        <PlayerList
          title={`Waitlist (${waitlist.length})`}
          players={waitlist.sort((a, b) => (a.waitlist_position || 0) - (b.waitlist_position || 0)).map((r) => `${r.player_name} (#${r.waitlist_position})`)}
          color="text-yellow-500"
        />
      )}
      {maybes.length > 0 && (
        <PlayerList title={`Maybe (${maybes.length})`} players={maybes.map((r) => r.player_name)} color="text-yellow-400" />
      )}
      {outs.length > 0 && (
        <PlayerList title={`Out (${outs.length})`} players={outs.map((r) => r.player_name)} color="text-red-400" />
      )}
    </div>
  );
}

function RsvpButton({
  label,
  active,
  color,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl py-3 text-sm font-semibold text-white transition ${
        active ? color : "bg-[#262626] hover:bg-[#333]"
      } disabled:opacity-50`}
    >
      {label}
    </button>
  );
}

function PlayerList({ title, players, color }: { title: string; players: string[]; color: string }) {
  return (
    <div className="mb-4">
      <h3 className={`mb-2 text-sm font-semibold ${color}`}>{title}</h3>
      <div className="space-y-1">
        {players.map((p, i) => (
          <div key={i} className="rounded-lg bg-[#141414] px-3 py-2 text-sm">
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}
