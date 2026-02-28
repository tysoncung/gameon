"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type PlayerStat = {
  name: string;
  totalGames: number;
  inCount: number;
  outCount: number;
  maybeCount: number;
  attendanceRate: number;
};

export default function StatsPage() {
  const params = useParams();
  const inviteCode = params.invite_code as string;
  const [groupName, setGroupName] = useState("");
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/stats/${inviteCode}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.group) {
          setGroupName(data.group.name);
          setStats(data.stats || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [inviteCode]);

  if (loading) return <p className="py-8 text-center text-[#a3a3a3]">Loading...</p>;
  if (!groupName) return <p className="py-8 text-center text-[#a3a3a3]">Group not found</p>;

  return (
    <div>
      <Link
        href={`/g/${inviteCode}`}
        className="mb-4 inline-block text-sm text-[#a3a3a3] hover:text-white"
      >
        &larr; {groupName}
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
                      {player.inCount} in / {player.outCount} out / {player.maybeCount} maybe
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#10b981]">{player.attendanceRate}%</p>
                  <p className="text-xs text-[#a3a3a3]">attendance</p>
                </div>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#262626]">
                <div
                  className="h-full rounded-full bg-[#10b981]"
                  style={{ width: `${player.attendanceRate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
