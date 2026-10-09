// Server-side validation for citizen reports. Never trust the client: the API is public.

export const MIN_TEXT = 5;
export const MAX_TEXT = 500;
export const MAX_BODY_BYTES = 4_096;

// Generous box around Pune metro (incl. day-trip spots like Sinhagad and Lonavala).
export const PUNE_BOUNDS = { south: 18.2, north: 18.85, west: 73.3, east: 74.2 } as const;

export interface ReportInput {
  text: string;
  lat?: number;
  lng?: number;
}

export type Validation = { ok: true; value: ReportInput } | { ok: false; error: string };

/** Strip control characters (keeps newlines/tabs) and collapse runs of whitespace. */
export function sanitizeText(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();
}

export function inPune(lat: number, lng: number): boolean {
  const b = PUNE_BOUNDS;
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
}

export function validateReport(body: unknown): Validation {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "Invalid request body" };
  const { text, lat, lng } = body as Record<string, unknown>;

  if (typeof text !== "string") return { ok: false, error: "text is required" };
  const clean = sanitizeText(text);
  if (clean.length < MIN_TEXT) return { ok: false, error: `Please describe the issue in at least ${MIN_TEXT} characters` };
  if (clean.length > MAX_TEXT) return { ok: false, error: `Report is too long (max ${MAX_TEXT} characters)` };

  const hasLat = lat !== undefined && lat !== null;
  const hasLng = lng !== undefined && lng !== null;
  if (hasLat !== hasLng) return { ok: false, error: "lat and lng must be sent together" };
  if (!hasLat) return { ok: true, value: { text: clean } };

  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng))
    return { ok: false, error: "lat and lng must be numbers" };
  if (!inPune(lat, lng)) return { ok: false, error: "Location must be inside Pune" };
  return { ok: true, value: { text: clean, lat, lng } };
}
