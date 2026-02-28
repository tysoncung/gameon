"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type GroupData = {
  name: string;
  location: string;
  defaultCapacity: number;
};

export default function NewGame() {
  const params = useParams();
  const router = useRouter();
  const inviteCode = params.invite_code as string;
  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState("");
  const [form, setForm] = useState({
    date: "",
    time: "10:00",
    location: "",
    capacity: 10,
    recurring: false,
  });

  useEffect(() => {
    fetch(`/api/groups/${inviteCode}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.group) {
          setGroup(data.group);
          setForm((f) => ({
            ...f,
            location: data.group.location || "",
            capacity: data.group.defaultCapacity || 10,
          }));
        }
      });
  }, [inviteCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !pin) return;

    setLoading(true);

    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inviteCode,
        pin,
        ...form,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert("Error: " + data.error);
      setLoading(false);
      return;
    }

    router.push(`/g/${inviteCode}`);
  };

  if (!group) return <p className="py-8 text-center text-[#a3a3a3]">Loading...</p>;

  return (
    <div>
      <Link
        href={`/g/${inviteCode}`}
        className="mb-6 inline-block text-sm text-[#a3a3a3] hover:text-white"
      >
        &larr; Back to {group.name}
      </Link>
      <h1 className="mb-6 text-2xl font-bold">Schedule a Game</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#a3a3a3]">
            Date <span className="text-[#10b981]">*</span>
          </span>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="input"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#a3a3a3]">Time</span>
          <input
            type="time"
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
            className="input"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#a3a3a3]">Location</span>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="input"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#a3a3a3]">Capacity</span>
          <input
            type="number"
            min={2}
            max={100}
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 10 })}
            className="input"
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.recurring}
            onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
          />
          <span className="text-sm text-[#a3a3a3]">Recurring game</span>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#a3a3a3]">
            Admin PIN <span className="text-[#10b981]">*</span>
          </span>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="input"
            placeholder="Enter your admin PIN"
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#10b981] py-3 font-semibold text-white transition hover:bg-[#059669] disabled:opacity-50"
        >
          {loading ? "Creating..." : "Schedule Game"}
        </button>
      </form>
    </div>
  );
}
