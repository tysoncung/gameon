import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Profile } from "@/lib/models";

// GET /api/profile?id=xxx or ?name=xxx
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const name = searchParams.get("name");

    let profile;
    if (id) {
      profile = await Profile.findById(id).lean();
    } else if (name) {
      profile = await Profile.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } }).lean();
    } else {
      return NextResponse.json({ error: "id or name required" }, { status: 400 });
    }

    if (!profile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (err) {
    console.error("GET profile error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST /api/profile - create or update profile
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, phone, bio, location, sports, availability } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Validate sports
    if (sports && !Array.isArray(sports)) {
      return NextResponse.json({ error: "Sports must be an array" }, { status: 400 });
    }

    const validSkills = ["beginner", "intermediate", "advanced", "pro"];
    const cleanSports = (sports || []).filter(
      (s: { name: string; skill: string }) =>
        s.name?.trim() && validSkills.includes(s.skill)
    ).map((s: { name: string; skill: string }) => ({
      name: s.name.trim(),
      skill: s.skill,
    }));

    const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const cleanAvailability = (availability || []).filter((d: string) => validDays.includes(d));

    // Try to find existing profile by name (case-insensitive)
    let profile = await Profile.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, "i") } });

    if (profile) {
      // Update existing
      profile.bio = bio?.trim() || profile.bio;
      profile.location = location?.trim() || profile.location;
      profile.sports = cleanSports.length > 0 ? cleanSports : profile.sports;
      profile.availability = cleanAvailability.length > 0 ? cleanAvailability : profile.availability;
      if (phone?.trim()) profile.phone = phone.trim();
      profile.updatedAt = new Date();
      await profile.save();
    } else {
      // Create new
      profile = await Profile.create({
        name: name.trim(),
        phone: phone?.trim() || null,
        bio: bio?.trim() || "",
        location: location?.trim() || "",
        sports: cleanSports,
        availability: cleanAvailability,
      });
    }

    return NextResponse.json({ profile, isNew: !profile.updatedAt });
  } catch (err) {
    console.error("POST profile error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
