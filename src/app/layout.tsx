import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GameOn - Pickup Game Coordinator",
  description: "Organize pickup games with your crew. No more group chat chaos.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0a0a] text-[#fafafa] antialiased">
        <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
