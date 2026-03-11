"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SPORTS } from "@/lib/utils";
import Link from "next/link";

export default function CreateGroup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sport: "Soccer",
    defaultCapacity: 10,
    location: "",
    pin: "",
    isPublic: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.pin || form.pin.length < 4) return;

    setLoading(true);

    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) {
      alert("Error creating group: " + data.error);
      setLoading(false);
      return;
    }

    router.push(`/g/${data.inviteCode}`);
  };

  return (
    <div>
      <Link href="/" className="mb-6 inline-block text-sm text-[#a3a3a3] hover:text-white">
        &larr; Back
      </Link>
      <h1 className="mb-6 text-2xl font-bold">Create a Group</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Group Name" required>
          <input
            type="text"
            placeholder="Sunday Soccer Crew"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
            required
          />
        </Field>

        <Field label="Sport">
          <select
            value={form.sport}
            onChange={(e) => setForm({ ...form, sport: e.target.value })}
            className="input"
          >
            {SPORTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>

        <Field label="Default Capacity">
          <input
            type="number"
            min={2}
            max={100}
            value={form.defaultCapacity}
            onChange={(e) => setForm({ ...form, defaultCapacity: parseInt(e.target.value) || 10 })}
            className="input"
          />
        </Field>

        <Field label="Default Location">
          <input
            type="text"
            placeholder="Central Park Field 3"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="input"
          />
        </Field>

        <label className="flex items-center gap-3 rounded-xl border border-[#262626] bg-[#141414] p-4">
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
            className="h-4 w-4 accent-[#10b981]"
          />
          <div>
            <span className="font-medium">Make group discoverable</span>
            <p className="text-xs text-[#a3a3a3]">
              Your games will appear on the Explore page so anyone can find and join them.
            </p>
          </div>
        </label>

        <Field label="Admin PIN (4+ digits)" required>
          <input
            type="password"
            placeholder="1234"
            minLength={4}
            value={form.pin}
            onChange={(e) => setForm({ ...form, pin: e.target.value })}
            className="input"
            required
          />
          <p className="mt-1 text-xs text-[#a3a3a3]">
            You will need this PIN to manage games and admin settings.
          </p>
        </Field>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#10b981] py-3 font-semibold text-white transition hover:bg-[#059669] disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Group"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[#a3a3a3]">
        {label} {required && <span className="text-[#10b981]">*</span>}
      </span>
      {children}
    </label>
  );
}
