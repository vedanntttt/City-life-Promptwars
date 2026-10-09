import type { Blackspot, LatLng, Report, RouteOption } from "./types";
import { routeRisk } from "./geo";

const OSRM = "https://router.project-osrm.org/route/v1/driving";

interface OsrmRoute {
  duration: number;
  distance: number;
  geometry: { coordinates: [number, number][] };
}

async function osrm(points: LatLng[], alternatives: boolean): Promise<OsrmRoute[]> {
  const path = points.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `${OSRM}/${path}?overview=full&geometries=geojson&alternatives=${alternatives ? 3 : "false"}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Routing failed (${res.status})`);
  const j = await res.json();
  if (j.code !== "Ok") throw new Error(j.message || "No route found");
  return j.routes;
}

/** Detour candidates: points offset sideways from the midpoint, to force a different road. */
function viaPoints(a: LatLng, b: LatLng): LatLng[] {
  const mid: LatLng = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const dLat = b[0] - a[0], dLng = b[1] - a[1];
  const len = Math.hypot(dLat, dLng) || 1;
  const off = Math.min(0.03, len * 0.35); // ~up to 3 km
  const nLat = -dLng / len, nLng = dLat / len;
  return [
    [mid[0] + nLat * off, mid[1] + nLng * off],
    [mid[0] - nLat * off, mid[1] - nLng * off],
  ];
}

export async function getRoutes(
  from: LatLng,
  to: LatLng,
  blackspots: Blackspot[],
  reports: Report[],
): Promise<RouteOption[]> {
  let routes = await osrm([from, to], true);

  // OSRM often returns a single route in a city; add detours so there's something to compare.
  if (routes.length < 3) {
    const extra = await Promise.allSettled(viaPoints(from, to).map((v) => osrm([from, v, to], false)));
    for (const r of extra) if (r.status === "fulfilled") routes = routes.concat(r.value);
  }

  const options = routes.map((r) => {
    const coords = r.geometry.coordinates.map(([lng, lat]) => [lat, lng] as LatLng);
    return {
      coords,
      durationMin: Math.round(r.duration / 60),
      distanceKm: Math.round(r.distance / 100) / 10,
      ...routeRisk(coords, blackspots, reports),
    };
  });

  // Drop near-duplicates and absurd detours (>60% slower than the fastest).
  const fastest = Math.min(...options.map((o) => o.durationMin));
  const unique: RouteOption[] = [];
  for (const o of options.sort((x, y) => x.durationMin - y.durationMin)) {
    if (o.durationMin > fastest * 1.6) continue;
    if (unique.some((u) => Math.abs(u.distanceKm - o.distanceKm) < 0.3 && u.risk === o.risk)) continue;
    unique.push(o);
  }
  return unique;
}
