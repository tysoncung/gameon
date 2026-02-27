"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, type Group } from "@/lib/supabase";
import { hashPin } from "@/lib/utils";

export default function NewGame() {
  const params = useParams();
  const router = useRouter();
  const inviteCode = params.invite_code as string;
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState("");
  const [form, setForm] = useState({
    date: "",
    time: "10:00",
    location: "",
    capacity: 10,
    recurring: "",
  });

  useEffect(() => {
    supabase
      .from("groups")
      .select("*")
      .eq("invite_code", inviteCode)
      .single()
      .then(({ data }) => {
        if (data) {
          setGroup(data);
          setForm((f) => ({
            ...f,
            location: data.location,
            capacity: data.default_capacity,
          }));
        }
      });
  }, [inviteCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !form.date || !pin) return;

    if (hashPin(pin) !== group.pin_hash) {
      alert("Invalid PIN");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("games").insert({
      group_id: group.id,
      date: form.date,
      time: form.time,
      location: form.location,
      capacity: form.capacity,
      recurring: form.recurring || null,
    });

    if (error) {
      alert("Error: " + error.message);
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

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#a3a3a3]">Recurring</span>
          <select
            value={form.recurring}
            onChange={(e) => setForm({ ...form, recurring: e.target.value })}
            className="input"
          >
            <option value="">One-time</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
          </select>
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
