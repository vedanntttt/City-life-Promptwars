"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import placesData from "@/data/places.json";
import blackspotsData from "@/data/blackspots.json";
import areasData from "@/data/areas.json";
import type { Area, Blackspot, Category, LatLng, Place, Report, RouteOption } from "@/lib/types";
import { scoredAreas } from "@/lib/geo";
import { getRoutes } from "@/lib/routing";
import WeatherBanner from "@/components/WeatherBanner";
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
  loading: () => <div className="flex h-full items-center justify-center text-slate-400">Loading map…</div>,
});

const places = placesData as Place[];
const blackspots = blackspotsData as Blackspot[];
const areas = areasData as Area[];

const TABS = [
  { key: "explore", label: "🧭 Explore" },
  { key: "route", label: "🛡️ Safe Route" },
  { key: "report", label: "📢 Report" },
  { key: "areas", label: "🏆 Best/Worst" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const LANDMARKS: Landmark[] = [
  ...areas.map((a) => ({ label: `📍 ${a.name}`, pos: [a.lat, a.lng] as LatLng })),
  ...places.map((p) => ({ label: p.name, pos: [p.lat, p.lng] as LatLng })),
].sort((a, b) => a.label.localeCompare(b.label));

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
      .catch(() => {});
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
    const label = `📌 Pinned (${p[0].toFixed(4)}, ${p[1].toFixed(4)})`;
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
        <header className="border-b border-slate-200 bg-white px-4 py-3">
          <h1 className="text-lg font-bold">
            Pune<span className="text-orange-500">Sathi</span>
          </h1>
          <p className="text-xs text-slate-500">Explore Pune smarter, safer and on budget</p>
        </header>
        <WeatherBanner />
        <nav className="grid grid-cols-4 border-b border-slate-200 bg-white text-xs">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={`px-1 py-2.5 font-medium ${tab === t.key ? "border-b-2 border-slate-900 text-slate-900" : "text-slate-500"}`}
            >
              {t.label}
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
            />
          )}
          {tab === "route" && (
            <RoutePanel
              landmarks={LANDMARKS}
              from={from}
              to={to}
              setFrom={setFrom}
              setTo={setTo}
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
          <div className="pointer-events-none absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1.5 text-sm text-white shadow">
            Tap the map to set {picking === "report" ? "report location" : picking === "from" ? "start" : "destination"}
          </div>
        )}
      </section>
    </main>
  );
}
