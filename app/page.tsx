"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import placesData from "@/data/places.json";
import blackspotsData from "@/data/blackspots.json";
import areasData from "@/data/areas.json";
import type { Area, Blackspot, Category, LatLng, Place, Report, RouteOption } from "@/lib/types";
import { scoredAreas } from "@/lib/geo";
import { getRoutes } from "@/lib/routing";
import { ChartColumn, Compass, Megaphone, ShieldCheck } from "lucide-react";
import WeatherBanner from "@/components/WeatherBanner";
import Logo from "@/components/Logo";
import {
  AreasPanel,
  ExplorePanel,
  ReportPanel,
  RoutePanel,
  type ExploreFilters,
  type Landmark,
  type PickTarget,
} from "@/components/Panels";
import type { MapFocus } from "@/components/MapView";

// Leaflet touches `window`, so the map must only render in the browser.
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center gap-2 bg-slate-100 text-sm text-slate-500">
      <span className="spinner" /> Loading map…
    </div>
  ),
});

const places = placesData as Place[];
const blackspots = blackspotsData as Blackspot[];
const areas = areasData as Area[];

const TABS = [
  { key: "explore", Icon: Compass, label: "Explore" },
  { key: "route", Icon: ShieldCheck, label: "Safe Route" },
  { key: "report", Icon: Megaphone, label: "Report" },
  { key: "areas", Icon: ChartColumn, label: "Best/Worst" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const byLabel = (a: Landmark, b: Landmark) => a.label.localeCompare(b.label);
const LANDMARKS: Landmark[] = [
  ...areas.map((a) => ({ label: a.name, pos: [a.lat, a.lng] as LatLng, group: "Areas" as const })).sort(byLabel),
  ...places.map((p) => ({ label: p.name, pos: [p.lat, p.lng] as LatLng, group: "Places" as const })).sort(byLabel),
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("explore");
  const [filters, setFilters] = useState<ExploreFilters>({
    cats: new Set<Category>(["food", "attraction", "heritage", "hotel"]),
    area: "",
    maxPrice: 3,
    showBlackspots: true,
    showReports: true,
  });
  const [selected, setSelected] = useState<Place | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  const [from, setFrom] = useState<Landmark | null>(null);
  const [to, setTo] = useState<Landmark | null>(null);
  const [picking, setPicking] = useState<PickTarget>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [reportPin, setReportPin] = useState<LatLng | null>(null);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then(setReports)
      .catch(() => {})
      .finally(() => setReportsLoading(false));
  }, []);

  const flyTo = (lat: number, lng: number, zoom = 15) => setFocus({ lat, lng, zoom, key: Date.now() });

  const filtered = useMemo(
    () =>
      places.filter(
        (p) =>
          filters.cats.has(p.category) &&
          (!filters.area || p.area === filters.area) &&
          p.price <= filters.maxPrice,
      ),
    [filters],
  );
  const counts = useMemo(() => {
    const c = { food: 0, hotel: 0, attraction: 0, heritage: 0 } as Record<Category, number>;
    for (const p of places)
      if ((!filters.area || p.area === filters.area) && p.price <= filters.maxPrice) c[p.category]++;
    return c;
  }, [filters]);
  const ranked = useMemo(() => scoredAreas(areas, reports), [reports]);

  const fastestIdx = routes.length ? routes.reduce((b, r, i) => (r.durationMin < routes[b].durationMin ? i : b), 0) : -1;
  const safestIdx = routes.length
    ? routes.reduce((b, r, i) => {
        const best = routes[b];
        return r.risk < best.risk || (r.risk === best.risk && r.durationMin < best.durationMin) ? i : b;
      }, 0)
    : -1;

  const findRoutes = async () => {
    if (!from || !to) return;
    setRouteLoading(true);
    setRouteError("");
    setRoutes([]);
    try {
      setRoutes(await getRoutes(from.pos, to.pos, blackspots, reports));
    } catch (e) {
      setRouteError(e instanceof Error ? e.message : "Routing failed");
    } finally {
      setRouteLoading(false);
    }
  };

  const onMapClick = (p: LatLng) => {
    const label = `Pinned (${p[0].toFixed(4)}, ${p[1].toFixed(4)})`;
    if (picking === "from") setFrom({ label, pos: p });
    else if (picking === "to") setTo({ label, pos: p });
    else if (picking === "report") setReportPin(p);
    else return;
    setPicking(null);
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setPicking(null);
  };

  // WAI-ARIA tabs pattern: arrow keys move between tabs, Home/End jump to the ends.
  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const n = TABS.length;
    const next =
      e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    switchTab(TABS[next].key);
    document.getElementById(`tab-${TABS[next].key}`)?.focus();
  };

  return (
    <div className="flex h-[100dvh] flex-col md:flex-row md:gap-3 md:p-3">
      <a
        href="#panel"
        className="sr-only-focusable fixed left-3 top-3 z-[2000] rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      >
        Skip to content
      </a>
      <aside
        aria-label="PuneSathi controls"
        className="order-2 flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--bg)] md:card md:order-1 md:w-[410px] md:flex-none md:bg-white"
      >
        <header className="flex items-center gap-3 px-4 pb-2 pt-3 md:pt-4">
          <Logo className="h-10 w-10 shrink-0 rounded-xl shadow-md shadow-orange-900/20" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight tracking-tight">
              Pune<span className="text-orange-600">Sathi</span>
            </h1>
            <p className="truncate text-xs text-slate-600">Explore Pune smarter, safer and on budget</p>
          </div>
        </header>
        <WeatherBanner />
        <div
          role="tablist"
          aria-label="Features"
          className="mx-3 mb-1 mt-2 grid grid-cols-4 gap-1 rounded-2xl bg-slate-100 p-1 text-xs"
        >
          {TABS.map((t, i) => (
            <button
              key={t.key}
              id={`tab-${t.key}`}
              role="tab"
              aria-selected={tab === t.key}
              aria-controls="panel"
              tabIndex={tab === t.key ? 0 : -1}
              onClick={() => switchTab(t.key)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 font-semibold transition-all sm:flex-row sm:gap-1.5 ${
                tab === t.key
                  ? "bg-white text-slate-900 shadow-md shadow-slate-900/10"
                  : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
              }`}
            >
              <t.Icon className={`h-4 w-4 ${tab === t.key ? "text-orange-600" : ""}`} strokeWidth={2.25} aria-hidden />
              <span className="whitespace-nowrap">{t.label}</span>
            </button>
          ))}
        </div>
        <main
          id="panel"
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          tabIndex={-1}
          className="min-h-0 flex-1 overflow-y-auto p-4 focus:outline-none"
        >
          <h2 className="sr-only">{TABS.find((t) => t.key === tab)?.label}</h2>
          {tab === "explore" && (
            <ExplorePanel
              f={filters}
              setF={setFilters}
              areaNames={[...areas.map((a) => a.name), "Day trip"]}
              results={filtered}
              counts={counts}
              onPick={(p) => {
                setSelected(p);
                flyTo(p.lat, p.lng, 16);
              }}
              onReset={() =>
                setFilters({ ...filters, cats: new Set<Category>(["food", "attraction", "heritage", "hotel"]), area: "", maxPrice: 3 })
              }
            />
          )}
          {tab === "route" && (
            <RoutePanel
              landmarks={LANDMARKS}
              from={from}
              to={to}
              setFrom={setFrom}
              setTo={setTo}
              onSwap={() => {
                setFrom(to);
                setTo(from);
                setRoutes([]);
              }}
              picking={picking}
              setPicking={setPicking}
              onFind={findRoutes}
              loading={routeLoading}
              error={routeError}
              routes={routes}
              fastestIdx={fastestIdx}
              safestIdx={safestIdx}
            />
          )}
          {tab === "report" && (
            <ReportPanel
              reports={reports}
              loadingReports={reportsLoading}
              pin={reportPin}
              clearPin={() => setReportPin(null)}
              picking={picking === "report"}
              setPicking={(on) => setPicking(on ? "report" : null)}
              onSubmitted={setReports}
              onFocus={(r) => flyTo(r.lat, r.lng, 16)}
            />
          )}
          {tab === "areas" && <AreasPanel areas={ranked} onPick={(a) => flyTo(a.lat, a.lng, 14)} />}
        </main>
      </aside>

      <section
        aria-label="Interactive map of Pune"
        className="relative order-1 h-[45dvh] overflow-hidden md:order-2 md:h-auto md:flex-1 md:rounded-2xl md:shadow-[var(--clay-shadow)]"
      >
        <MapView
          places={filtered}
          selected={selected}
          onSelect={setSelected}
          blackspots={filters.showBlackspots || tab === "route" ? blackspots : []}
          reports={filters.showReports || tab === "report" ? reports : []}
          routes={tab === "route" ? routes : []}
          fastestIdx={fastestIdx}
          safestIdx={safestIdx}
          from={tab === "route" ? (from?.pos ?? null) : null}
          to={tab === "route" ? (to?.pos ?? null) : null}
          reportPin={tab === "report" ? reportPin : null}
          picking={picking !== null}
          onMapClick={onMapClick}
          focus={focus}
          onRouteHere={(p) => {
            setTo({ label: p.name, pos: [p.lat, p.lng] });
            setSelected(null);
            switchTab("route");
          }}
        />
        <div role="status" aria-live="polite">
          {picking && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-[1000] -translate-x-1/2 whitespace-nowrap rounded-full bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-lg">
              Tap the map to set {picking === "report" ? "report location" : picking === "from" ? "start" : "destination"}
            </div>
          )}
        </div>
        <MapLegend tab={tab} />
      </section>
    </div>
  );
}

function MapLegend({ tab }: { tab: Tab }) {
  const items =
    tab === "route"
      ? [
          { swatch: "h-1 w-4 rounded bg-green-600", label: "Safest" },
          { swatch: "h-1 w-4 rounded bg-red-600", label: "Fastest" },
          { swatch: "h-1 w-4 rounded bg-slate-400", label: "Other" },
          { swatch: "h-3 w-3 rounded-full border border-red-600 bg-red-500/25", label: "Accident zone" },
        ]
      : [
          { swatch: "h-3 w-3 rounded-full bg-orange-500", label: "Food" },
          { swatch: "h-3 w-3 rounded-full bg-indigo-500", label: "Stay" },
          { swatch: "h-3 w-3 rounded-full bg-sky-500", label: "Attraction" },
          { swatch: "h-3 w-3 rounded-full bg-yellow-700", label: "Heritage" },
          { swatch: "h-3 w-3 rounded-full bg-yellow-300", label: "Report" },
          { swatch: "h-3 w-3 rounded-full bg-red-500", label: "Verified" },
        ];
  return (
    <ul
      aria-label="Map legend"
      className="pointer-events-none absolute bottom-6 left-3 z-[1000] flex max-w-[calc(100%-1.5rem)] flex-wrap gap-x-3 gap-y-1 rounded-xl border border-black/5 bg-white/90 px-3 py-2 text-[11px] font-medium text-slate-800 shadow-[var(--clay-shadow)] backdrop-blur"
    >
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1">
          <span className={i.swatch} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
