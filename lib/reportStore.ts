import { Redis } from "@upstash/redis";
import seed from "@/data/reports.json";
import type { Report } from "@/lib/types";

// Seed reports live in code (timestamps relative to server start) so the demo always has
// recent data. Only citizen-submitted reports go to the store.
const SEED: Report[] = seed.map(({ minutesAgo, ...r }) => ({
  ...r,
  severity: r.severity as Report["severity"],
  createdAt: Date.now() - minutesAgo * 60_000,
}));

const KEY = "punesathi:reports";
const MAX_REPORTS = 500;

// Vercel's Upstash integration injects KV_REST_API_*; a direct Upstash setup uses UPSTASH_REDIS_REST_*.
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const redis = url && token ? new Redis({ url, token }) : null;

// Fallback when Upstash isn't configured (local dev). Survives hot-reloads via globalThis.
const g = globalThis as unknown as { __reports?: Report[] };
const memory = () => (g.__reports ??= []);

export async function listReports(): Promise<Report[]> {
  const submitted = redis ? await redis.lrange<Report>(KEY, 0, -1) : memory();
  return [...SEED, ...submitted];
}

export async function addReport(report: Report): Promise<void> {
  if (redis) {
    await redis.rpush(KEY, report);
    await redis.ltrim(KEY, -MAX_REPORTS, -1);
  } else {
    memory().push(report);
  }
}
