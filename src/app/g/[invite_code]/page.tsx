import type { Metadata } from "next";
import { connectDB } from "@/lib/mongodb";
import { Group, Game } from "@/lib/models";
import GroupClient from "./group-client";

type Props = {
  params: Promise<{ invite_code: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { invite_code } = await params;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://gameon-coral.vercel.app";

  try {
    await connectDB();
    const group = await Group.findOne({ inviteCode: invite_code }).lean();
    if (!group) return {};

    const upcomingCount = await Game.countDocuments({
      groupId: group._id,
      status: { $in: ["open", "confirmed"] },
    });

    const title = `${group.name} — ${group.sport}`;
    const description = `Join ${group.name} on GameOn! ${upcomingCount} upcoming game${upcomingCount !== 1 ? "s" : ""}. RSVP via web or WhatsApp.`;

    const ogParams = new URLSearchParams({
      title: group.name,
      subtitle: `${group.sport}${group.location ? ` • ${group.location}` : ""}`,
      sport: group.sport,
      stats: `${upcomingCount} upcoming game${upcomingCount !== 1 ? "s" : ""}`,
    });

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        images: [
          {
            url: `${siteUrl}/api/og?${ogParams.toString()}`,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [`${siteUrl}/api/og?${ogParams.toString()}`],
      },
    };
  } catch {
    return {};
  }
}

export default function GroupPage() {
  return <GroupClient />;
}
