"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatDate, formatTime } from "@/lib/utils";

const SPORT_EMOJI: Record<string, string> = {
  Soccer: "⚽", Basketball: "🏀", Tennis: "🎾", Volleyball: "🏐",
  Badminton: "🏸", Baseball: "⚾", Football: "🏈", Cricket: "🏏",
  Hockey: "🏑", Pickleball: "🥒", "Ultimate Frisbee": "🥏", Other: "🎯",
};

const SKILL_BADGE: Record<string, { label: string; color: string }> = {
  beginner: { label: "🌱 Beginner", color: "bg-green-900/40 text-green-400" },
  intermediate: { label: "⚡ Intermediate", color: "bg-blue-900/40 text-blue-400" },
  advanced: { label: "🔥 Advanced", color: "bg-orange-900/40 text-orange-400" },
  pro: { label: "🏆 Pro", color: "bg-purple-900/40 text-purple-400" },
};

type ProfileData = {
  _id: string;
  name: string;
  bio: string;
  location: string;
  sports: { name: string; skill: string }[];
  availability: string[];
  gamesPlayed: number;
  gamesNoShow: number;
  createdAt: string;
};

type GameHistoryItem = {
  gameId: string;
  date: string;
  time: string;
  location: string;
  sport: string;
  groupName: string;
  inviteCode: string;
};

export default function ProfileClient() {
  const params = useParams();
  const id = params.id as string;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);
  const [reliability, setReliability] = useState<number | null>(null);
  const [totalRsvps, setTotalRsvps] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOwn, setIsOwn] = useState(false);

  useEffect(() => {
    fetch(`/api/profile/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          setGameHistory(data.gameHistory || []);
          setReliability(data.reliability);
          setTotalRsvps(data.totalRsvps || 0);

          // Check if this is the current user's profile
          const savedName = localStorage.getItem("gameon_name");
          if (savedName && savedName.toLowerCase() === data.profile.name.toLowerCase()) {
            setIsOwn(true);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="py-8 text-center text-[#a3a3a3]">Loading...</p>;
  if (!profile) return <p className="py-8 text-center text-[#a3a3a3]">Profile not found</p>;

  const memberSince = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <Link href="/explore" className="mb-4 inline-block text-sm text-[#a3a3a3] hover:text-white">
        ← Back
      </Link>

      {/* Profile Header */}
      <div className="mb-6 rounded-xl border border-[#262626] bg-[#141414] p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#10b981]/20 text-xl font-bold text-[#10b981]">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                {profile.location && (
                  <p className="text-sm text-[#a3a3a3]">📍 {profile.location}</p>
                )}
              </div>
            </div>
          </div>
          {isOwn && (
            <Link
              href="/profile"
              className="rounded-lg border border-[#262626] px-3 py-1.5 text-sm transition hover:border-[#10b981]"
            >
              Edit
            </Link>
          )}
        </div>

        {profile.bio && <p className="mb-4 text-[#a3a3a3]">{profile.bio}</p>}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <StatCard label="Games" value={totalRsvps.toString()} />
          <StatCard
            label="Reliability"
            value={reliability !== null ? `${reliability}%` : "—"}
          />
          <StatCard label="Since" value={memberSince} />
        </div>
      </div>

      {/* Sports & Skills */}
      {profile.sports.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#a3a3a3]">
            Sports
          </h2>
          <div className="space-y-2">
            {profile.sports.map((sport) => {
              const badge = SKILL_BADGE[sport.skill] || SKILL_BADGE.intermediate;
              const emoji = SPORT_EMOJI[sport.name] || "🎯";
              return (
                <div
                  key={sport.name}
                  className="flex items-center justify-between rounded-xl border border-[#262626] bg-[#141414] p-3"
                >
                  <span className="font-medium">
                    {emoji} {sport.name}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Availability */}
      {profile.availability.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#a3a3a3]">
            Usually Available
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile.availability.map((day) => (
              <span
                key={day}
                className="rounded-full bg-[#10b981]/20 px-3 py-1 text-sm text-[#10b981]"
              >
                {day}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Game History */}
      {gameHistory.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#a3a3a3]">
            Recent Games
          </h2>
          <div className="space-y-2">
            {gameHistory.map((game) => {
              const emoji = SPORT_EMOJI[game.sport] || "🎯";
              return (
                <Link
                  key={game.gameId}
                  href={`/g/${game.inviteCode}/game/${game.gameId}`}
                  className="flex items-center gap-3 rounded-xl border border-[#262626] bg-[#141414] p-3 transition hover:border-[#10b981]"
                >
                  <span className="text-lg">{emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{game.groupName}</p>
                    <p className="text-xs text-[#a3a3a3]">
                      {formatDate(game.date)} at {formatTime(game.time)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-3">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-[#a3a3a3]">{label}</p>
    </div>
  );
}
