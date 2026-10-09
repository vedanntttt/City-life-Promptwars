# PuneSathi: Smart City Explorer

Explore Pune smarter, safer and on budget. Built for the PromptWars "City Life" problem statement.

| Feature | What it does |
|---|---|
| **Explore** | Map of 57 curated places (food, stays, attractions, heritage) with area and budget filters, plus local traditions |
| **Safe Route** | Compares OSRM routes against accident blackspots and live citizen reports, then highlights the **fastest** and **safest** |
| **Report** | Citizens report issues by text or voice. An LLM (Groq) classifies category and severity and locates the landmark. 3+ reports within 300 m in 24 h are marked **VERIFIED** |
| **Best/Worst** | Areas ranked by a weighted score. Safety drops live as verified reports come in |
| **Weather** | Live Open-Meteo alerts for rain, heat, storms and wind |

## Stack
Next.js 14 (App Router) · TypeScript · Tailwind · react-leaflet (CARTO/OSM tiles) · Groq LLM · Upstash Redis · Vitest

## Run locally
```bash
cp .env.example .env.local   # add GROQ_API_KEY (optional: keyword fallback works without it)
npm install
npm run dev                  # http://localhost:3000
npm test                     # unit + API tests
```

## Security
- All report input is validated server-side (`lib/validate.ts`): type checks, length limits, control-character stripping, and coordinates restricted to Pune.
- Per-IP rate limiting on report submission (`lib/rateLimit.ts`), backed by Redis in production.
- JSON-only, body-size-capped API with generic error messages (no stack traces leak).
- LLM prompt-injection hardening: user text is delimited and treated as data, and model output is whitelisted and length-capped (`parseClassification`).
- Strict security headers (`next.config.mjs`): CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy.
- Secrets live only in env vars (`.env.example` documents them, `.env*.local` is git-ignored).

## Accessibility
- WAI-ARIA tabs with arrow, Home and End key navigation, a skip link, and landmark regions.
- Every form control is labelled. Errors use `role="alert"` and status updates use `aria-live`.
- Map pins are keyboard-focusable and titled, with a text legend. Colour is never the only signal (FASTEST/SAFEST labels).
- WCAG AA text contrast, visible focus rings, 40px+ touch targets, and `prefers-reduced-motion` support.

## Testing
`npm test` runs 60 Vitest tests covering geo maths, route risk, report verification, area scoring, the classifier (including untrusted LLM output), input validation, rate limiting, and the `/api/reports` handlers.

## Data
Place coordinates come from OpenStreetMap. Ratings, blackspots, area scores and seed reports are sample data for the demo.
