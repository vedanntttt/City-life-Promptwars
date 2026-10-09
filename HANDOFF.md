# PuneSathi: handoff notes

Hackathon: "City Life" problem statement (`../PROBLEM STATEMENT.txt`), 7 hours, solo. Strategy: **minimal features first, then polish**.
Plan: `C:\Users\Vedant\.claude\plans\check-the-problem-statement-humming-sedgewick.md`

## Status (2026-10-09)
**MVP is done and tested.** All 5 pillars work end to end. Lint and production build are clean.
**Next phase:** polish (UI, mobile layout, loading states). New features only if time is left; the optional one is a Groq "Tell me the story" button on heritage pins.

## Run
```
cd punesathi
npm run dev        # http://localhost:3000  (use Chrome/Edge for the voice button)
```
`.env.local` holds `GROQ_API_KEY=...` (git-ignored). Optional: `GROQ_MODEL=` to override the model.

## Features
| Tab | What | Where |
|---|---|---|
| Explore | OSM map with Food/Stays/Attractions/Heritage layers; filters by area and budget; place popup with "Safe route here"; Local traditions card | `components/Panels.tsx` (ExplorePanel), `components/MapView.tsx` |
| Safe Route | OSRM routes plus detour via-points; risk = blackspots within 250 m (by severity) + reports (verified ones count 4×); shows FASTEST/SAFEST | `lib/routing.ts`, `lib/geo.ts` (routeRisk) |
| Report | Text or voice (browser Web Speech API) → Groq classifies (category/severity/summary/location_hint) → geocoded from the landmark list, falling back to Nominatim limited to Pune → pin; ≥3 reports within 300 m in 24 h = VERIFIED | `app/api/reports/route.ts`, `lib/classify.ts`, `lib/geo.ts` (markVerified) |
| Best/Worst | 10 areas, weighted score; safety drops by 0.5 per verified report within 1.5 km | `lib/geo.ts` (scoredAreas), AreasPanel |
| Weather | Live Open-Meteo banner with rain/heat/storm/wind alerts | `components/WeatherBanner.tsx` |

Main page and state: `app/page.tsx`. Leaflet is loaded with `dynamic(..., { ssr: false })`, so never import `MapView` from server code or the panels (shared helpers live in `lib/format.ts`).

## Data (`data/`)
- `places.json`: 57 curated places with **real OSM coordinates** (pulled by `scripts/fetch-osm.mjs` into `osm_raw.json`). Rating, price and description are our own sample values.
- `blackspots.json` (9), `areas.json` (10), `reports.json` (5 seed reports, `minutesAgo`). All are sample data; say so in the pitch.
- Reports are stored **in memory** (`globalThis.__reports`) and reset when the server restarts.

## Gotchas learned
- Groq retired `llama-3.3-70b-versatile`; the default is now `openai/gpt-oss-120b` (`lib/classify.ts`). If there's no key or Groq fails, a keyword classifier takes over (the UI shows "Keyword fallback").
- The Overpass API needs `User-Agent` + `Accept` headers (it returns 406 otherwise).
- Don't run `next build` while `next dev` is running, because it corrupts `.next`. If that happens, delete `.next` and restart.
- Hindi/Marathi input: one Hinglish test worked. Don't promise it in the demo.

## Demo script (tested)
1. Explore: toggle layers, filter "₹ Budget", click Shaniwar Wada.
2. Safe Route: "📍 Deccan & FC Road" → "Rajiv Gandhi Zoological Park". Fastest is about 14 min via Swargate Chowk (risk 4); safest is about 20 min with 0 hazards. Don't start at Swargate, because it's a blackspot.
3. Report (voice): "Big pothole and no streetlight near Katraj chowk" → Road / high → VERIFIED (2 seed reports nearby).
4. Best/Worst tab (Katraj's score drops) + weather banner.
