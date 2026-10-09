import { NextResponse } from "next/server";
import seed from "@/data/reports.json";
import places from "@/data/places.json";
import blackspots from "@/data/blackspots.json";
import areas from "@/data/areas.json";
import { classifyReport } from "@/lib/classify";
import { markVerified } from "@/lib/geo";
import type { Report } from "@/lib/types";

// In-memory store (survives dev hot-reloads via globalThis). Fine for a demo; swap for a DB later.
const g = globalThis as unknown as { __reports?: Report[] };
if (!g.__reports) {
  g.__reports = seed.map(({ minutesAgo, ...r }) => ({
    ...r,
    severity: r.severity as Report["severity"],
    createdAt: Date.now() - minutesAgo * 60_000,
  }));
}
const store = () => g.__reports!;

const LANDMARKS = [...blackspots, ...places, ...areas].map((x) => ({
  name: x.name.toLowerCase(),
  lat: x.lat,
  lng: x.lng,
}));

/** Match a free-text location hint ("katraj chowk") to the best known landmark. */
function geocodeHint(hint: string): { lat: number; lng: number } | null {
  const words = hint.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && w !== "near");
  if (!words.length) return null;
  let best: (typeof LANDMARKS)[number] | null = null;
  let bestScore = 0;
  for (const l of LANDMARKS) {
    const score = words.filter((w) => l.name.includes(w)).length;
    if (score > bestScore) [best, bestScore] = [l, score];
  }
  return best;
}

/** Fallback: OpenStreetMap's free geocoder, restricted to the Pune area. */
async function nominatim(hint: string): Promise<{ lat: number; lng: number } | null> {
  if (!hint.trim()) return null;
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&bounded=1" +
      "&viewbox=73.70,18.68,74.05,18.40&q=" + encodeURIComponent(`${hint}, Pune`);
    const res = await fetch(url, { headers: { "User-Agent": "PuneSathi-hackathon/0.1" } });
    const [hit] = await res.json();
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  } catch {
    return null;
  }
}

export async function GET() {
  return NextResponse.json(markVerified(store()));
}

export async function POST(req: Request) {
  const body = (await req.json()) as { text?: string; lat?: number; lng?: number };
  const text = body.text?.trim();
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  const c = await classifyReport(text);
  const fromHint = geocodeHint(c.location_hint) ?? (await nominatim(c.location_hint));
  const pos =
    body.lat != null && body.lng != null ? { lat: body.lat, lng: body.lng } : fromHint;
  if (!pos) {
    return NextResponse.json(
      { error: "Couldn't work out where this is. Mention a landmark or tap the map to pick a spot." },
      { status: 422 },
    );
  }

  const report: Report = {
    id: `r${Date.now()}`,
    text,
    category: c.category,
    severity: c.severity,
    summary: c.summary,
    lat: pos.lat,
    lng: pos.lng,
    createdAt: Date.now(),
  };
  store().push(report);
  const all = markVerified(store());
  return NextResponse.json({
    report: all.find((r) => r.id === report.id),
    classifiedBy: c.source,
    locatedBy: body.lat != null ? "map pin" : `"${c.location_hint}"`,
    reports: all,
  });
}
