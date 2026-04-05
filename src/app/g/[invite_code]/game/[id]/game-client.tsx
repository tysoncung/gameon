"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatDate, formatTime } from "@/lib/utils";

type GameData = {
  _id: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  status: string;
};

type GroupData = {
  _id: string;
  name: string;
  inviteCode: string;
};

type RsvpData = {
  _id: string;
  playerName: string;
  playerPhone: string | null;
  status: "in" | "out" | "maybe";
  guests: number;
  waitlistPosition: number | null;
  addedBy: string | null;
  createdAt: string;
};

export default function GameClient() {
  const params = useParams();
  const inviteCode = params.invite_code as string;
  const gameId = params.id as string;

  const [group, setGroup] = useState<GroupData | null>(null);
  const [game, setGame] = useState<GameData | null>(null);
  const [rsvps, setRsvps] = useState<RsvpData[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${gameId}`);
      const data = await res.json();
      if (data.game) {
        setGame(data.game);
        setGroup(data.group);
        setRsvps(data.rsvps || []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    loadData();
    // Poll for updates every 10 seconds instead of realtime
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

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

    try {
      const res = await fetch(`/api/games/${gameId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: name.trim(), status }),
      });
      const data = await res.json();
      if (data.rsvps) {
        setRsvps(data.rsvps);
      }
    } catch {
      alert("Error saving RSVP");
    }

    setSubmitting(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <p className="py-8 text-center text-[#a3a3a3]">Loading...</p>;
  if (!game || !group) return <p className="py-8 text-center text-[#a3a3a3]">Game not found</p>;

  const ins = rsvps.filter((r) => r.status === "in" && !r.waitlistPosition);
  const waitlist = rsvps.filter((r) => r.status === "in" && r.waitlistPosition);
  const maybes = rsvps.filter((r) => r.status === "maybe");
  const outs = rsvps.filter((r) => r.status === "out");
  const totalIn = ins.reduce((sum, r) => sum + 1 + (r.guests || 0), 0);
  const spotsLeft = Math.max(0, game.capacity - totalIn);
  const myRsvp = rsvps.find((r) => r.playerName === name.trim());

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
            {totalIn}/{game.capacity} confirmed
          </span>
          <span className="text-[#a3a3a3]">
            {spotsLeft > 0 ? `${spotsLeft} spots left` : "FULL"}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#262626]">
          <div
            className="h-full rounded-full bg-[#10b981] transition-all"
            style={{ width: `${Math.min(100, (totalIn / game.capacity) * 100)}%` }}
          />
        </div>
        {waitlist.length > 0 && (
          <p className="mt-1 text-xs text-[#a3a3a3]">{waitlist.length} on waitlist</p>
        )}
      </div>

      {/* RSVP Section */}
      <div className="mb-6 rounded-xl border border-[#262626] bg-[#141414] p-4 sm:p-5 sticky bottom-16 z-10 sm:static sm:bottom-auto sm:z-auto">
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
        {myRsvp?.waitlistPosition && (
          <p className="mt-2 text-center text-sm text-yellow-500">
            Game is full - you are #{myRsvp.waitlistPosition} on the waitlist
          </p>
        )}
      </div>

      {/* Player Lists */}
      <PlayerList title={`In (${totalIn})`} players={ins.map((r) => r.guests > 0 ? `${r.playerName} (+${r.guests})` : r.playerName)} color="text-[#10b981]" />
      {waitlist.length > 0 && (
        <PlayerList
          title={`Waitlist (${waitlist.length})`}
          players={waitlist.sort((a, b) => (a.waitlistPosition || 0) - (b.waitlistPosition || 0)).map((r) => `${r.playerName} (#${r.waitlistPosition})`)}
          color="text-yellow-500"
        />
      )}
      {maybes.length > 0 && (
        <PlayerList title={`Maybe (${maybes.length})`} players={maybes.map((r) => r.playerName)} color="text-yellow-400" />
      )}
      {outs.length > 0 && (
        <PlayerList title={`Out (${outs.length})`} players={outs.map((r) => r.playerName)} color="text-red-400" />
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
      className={`rounded-xl py-3.5 text-sm font-semibold text-white transition active:scale-[0.97] ${
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
