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

  return (
    <main className="flex h-[100dvh] flex-col md:flex-row">
      <aside className="order-2 flex min-h-0 flex-1 flex-col border-slate-200 bg-slate-50 md:order-1 md:w-[400px] md:flex-none md:border-r">
        <header className="flex items-center gap-2.5 border-b border-slate-200 bg-white px-4 py-2.5 md:py-3">
          <Logo className="h-9 w-9 shrink-0 rounded-[9px] shadow-sm" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight tracking-tight">
              Pune<span className="text-orange-500">Sathi</span>
            </h1>
            <p className="truncate text-xs text-slate-500">Explore Pune smarter, safer and on budget</p>
          </div>
        </header>
        <WeatherBanner />
        <nav className="grid grid-cols-4 border-b border-slate-200 bg-white text-xs">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              aria-current={tab === t.key ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 border-b-2 px-1 py-2 font-medium transition-colors sm:flex-row sm:justify-center sm:gap-1 sm:py-2.5 ${
                tab === t.key
                  ? "border-orange-500 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <t.Icon className="h-4 w-4" strokeWidth={2} />
              <span className="whitespace-nowrap">{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
        </div>
      </aside>

      <section className="relative order-1 h-[45dvh] md:order-2 md:h-auto md:flex-1">
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
        {picking && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-[1000] -translate-x-1/2 whitespace-nowrap rounded-full bg-blue-600 px-4 py-1.5 text-sm text-white shadow">
            Tap the map to set {picking === "report" ? "report location" : picking === "from" ? "start" : "destination"}
          </div>
        )}
        <MapLegend tab={tab} />
      </section>
    </main>
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
    <div className="pointer-events-none absolute bottom-6 left-2 z-[1000] flex max-w-[calc(100%-1rem)] flex-wrap gap-x-2.5 gap-y-1 rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] text-slate-700 shadow backdrop-blur">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1">
          <span className={i.swatch} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
