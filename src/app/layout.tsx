import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "./components/bottom-nav";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gameon-coral.vercel.app";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  title: {
    default: "GameOn - Pickup Game Coordinator",
    template: "%s | GameOn",
  },
  description:
    "Organize pickup games with your crew. Players RSVP via WhatsApp or web. No app to download.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    siteName: "GameOn",
    title: "GameOn - Pickup Game Coordinator",
    description:
      "Organize pickup games with your crew. Players RSVP via WhatsApp or web. No app to download.",
    url: siteUrl,
    images: [
      {
        url: `${siteUrl}/api/og`,
        width: 1200,
        height: 630,
        alt: "GameOn - Pickup Game Coordinator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GameOn - Pickup Game Coordinator",
    description:
      "Organize pickup games with your crew. Players RSVP via WhatsApp or web. No app to download.",
    images: [`${siteUrl}/api/og`],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GameOn",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0a0a] text-[#fafafa] antialiased tap-highlight">
        <main className="mx-auto max-w-2xl px-4 py-4 pb-20 sm:py-6 sm:pb-6">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
