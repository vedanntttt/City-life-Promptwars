import { redis } from "./reportStore";

// Fixed-window limiter per client IP. Uses Redis when configured (shared across serverless
// instances), otherwise an in-memory map (fine for local dev / a single instance).
export const RATE_LIMIT = 5;
export const RATE_WINDOW_S = 60;

const g = globalThis as unknown as { __hits?: Map<string, { count: number; reset: number }> };
const hits = () => (g.__hits ??= new Map());

export function memoryLimit(key: string, limit = RATE_LIMIT, windowS = RATE_WINDOW_S, now = Date.now()): boolean {
  const m = hits();
  const entry = m.get(key);
  if (!entry || entry.reset <= now) {
    m.set(key, { count: 1, reset: now + windowS * 1000 });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

/** Returns true if the request is allowed. */
export async function allowRequest(ip: string): Promise<boolean> {
  const key = `punesathi:rl:${ip}`;
  if (!redis) return memoryLimit(key);
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, RATE_WINDOW_S);
    return count <= RATE_LIMIT;
  } catch {
    return memoryLimit(key);
  }
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
