"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase, type Group, type Game } from "@/lib/supabase";
import { formatDate, formatTime } from "@/lib/utils";

export default function GroupPage() {
  const params = useParams();
  const inviteCode = params.invite_code as string;
  const [group, setGroup] = useState<Group | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadGroup();
  }, [inviteCode]);

  async function loadGroup() {
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

    const { data: gamesList } = await supabase
      .from("games")
      .select("*")
      .eq("group_id", g.id)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    setGames(gamesList || []);
    setLoading(false);
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <Loading />;
  if (!group) return <NotFound />;

  const today = new Date().toISOString().split("T")[0];
  const upcoming = games.filter((g) => g.date >= today && g.status !== "cancelled");
  const past = games.filter((g) => g.date < today || g.status === "completed");

  return (
    <div>
      <Link href="/" className="mb-4 inline-block text-sm text-[#a3a3a3] hover:text-white">
        &larr; Home
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-[#a3a3a3]">
            {group.sport} -- {group.location || "No default location"}
          </p>
        </div>
        <button
          onClick={copyLink}
          className="shrink-0 rounded-lg border border-[#262626] bg-[#141414] px-3 py-2 text-sm transition hover:border-[#10b981]"
        >
          {copied ? "Copied!" : "Share Link"}
        </button>
      </div>

      <div className="mb-6 flex gap-3">
        <Link
          href={`/g/${inviteCode}/new-game`}
          className="rounded-xl bg-[#10b981] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#059669]"
        >
          + New Game
        </Link>
        <Link
          href={`/g/${inviteCode}/stats`}
          className="rounded-xl border border-[#262626] bg-[#141414] px-5 py-2.5 text-sm font-semibold transition hover:border-[#10b981]"
        >
          Stats
        </Link>
      </div>

      <Section title="Upcoming Games">
        {upcoming.length === 0 ? (
          <p className="py-4 text-center text-[#a3a3a3]">No upcoming games. Schedule one!</p>
        ) : (
          upcoming.map((game) => (
            <GameCard key={game.id} game={game} inviteCode={inviteCode} />
          ))
        )}
      </Section>

      {past.length > 0 && (
        <Section title="Past Games">
          {past.map((game) => (
            <GameCard key={game.id} game={game} inviteCode={inviteCode} />
          ))}
        </Section>
      )}
    </div>
  );
}

function GameCard({ game, inviteCode }: { game: Game; inviteCode: string }) {
  return (
    <Link
      href={`/g/${inviteCode}/game/${game.id}`}
      className="block rounded-xl border border-[#262626] bg-[#141414] p-4 transition hover:border-[#10b981]"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">
            {formatDate(game.date)} at {formatTime(game.time)}
          </p>
          <p className="text-sm text-[#a3a3a3]">{game.location || "TBD"}</p>
        </div>
        <div className="text-right">
          <span className="text-sm text-[#a3a3a3]">
            Cap: {game.capacity}
          </span>
          {game.recurring && (
            <span className="ml-2 rounded bg-[#10b981]/20 px-2 py-0.5 text-xs text-[#10b981]">
              {game.recurring}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-[#a3a3a3]">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-[#a3a3a3]">Loading...</p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h1 className="mb-2 text-2xl font-bold">Group Not Found</h1>
      <p className="mb-4 text-[#a3a3a3]">This invite link is invalid or expired.</p>
      <Link href="/" className="text-[#10b981] hover:underline">Go Home</Link>
    </div>
  );
}
