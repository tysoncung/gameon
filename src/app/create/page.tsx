"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateInviteCode, hashPin, SPORTS } from "@/lib/utils";
import Link from "next/link";

export default function CreateGroup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sport: "Soccer",
    default_capacity: 10,
    location: "",
    organizer: "",
    pin: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.pin || form.pin.length < 4) return;

    setLoading(true);
    const invite_code = generateInviteCode();

    const { error } = await supabase.from("groups").insert({
      name: form.name,
      sport: form.sport,
      default_capacity: form.default_capacity,
      location: form.location,
      created_by: form.organizer || "Organizer",
      invite_code,
      pin_hash: hashPin(form.pin),
    });

    if (error) {
      alert("Error creating group: " + error.message);
      setLoading(false);
      return;
    }

    router.push(`/g/${invite_code}`);
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
            value={form.default_capacity}
            onChange={(e) => setForm({ ...form, default_capacity: parseInt(e.target.value) || 10 })}
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

        <Field label="Your Name">
          <input
            type="text"
            placeholder="John"
            value={form.organizer}
            onChange={(e) => setForm({ ...form, organizer: e.target.value })}
            className="input"
          />
        </Field>

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
