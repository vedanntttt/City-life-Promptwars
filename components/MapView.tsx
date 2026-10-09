"use client";

import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { Blackspot, LatLng, Place, Report, RouteOption } from "@/lib/types";
import { price, timeAgo } from "@/lib/format";

export const PUNE: LatLng = [18.5204, 73.8567];

const EMOJI = { food: "🍛", hotel: "🏨", attraction: "🎡", heritage: "🏛️" } as const;
const SEV_EMOJI: Record<string, string> = {
  Road: "🚧", Traffic: "🚦", Safety: "🚨", Lighting: "💡", Garbage: "🗑️", Water: "🚰", Flooding: "🌊", Other: "📝",
};

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
      <MapContainer center={PUNE} zoom={13} className="h-full w-full" zoomControl>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
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
              <b>⚠️ {b.name}</b>
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
            icon={icon(`pin-${pl.category} ${p.selected?.id === pl.id ? "pin-selected" : ""}`, EMOJI[pl.category])}
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
              <div className="text-base font-semibold">
                {EMOJI[p.selected.category]} {p.selected.name}
              </div>
              <div className="text-xs text-slate-500">
                {p.selected.area} · <span className="text-emerald-700">{price(p.selected.price)}</span> · ⭐{" "}
                {p.selected.rating}
              </div>
              <p className="!my-1 text-slate-700">{p.selected.desc}</p>
              <div className="flex flex-wrap gap-1">
                {p.selected.tags.map((t) => (
                  <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">
                    {t}
                  </span>
                ))}
              </div>
              <button
                onClick={() => p.onRouteHere(p.selected!)}
                className="mt-1 w-full rounded bg-slate-900 py-1 text-xs font-medium text-white"
              >
                🧭 Safe route here
              </button>
            </div>
          </Popup>
        )}

        {p.reports.map((r) => (
          <Marker
            key={r.id}
            position={[r.lat, r.lng]}
            icon={icon(`pin-report ${r.verified ? "verified" : ""}`, SEV_EMOJI[r.category] ?? "📝")}
          >
            <Popup>
              <div className="w-52 text-sm">
                <div className="font-semibold">
                  {r.category} · <span className="uppercase">{r.severity}</span>
                </div>
                <div className={r.verified ? "text-red-600" : "text-slate-500"}>
                  {r.verified ? `✅ Verified (${r.nearbyCount} reports nearby)` : `Unverified (${r.nearbyCount}/3 nearby)`}
                </div>
                <p className="!my-1 italic text-slate-700">&ldquo;{r.text}&rdquo;</p>
                <div className="text-xs text-slate-400">{timeAgo(r.createdAt)}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {p.from && <Marker position={p.from} icon={icon("pin-endpoint", "A")} />}
        {p.to && <Marker position={p.to} icon={icon("pin-endpoint", "B")} />}
        {p.reportPin && <Marker position={p.reportPin} icon={icon("pin-report", "📍")} />}
      </MapContainer>
    </div>
  );
}
