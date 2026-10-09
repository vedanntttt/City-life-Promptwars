"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, type LucideIcon, Sun, TriangleAlert } from "lucide-react";

interface Weather {
  temp: number;
  rain: number;
  wind: number;
  code: number;
  rainChance3h: number;
}

const URL =
  "https://api.open-meteo.com/v1/forecast?latitude=18.52&longitude=73.86" +
  "&current=temperature_2m,precipitation,weather_code,wind_speed_10m" +
  "&hourly=precipitation_probability&forecast_hours=3&timezone=Asia%2FKolkata";

// WMO weather codes → icon + short label
function describe(code: number): [LucideIcon, string] {
  if (code === 0) return [Sun, "Clear"];
  if (code <= 3) return [CloudSun, "Partly cloudy"];
  if (code <= 48) return [CloudFog, "Fog"];
  if (code <= 67 || (code >= 80 && code <= 82)) return [CloudRain, "Rain"];
  if (code >= 95) return [CloudLightning, "Thunderstorm"];
  return [Cloud, "Cloudy"];
}

function alertFor(w: Weather): string | null {
  if (w.code >= 95) return "Thunderstorm in Pune: avoid ghats, tree-lined roads and low-lying underpasses.";
  if (w.rain > 0.5 || w.rainChance3h >= 60)
    return `Rain likely (${w.rainChance3h}% in next 3 h): expect waterlogging at underpasses and slower traffic.`;
  if (w.temp >= 38) return "Heat alert: carry water and avoid outdoor sightseeing between 12 and 4 pm.";
  if (w.wind >= 40) return "Strong winds: careful on two-wheelers and near hoardings.";
  return null;
}

export default function WeatherBanner() {
  const [w, setW] = useState<Weather | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(URL)
      .then((r) => r.json())
      .then((j) =>
        setW({
          temp: j.current.temperature_2m,
          rain: j.current.precipitation,
          wind: j.current.wind_speed_10m,
          code: j.current.weather_code,
          rainChance3h: Math.max(...(j.hourly?.precipitation_probability ?? [0])),
        }),
      )
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <div className="px-4 py-2 text-xs text-slate-500">Live weather unavailable</div>;
  if (!w)
    return (
      <div className="flex items-center gap-2 bg-sky-50 px-4 py-2 text-xs text-sky-900/60">
        <span className="h-3 w-24 animate-pulse rounded bg-sky-200" /> Loading live Pune weather…
      </div>
    );

  const alert = alertFor(w);
  const [Icon, label] = describe(w.code);
  return (
    <div className={`px-4 py-2 text-sm ${alert ? "bg-amber-100 text-amber-900" : "bg-sky-50 text-sky-900"}`}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="font-medium">
          {label} · {Math.round(w.temp)}°C
        </span>
        <span className="text-xs opacity-75">· wind {Math.round(w.wind)} km/h · live</span>
      </div>
      {alert && (
        <div className="mt-0.5 flex items-start gap-1.5 text-xs font-medium">
          <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" /> {alert}
        </div>
      )}
    </div>
  );
}
