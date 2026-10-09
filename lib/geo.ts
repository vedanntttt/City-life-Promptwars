import type { Area, Blackspot, LatLng, Report } from "./types";

const R = 6371000;
const toRad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Shortest distance (m) from point p to a polyline. Local flat projection is fine at city scale. */
export function distanceToPolyline(p: LatLng, line: LatLng[]): number {
  const kx = 111320 * Math.cos(toRad(p[0]));
  const ky = 110540;
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const ax = (line[i][1] - p[1]) * kx, ay = (line[i][0] - p[0]) * ky;
    const bx = (line[i + 1][1] - p[1]) * kx, by = (line[i + 1][0] - p[0]) * ky;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < best) best = d;
  }
  return best;
}

const HAZARD_RADIUS_M = 250;
const SEVERITY_WEIGHT = { low: 0.5, medium: 1, high: 2 } as const;

/** Risk points for a route: blackspots weigh by severity, verified citizen reports count extra. */
export function routeRisk(
  coords: LatLng[],
  blackspots: Blackspot[],
  reports: Report[],
): { risk: number; hazards: string[] } {
  let risk = 0;
  const hazards: string[] = [];
  for (const b of blackspots) {
    if (distanceToPolyline([b.lat, b.lng], coords) < HAZARD_RADIUS_M) {
      risk += b.severity * 2;
      hazards.push(`Accident zone: ${b.name}`);
    }
  }
  for (const r of reports) {
    if (distanceToPolyline([r.lat, r.lng], coords) < HAZARD_RADIUS_M) {
      risk += SEVERITY_WEIGHT[r.severity] * (r.verified ? 2 : 0.5);
      hazards.push(`${r.verified ? "Verified report" : "Report"}: ${r.summary}`);
    }
  }
  return { risk: Math.round(risk * 10) / 10, hazards };
}

export const VERIFY_RADIUS_M = 300;
export const VERIFY_WINDOW_MS = 24 * 60 * 60 * 1000;
export const VERIFY_MIN_REPORTS = 3;

/** A report is "verified" when ≥3 independent reports fall within 300 m in the last 24 h. */
export function markVerified(reports: Report[]): Report[] {
  const now = Date.now();
  const recent = reports.filter((r) => now - r.createdAt < VERIFY_WINDOW_MS);
  return reports.map((r) => {
    const nearby = recent.filter(
      (o) => haversine([r.lat, r.lng], [o.lat, o.lng]) <= VERIFY_RADIUS_M,
    ).length;
    return { ...r, nearbyCount: nearby, verified: nearby >= VERIFY_MIN_REPORTS };
  });
}

export function overallScore(a: Area): number {
  const s =
    a.safety * 0.3 + a.cleanliness * 0.2 + a.affordability * 0.15 + a.rating * 0.2 + a.accessibility * 0.15;
  return Math.round(s * 10) / 10;
}

/** Areas with live safety adjusted down by verified citizen reports within 1.5 km. */
export function scoredAreas(areas: Area[], reports: Report[]) {
  return areas
    .map((a) => {
      const near = reports.filter((r) => haversine([a.lat, a.lng], [r.lat, r.lng]) < 1500);
      const verified = near.filter((r) => r.verified).length;
      const safety = Math.max(0, a.safety - verified * 0.5);
      const adjusted = { ...a, safety };
      return { ...adjusted, score: overallScore(adjusted), openReports: near.length };
    })
    .sort((x, y) => y.score - x.score);
}
