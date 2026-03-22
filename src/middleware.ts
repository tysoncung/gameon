import { NextRequest, NextResponse } from "next/server";

// In-memory rate limit store (per-instance, resets on cold start)
const store = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 60; // requests per window
const WINDOW_MS = 60_000; // 1 minute

let lastCleanup = Date.now();

export function middleware(req: NextRequest) {
  // Only rate-limit API routes
  if (!req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Skip rate limiting for cron endpoint (called by Vercel cron)
  if (req.nextUrl.pathname.startsWith("/api/cron/")) {
    return NextResponse.next();
  }

  const now = Date.now();

  // Periodic cleanup
  if (now - lastCleanup > 60_000) {
    lastCleanup = now;
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  entry.count++;

  if (entry.count > RATE_LIMIT) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(RATE_LIMIT),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT));
  response.headers.set("X-RateLimit-Remaining", String(RATE_LIMIT - entry.count));
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
