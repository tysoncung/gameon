import type { Metadata } from "next";
import { connectDB } from "@/lib/mongodb";
import { Game, Group, Rsvp } from "@/lib/models";
import { formatDate, formatTime } from "@/lib/utils";
import GameClient from "./game-client";

type Props = {
  params: Promise<{ invite_code: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://gameon-coral.vercel.app";

  try {
    await connectDB();
    const game = await Game.findById(id).lean();
    if (!game) return {};

    const group = await Group.findById(game.groupId).lean();
    if (!group) return {};

    const rsvps = await Rsvp.find({ gameId: id, status: "in" }).lean();
    const totalIn = rsvps.reduce(
      (sum, r) => sum + 1 + ((r as { guests?: number }).guests || 0),
      0
    );

    const title = `${group.name} — ${formatDate(game.date)} at ${formatTime(game.time)}`;
    const description = `${totalIn}/${game.capacity} players confirmed${game.location ? ` at ${game.location}` : ""}. RSVP now!`;

    const ogParams = new URLSearchParams({
      title: group.name,
      subtitle: `${formatDate(game.date)} at ${formatTime(game.time)}`,
      sport: group.sport,
      stats: `${totalIn}/${game.capacity} confirmed`,
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

export default function GamePage() {
  return <GameClient />;
}
