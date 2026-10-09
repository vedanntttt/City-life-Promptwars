import { NextResponse } from "next/server";
import { classifyReport } from "@/lib/classify";
import { geocodeHint, nominatim } from "@/lib/geocode";
import { markVerified } from "@/lib/geo";
import { allowRequest, clientIp } from "@/lib/rateLimit";
import { addReport, listReports } from "@/lib/reportStore";
import { MAX_BODY_BYTES, inPune, validateReport } from "@/lib/validate";
import type { Report } from "@/lib/types";

// Reports change on every POST, so never serve a cached GET.
export const dynamic = "force-dynamic";

const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

export async function GET() {
  try {
    return NextResponse.json(markVerified(await listReports()));
  } catch (e) {
    console.error("Listing reports failed:", e);
    return error("Could not load reports", 500);
  }
}

export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return error("Expected JSON", 415);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return error("Request too large", 413);
  if (!(await allowRequest(clientIp(req)))) return error("Too many reports. Please wait a minute and try again.", 429);

  let body: unknown;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return error("Request too large", 413);
    body = JSON.parse(raw);
  } catch {
    return error("Invalid JSON", 400);
  }
  const v = validateReport(body);
  if (!v.ok) return error(v.error, 400);
  const { text, lat, lng } = v.value;

  try {
    const c = await classifyReport(text);
    let pos = lat != null && lng != null ? { lat, lng } : geocodeHint(c.location_hint) ?? (await nominatim(c.location_hint));
    if (pos && !inPune(pos.lat, pos.lng)) pos = null;
    if (!pos) return error("Couldn't work out where this is. Mention a landmark or tap the map to pick a spot.", 422);

    const report: Report = {
      id: `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      text,
      category: c.category,
      severity: c.severity,
      summary: c.summary,
      lat: pos.lat,
      lng: pos.lng,
      createdAt: Date.now(),
    };
    await addReport(report);
    const all = markVerified(await listReports());
    return NextResponse.json({
      report: all.find((r) => r.id === report.id),
      classifiedBy: c.source,
      locatedBy: lat != null ? "map pin" : `"${c.location_hint}"`,
      reports: all,
    });
  } catch (e) {
    console.error("Report submission failed:", e);
    return error("Something went wrong saving your report", 500);
  }
}
