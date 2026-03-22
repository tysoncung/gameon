import { NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return; // cleanup every 60s
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Max requests per window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  limit: 60,
  windowSeconds: 60,
};

/**
 * In-memory rate limiter keyed by IP.
 * Returns null if allowed, or a NextResponse 429 if limit exceeded.
 */
export function checkRateLimit(
  ip: string | null,
  config: RateLimitConfig = DEFAULT_CONFIG
): NextResponse | null {
  cleanup();

  const key = ip || "unknown";
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 });
    return null;
  }

  entry.count++;
  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
        },
      }
    );
  }

  return null;
}

/**
 * Higher-order wrapper for API route handlers.
 * Applies rate limiting before calling the handler.
 */
export function withRateLimit(
  handler: (req: Request, ctx: unknown) => Promise<NextResponse>,
  config?: RateLimitConfig
) {
  return async (req: Request, ctx: unknown) => {
    const ip =
      (req.headers as unknown as Record<string, string | undefined>)["x-forwarded-for"]?.split(",")[0]?.trim() ||
      (req.headers as unknown as Record<string, string | undefined>)["x-real-ip"] ||
      null;

    const blocked = checkRateLimit(ip, config);
    if (blocked) return blocked;

    return handler(req, ctx);
  };
}
