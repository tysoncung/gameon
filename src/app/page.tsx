import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
      <div className="mb-2 text-5xl">&#9917;</div>
      <h1 className="mb-3 text-4xl font-bold tracking-tight sm:text-5xl">
        Game<span className="text-[#10b981]">On</span>
      </h1>
      <p className="mb-8 max-w-md text-lg text-[#a3a3a3]">
        Find pickup games near you or organize your own. No sign-up needed —
        just discover, RSVP, and play.
      </p>

      <div className="flex flex-wrap justify-center gap-4">
        <Link
          href="/explore"
          className="rounded-xl bg-[#10b981] px-8 py-4 text-lg font-semibold text-white transition hover:bg-[#059669]"
        >
          🔍 Find a Game
        </Link>
        <Link
          href="/create"
          className="rounded-xl border border-[#262626] bg-[#141414] px-8 py-4 text-lg font-semibold transition hover:border-[#10b981]"
        >
          Create a Group
        </Link>
        <Link
          href="/profile"
          className="rounded-xl border border-[#262626] bg-[#141414] px-8 py-4 text-lg font-semibold transition hover:border-[#10b981]"
        >
          👤 My Profile
        </Link>
      </div>

      <div className="mt-16 grid w-full max-w-lg gap-6 text-left sm:grid-cols-3">
        <Feature title="Discover Games" desc="Browse pickup games nearby. Filter by sport, join in seconds." />
        <Feature title="No Sign Up" desc="Players just tap a link and RSVP. Zero friction." />
        <Feature title="Auto Waitlist" desc="Game full? Get on the waitlist. Auto-promoted when spots open." />
      </div>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-[#262626] bg-[#141414] p-4">
      <h3 className="mb-1 font-semibold text-[#10b981]">{title}</h3>
      <p className="text-sm text-[#a3a3a3]">{desc}</p>
    </div>
  );
}
