// Simple in-memory rate limiter for Edge Functions.
// Note: In-memory limits reset on cold starts and don't persist across instances.
// For production-grade limits, connect to a shared store (Redis, KV, or DB).

type Entry = { count: number; resetAt: number };
const STORE = new Map<string, Entry>();

export function checkRate(key: string, limit = 60, windowSec = 60) {
  const now = Math.floor(Date.now() / 1000);
  const entry = STORE.get(key);
  if (!entry || now > entry.resetAt) {
    STORE.set(key, { count: 1, resetAt: now + windowSec });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowSec };
  }
  if (entry.count < limit) {
    entry.count += 1;
    return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
  }
  return { allowed: false, remaining: 0, resetAt: entry.resetAt };
}

export function extractIp(req: Request) {
  const fwd = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
  if (fwd) return fwd.split(',')[0].trim();
  try {
    // Deno Deploy sets a built-in field; best-effort fallback
    // @ts-ignore
    return (req as any).conn?.remoteAddr?.hostname ?? 'unknown';
  } catch {
    return 'unknown';
  }
}
