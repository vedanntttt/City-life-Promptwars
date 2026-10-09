# PuneSathi: handoff notes

Hackathon: "City Life" problem statement (`../PROBLEM STATEMENT.txt`), 7 hours, solo. Strategy: **minimal features first, then polish**.
Plan: `C:\Users\Vedant\.claude\plans\check-the-problem-statement-humming-sedgewick.md`

## Status (2026-10-09)
**MVP is done and tested.** All 5 pillars work end to end. Lint and production build are clean.
**Polish pass 1 done** (typecheck and lint clean, page renders; **not yet checked visually**, because the browser extension wasn't connected):
- Geist font applied; orange accent (logo tile, active tab underline, focus rings); `themeColor` viewport meta.
- Tabs show the icon above the label on phones and side by side from `sm` up.
- Loading states: map, weather skeleton, route skeleton cards and spinner, report submit spinner, "Loading reports…" in the feed.
- Empty states: Explore (with "Reset filters"), Safe Route hint before a search, empty report feed. Errors show in red boxes; route errors have "Try again".
- Map legend overlay at bottom left (place/report colours, or route colours on the Safe Route tab).
- Route "⇅ Swap" button. Ctrl+Enter submits a report. "Listening…" hint for voice. Fixed the "0 min longer" banner wording.
**Polish pass 2 done:** emojis replaced with `lucide-react` icons everywhere, including the map pins (rendered to SVG strings in `MapView.tsx`). The logo is now a Shaniwar Wada gate with a Bhagwa flag (`components/Logo.tsx`, plus `app/icon.svg` as the favicon; keep the two in sync). The route pickers group options into Areas and Places. Checked at 1440 px and 375 px.
**Next:** check visually at desktop and 375 px width (the legend may wrap over the map on small phones), then deploy. New features only if time is left; the optional one is a Groq "Tell me the story" button on heritage pins.

## Deployment plan (store done; deploy not yet done)
- **Vercel only**, with no separate backend: `app/api/reports` deploys as a serverless function.
- **Problem:** the in-memory report store is unreliable on serverless (it resets and isn't shared between instances).
- **Decision: use Upstash Redis** through the Vercel Marketplace, not Supabase (too much setup for the time; we don't need file storage, auth or live updates).
  - **Done:** `lib/reportStore.ts` keeps submitted reports in the Redis list `punesathi:reports` (capped at 500); seed reports stay in code. It reads `KV_REST_API_URL/TOKEN` or `UPSTASH_REDIS_REST_URL/TOKEN`, and falls back to memory when neither is set. The reports route is `force-dynamic` so Vercel never caches the GET.
  - The user clicks "Add Upstash" in the Vercel project, which injects the env vars.
- Deploy steps: push to GitHub → import in Vercel → add `GROQ_API_KEY` in Vercel env vars → deploy.
- Pitch line: "the production version would move to Supabase/PostGIS for geo-queries and photo storage."

## Suggested order for the next chat
1. ~~Polish: UI, mobile layout, loading and empty states.~~ Done, except the visual check.
2. ~~Upstash Redis store.~~ Done (code side); add Upstash in Vercel.
3. Deploy to Vercel (about 10 min).
4. Rehearse the demo and record a backup video.

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
- Submitted reports go to Upstash Redis when its env vars are set, otherwise to memory (reset when the server restarts). See `lib/reportStore.ts`.

## Gotchas learned
- Groq retired `llama-3.3-70b-versatile`; the default is now `openai/gpt-oss-120b` (`lib/classify.ts`). If there's no key or Groq fails, a keyword classifier takes over (the UI shows "Keyword fallback").
- The Overpass API needs `User-Agent` + `Accept` headers (it returns 406 otherwise).
- Don't run `next build` while `next dev` is running, because it corrupts `.next`. If that happens, delete `.next` and restart.
- Hindi/Marathi input: one Hinglish test worked. Don't promise it in the demo.

## Demo script (tested)
1. Explore: toggle layers, filter "₹ Budget", click Shaniwar Wada.
2. Safe Route: "Deccan & FC Road" (under Areas) → "Rajiv Gandhi Zoological Park". Fastest is about 14 min via Swargate Chowk (risk 4); safest is about 20 min with 0 hazards. Don't start at Swargate, because it's a blackspot.
3. Report (voice): "Big pothole and no streetlight near Katraj chowk" → Road / high → VERIFIED (2 seed reports nearby).
4. Best/Worst tab (Katraj's score drops) + weather banner.
