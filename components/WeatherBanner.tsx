"use client";

import { useEffect, useState } from "react";

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

// WMO weather codes → short label
function describe(code: number) {
  if (code === 0) return "☀️ Clear";
  if (code <= 3) return "⛅ Partly cloudy";
  if (code <= 48) return "🌫️ Fog";
  if (code <= 67 || (code >= 80 && code <= 82)) return "🌧️ Rain";
  if (code >= 95) return "⛈️ Thunderstorm";
  return "☁️ Cloudy";
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
  if (!w) return <div className="px-4 py-2 text-xs text-slate-400">Loading live Pune weather…</div>;

  const alert = alertFor(w);
  return (
    <div className={`px-4 py-2 text-sm ${alert ? "bg-amber-100 text-amber-900" : "bg-sky-50 text-sky-900"}`}>
      <span className="font-medium">
        {describe(w.code)} · {Math.round(w.temp)}°C
      </span>
      <span className="text-xs opacity-75"> · wind {Math.round(w.wind)} km/h · live</span>
      {alert && <div className="mt-0.5 text-xs font-medium">⚠️ {alert}</div>}
    </div>
  );
}
