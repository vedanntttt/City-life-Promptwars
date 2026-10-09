import places from "@/data/places.json";
import blackspots from "@/data/blackspots.json";
import areas from "@/data/areas.json";

const LANDMARKS = [...blackspots, ...places, ...areas].map((x) => ({
  name: x.name.toLowerCase(),
  lat: x.lat,
  lng: x.lng,
}));

/** Match a free-text location hint ("katraj chowk") to the best known landmark. */
export function geocodeHint(hint: string): { lat: number; lng: number } | null {
  const words = hint.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && w !== "near");
  if (!words.length) return null;
  let best: (typeof LANDMARKS)[number] | null = null;
  let bestScore = 0;
  for (const l of LANDMARKS) {
    const score = words.filter((w) => l.name.includes(w)).length;
    if (score > bestScore) [best, bestScore] = [l, score];
  }
  return best && { lat: best.lat, lng: best.lng };
}

/** Fallback: OpenStreetMap's free geocoder, restricted to the Pune area. */
export async function nominatim(hint: string): Promise<{ lat: number; lng: number } | null> {
  if (!hint.trim()) return null;
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&bounded=1" +
      "&viewbox=73.70,18.68,74.05,18.40&q=" + encodeURIComponent(`${hint.slice(0, 100)}, Pune`);
    const res = await fetch(url, {
      headers: { "User-Agent": "PuneSathi-hackathon/0.1" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const [hit] = await res.json();
    const lat = Number(hit?.lat), lng = Number(hit?.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}
