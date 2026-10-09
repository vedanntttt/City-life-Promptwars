"use client";

import { useEffect } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import {
  Construction,
  Droplets,
  FileText,
  Lightbulb,
  type LucideIcon,
  MapPin,
  Siren,
  Star,
  TrafficCone,
  Trash,
  WavesHorizontal,
} from "lucide-react";
import type { Blackspot, LatLng, Place, Report, RouteOption } from "@/lib/types";
import { price, timeAgo } from "@/lib/format";
import { CATS } from "@/components/Panels";

export const PUNE: LatLng = [18.5204, 73.8567];

const REPORT_ICON: Record<string, LucideIcon> = {
  Road: Construction, Traffic: TrafficCone, Safety: Siren, Lighting: Lightbulb,
  Garbage: Trash, Water: Droplets, Flooding: WavesHorizontal, Other: FileText,
};

// Leaflet divIcons take an HTML string, so render each lucide icon to markup once.
const svgCache = new Map<LucideIcon, string>();
const svg = (Icon: LucideIcon) => {
  if (!svgCache.has(Icon)) svgCache.set(Icon, renderToStaticMarkup(<Icon size={15} strokeWidth={2.25} />));
  return svgCache.get(Icon)!;
};
const catIcon = (c: Place["category"]) => CATS.find((x) => x.key === c)!.Icon;

const icon = (cls: string, html: string) =>
  L.divIcon({ className: "", html: `<div class="pin ${cls}">${html}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });

export interface MapFocus {
  lat: number;
  lng: number;
  zoom: number;
  key: number;
}

interface Props {
  places: Place[];
  selected: Place | null;
  onSelect: (p: Place | null) => void;
  blackspots: Blackspot[];
  reports: Report[];
  routes: RouteOption[];
  fastestIdx: number;
  safestIdx: number;
  from: LatLng | null;
  to: LatLng | null;
  reportPin: LatLng | null;
  picking: boolean;
  onMapClick: (p: LatLng) => void;
  focus: MapFocus | null;
  onRouteHere: (p: Place) => void;
}

function ClickHandler({ onClick }: { onClick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onClick([e.latlng.lat, e.latlng.lng]) });
  return null;
}

function FlyTo({ focus }: { focus: MapFocus | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lng], focus.zoom, { duration: 0.8 });
  }, [focus, map]);
  return null;
}

function FitRoutes({ routes }: { routes: RouteOption[] }) {
  const map = useMap();
  useEffect(() => {
    if (routes.length) map.fitBounds(L.latLngBounds(routes.flatMap((r) => r.coords)), { padding: [40, 40] });
  }, [routes, map]);
  return null;
}

export default function MapView(p: Props) {
  const routeColor = (i: number) => (i === p.safestIdx ? "#16a34a" : i === p.fastestIdx ? "#dc2626" : "#94a3b8");
  // Draw grey alternatives first, then fastest, then safest on top.
  const order = p.routes.map((_, i) => i).sort((a, b) => rank(a) - rank(b));
  function rank(i: number) {
    return i === p.safestIdx ? 2 : i === p.fastestIdx ? 1 : 0;
  }

  return (
    <div className={`h-full w-full ${p.picking ? "picking" : ""}`}>
      <MapContainer center={PUNE} zoom={13} className="h-full w-full" zoomControl={false}>
        {/* Free OSM tiles (no API key); softened with a CSS filter in globals.css so pins stand out. */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ZoomControl position="bottomright" />
        <ClickHandler onClick={p.onMapClick} />
        <FlyTo focus={p.focus} />
        <FitRoutes routes={p.routes} />

        {p.blackspots.map((b) => (
          <Circle
            key={b.id}
            center={[b.lat, b.lng]}
            radius={150 + b.severity * 100}
            pathOptions={{ color: "#dc2626", fillColor: "#ef4444", fillOpacity: 0.25, weight: 1 }}
          >
            <Tooltip>
              <b>{b.name}</b>
              <br />
              {b.reason}
            </Tooltip>
          </Circle>
        ))}

        {order.map((i) => (
          <Polyline
            key={`route-${i}-${p.routes[i].distanceKm}`}
            positions={p.routes[i].coords}
            pathOptions={{ color: routeColor(i), weight: rank(i) ? 6 : 4, opacity: rank(i) ? 0.9 : 0.6 }}
          />
        ))}

        {p.places.map((pl) => (
          <Marker
            key={pl.id}
            position={[pl.lat, pl.lng]}
            icon={icon(`pin-${pl.category} ${p.selected?.id === pl.id ? "pin-selected" : ""}`, svg(catIcon(pl.category)))}
            title={`${pl.name} (${pl.category})`}
            alt={pl.name}
            eventHandlers={{ click: () => p.onSelect(pl) }}
          />
        ))}

        {p.selected && (
          <Popup
            key={p.selected.id}
            position={[p.selected.lat, p.selected.lng]}
            offset={[0, -10]}
            eventHandlers={{ remove: () => p.onSelect(null) }}
          >
            <div className="w-56 space-y-1 text-sm">
              <div className="text-base font-semibold">{p.selected.name}</div>
              <div className="flex items-center gap-1 text-xs text-slate-600">
                {p.selected.area} · <span className="text-emerald-700">{price(p.selected.price)}</span> ·
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {p.selected.rating}
              </div>
              <p className="!my-1 text-slate-700">{p.selected.desc}</p>
              <div className="flex flex-wrap gap-1">
                {p.selected.tags.map((t) => (
                  <span key={t} className="rounded-md bg-orange-50 px-1.5 py-0.5 text-[11px] text-orange-900">
                    {t}
                  </span>
                ))}
              </div>
              <button
                onClick={() => p.onRouteHere(p.selected!)}
                className="btn-primary mt-2 !min-h-[36px] text-xs"
              >
                Safe route here
              </button>
            </div>
          </Popup>
        )}

        {p.reports.map((r) => (
          <Marker
            key={r.id}
            position={[r.lat, r.lng]}
            icon={icon(`pin-report ${r.verified ? "verified" : ""}`, svg(REPORT_ICON[r.category] ?? FileText))}
            title={`${r.verified ? "Verified" : "Unverified"} ${r.category} report: ${r.summary}`}
          >
            <Popup>
              <div className="w-52 text-sm">
                <div className="font-semibold">
                  {r.category} · <span className="uppercase">{r.severity}</span>
                </div>
                <div className={r.verified ? "text-red-700" : "text-slate-600"}>
                  {r.verified ? `Verified (${r.nearbyCount} reports nearby)` : `Unverified (${r.nearbyCount}/3 nearby)`}
                </div>
                <p className="!my-1 italic text-slate-700">&ldquo;{r.text}&rdquo;</p>
                <div className="text-xs text-slate-600">{timeAgo(r.createdAt)}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {p.from && <Marker position={p.from} icon={icon("pin-endpoint", "A")} title="Start" />}
        {p.to && <Marker position={p.to} icon={icon("pin-endpoint", "B")} title="Destination" />}
        {p.reportPin && <Marker position={p.reportPin} icon={icon("pin-report", svg(MapPin))} title="New report location" />}
      </MapContainer>
    </div>
  );
}
