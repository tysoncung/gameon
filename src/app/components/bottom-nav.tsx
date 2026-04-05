"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "⚽" },
  { href: "/explore", label: "Explore", icon: "🔍" },
  { href: "/for-you", label: "For You", icon: "🤖" },
  { href: "/activity", label: "Activity", icon: "📡" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#262626] bg-[#0a0a0a]/95 backdrop-blur-md sm:hidden pb-safe">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2.5 text-xs transition ${
                isActive
                  ? "text-[#10b981]"
                  : "text-[#a3a3a3] active:text-white"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
