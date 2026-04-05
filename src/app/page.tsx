import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
      <div className="mb-2 text-5xl">⚽</div>
      <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-5xl">
        Game<span className="text-[#10b981]">On</span>
      </h1>
      <p className="mb-8 max-w-md text-base text-[#a3a3a3] sm:text-lg">
        Find pickup games near you or organize your own. No sign-up needed —
        just discover, RSVP, and play.
      </p>

      <div className="flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
        <Link
          href="/for-you"
          className="rounded-xl bg-[#10b981] px-8 py-4 text-center text-lg font-semibold text-white transition hover:bg-[#059669] active:scale-[0.98]"
        >
          🤖 For You
        </Link>
        <Link
          href="/explore"
          className="rounded-xl border border-[#262626] bg-[#141414] px-8 py-4 text-center text-lg font-semibold transition hover:border-[#10b981] active:scale-[0.98]"
        >
          🔍 Explore
        </Link>
        <Link
          href="/create"
          className="rounded-xl border border-[#262626] bg-[#141414] px-8 py-4 text-center text-lg font-semibold transition hover:border-[#10b981] active:scale-[0.98]"
        >
          Create a Group
        </Link>
      </div>

      <div className="mt-12 grid w-full max-w-lg gap-4 text-left sm:mt-16 sm:grid-cols-3 sm:gap-6">
        <Feature title="Smart Matching" desc="Get personalized game recommendations based on your sports, skill level, and schedule." />
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
