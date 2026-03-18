"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SPORTS } from "@/lib/utils";

const SKILL_LEVELS = [
  { value: "beginner", label: "🌱 Beginner", desc: "Just starting out" },
  { value: "intermediate", label: "⚡ Intermediate", desc: "Play regularly" },
  { value: "advanced", label: "🔥 Advanced", desc: "Competitive level" },
  { value: "pro", label: "🏆 Pro", desc: "Elite / ex-pro" },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type SportPref = { name: string; skill: string };

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [sports, setSports] = useState<SportPref[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [addSport, setAddSport] = useState("");
  const [addSkill, setAddSkill] = useState("intermediate");

  // Load existing profile from localStorage name
  useEffect(() => {
    const savedName = localStorage.getItem("gameon_name");
    if (savedName) {
      setName(savedName);
      fetch(`/api/profile?name=${encodeURIComponent(savedName)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.profile) {
            setExistingId(data.profile._id);
            setBio(data.profile.bio || "");
            setLocation(data.profile.location || "");
            setSports(data.profile.sports || []);
            setAvailability(data.profile.availability || []);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleAddSport = () => {
    if (!addSport) return;
    if (sports.some((s) => s.name === addSport)) return;
    setSports([...sports, { name: addSport, skill: addSkill }]);
    setAddSport("");
    setAddSkill("intermediate");
  };

  const removeSport = (sportName: string) => {
    setSports(sports.filter((s) => s.name !== sportName));
  };

  const updateSkill = (sportName: string, skill: string) => {
    setSports(sports.map((s) => (s.name === sportName ? { ...s, skill } : s)));
  };

  const toggleDay = (day: string) => {
    setAvailability((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Name is required");
      return;
    }
    setSaving(true);
    localStorage.setItem("gameon_name", name.trim());

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), bio, location, sports, availability }),
      });
      const data = await res.json();
      if (data.profile) {
        setExistingId(data.profile._id);
        router.push(`/profile/${data.profile._id}`);
      }
    } catch {
      alert("Error saving profile");
    }
    setSaving(false);
  };

  if (loading) return <p className="py-8 text-center text-[#a3a3a3]">Loading...</p>;

  const availableSports = SPORTS.filter((s) => !sports.some((sp) => sp.name === s));

  return (
    <div>
      <Link href="/" className="mb-4 inline-block text-sm text-[#a3a3a3] hover:text-white">
        ← Home
      </Link>

      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold">
          {existingId ? "✏️ Edit Profile" : "👤 Create Profile"}
        </h1>
        <p className="text-[#a3a3a3]">
          Set up your player profile so others can find and play with you.
        </p>
      </div>

      <div className="space-y-6">
        {/* Name */}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#a3a3a3]">
            Name <span className="text-[#10b981]">*</span>
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="input"
            required
          />
        </label>

        {/* Bio */}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#a3a3a3]">Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Love a good pickup game on weekends..."
            rows={3}
            maxLength={200}
            className="input resize-none"
          />
          <p className="mt-1 text-xs text-[#a3a3a3]">{bio.length}/200</p>
        </label>

        {/* Location */}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#a3a3a3]">Location</span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Perth, WA"
            className="input"
          />
        </label>

        {/* Sports & Skill Levels */}
        <div>
          <span className="mb-2 block text-sm font-medium text-[#a3a3a3]">Sports & Skill</span>

          {sports.length > 0 && (
            <div className="mb-3 space-y-2">
              {sports.map((sport) => (
                <div
                  key={sport.name}
                  className="flex items-center gap-3 rounded-xl border border-[#262626] bg-[#141414] p-3"
                >
                  <span className="flex-1 font-medium">{sport.name}</span>
                  <select
                    value={sport.skill}
                    onChange={(e) => updateSkill(sport.name, e.target.value)}
                    className="rounded-lg border border-[#262626] bg-[#1a1a1a] px-2 py-1 text-sm outline-none"
                  >
                    {SKILL_LEVELS.map((sl) => (
                      <option key={sl.value} value={sl.value}>
                        {sl.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeSport(sport.name)}
                    className="text-[#a3a3a3] hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {availableSports.length > 0 && (
            <div className="flex gap-2">
              <select
                value={addSport}
                onChange={(e) => setAddSport(e.target.value)}
                className="input flex-1"
              >
                <option value="">Add a sport...</option>
                {availableSports.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                value={addSkill}
                onChange={(e) => setAddSkill(e.target.value)}
                className="input w-auto"
              >
                {SKILL_LEVELS.map((sl) => (
                  <option key={sl.value} value={sl.value}>
                    {sl.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddSport}
                disabled={!addSport}
                className="shrink-0 rounded-xl bg-[#10b981] px-4 py-3 font-semibold text-white transition hover:bg-[#059669] disabled:opacity-30"
              >
                +
              </button>
            </div>
          )}
        </div>

        {/* Availability */}
        <div>
          <span className="mb-2 block text-sm font-medium text-[#a3a3a3]">Usually available on</span>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const active = availability.includes(day);
              return (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-[#10b981] text-white"
                      : "border border-[#262626] bg-[#141414] text-[#a3a3a3] hover:border-[#10b981] hover:text-white"
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="w-full rounded-xl bg-[#10b981] py-3 font-semibold text-white transition hover:bg-[#059669] disabled:opacity-50"
        >
          {saving ? "Saving..." : existingId ? "Save Changes" : "Create Profile"}
        </button>
      </div>
    </div>
  );
}
