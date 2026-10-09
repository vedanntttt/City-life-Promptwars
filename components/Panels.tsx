"use client";

import { useRef, useState } from "react";
import type { Area, Category, LatLng, Place, Report, RouteOption } from "@/lib/types";
import { price, timeAgo } from "@/lib/format";

/* ---------------------------------- Explore --------------------------------- */

export const CATS: { key: Category; label: string; emoji: string }[] = [
  { key: "food", label: "Food", emoji: "🍛" },
  { key: "hotel", label: "Stays", emoji: "🏨" },
  { key: "attraction", label: "Attractions", emoji: "🎡" },
  { key: "heritage", label: "Heritage", emoji: "🏛️" },
];

const TRADITIONS = [
  { name: "Ganeshotsav", when: "Aug–Sep", text: "10-day festival started publicly by Lokmanya Tilak in 1893; the 5 Manache Ganpati lead the immersion procession." },
  { name: "Palkhi / Wari", when: "Jun–Jul", text: "Lakhs of warkaris walk with the palkhis of Sant Dnyaneshwar and Sant Tukaram through Pune to Pandharpur." },
  { name: "Sawai Gandharva Festival", when: "December", text: "One of India's oldest Hindustani classical music festivals, founded by Pt. Bhimsen Joshi." },
];

export interface ExploreFilters {
  cats: Set<Category>;
  area: string;
  maxPrice: number;
  showBlackspots: boolean;
  showReports: boolean;
}

export function ExplorePanel(props: {
  f: ExploreFilters;
  setF: (f: ExploreFilters) => void;
  areaNames: string[];
  results: Place[];
  counts: Record<Category, number>;
  onPick: (p: Place) => void;
}) {
  const { f, setF } = props;
  const toggle = (c: Category) => {
    const cats = new Set(f.cats);
    if (cats.has(c)) cats.delete(c);
    else cats.add(c);
    setF({ ...f, cats });
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button
            key={c.key}
            onClick={() => toggle(c.key)}
            className={`rounded-full border px-3 py-1 text-sm ${f.cats.has(c.key) ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white"}`}
          >
            {c.emoji} {c.label} <span className="opacity-60">{props.counts[c.key]}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <select
          value={f.area}
          onChange={(e) => setF({ ...f, area: e.target.value })}
          className="flex-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">All areas</option>
          {props.areaNames.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <select
          value={f.maxPrice}
          onChange={(e) => setF({ ...f, maxPrice: Number(e.target.value) })}
          className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value={3}>Any budget</option>
          <option value={1}>₹ Budget</option>
          <option value={2}>Up to ₹₹</option>
        </select>
      </div>

      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={f.showBlackspots} onChange={(e) => setF({ ...f, showBlackspots: e.target.checked })} />
          ⚠️ Accident zones
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={f.showReports} onChange={(e) => setF({ ...f, showReports: e.target.checked })} />
          📢 Citizen reports
        </label>
      </div>

      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {props.results.length === 0 && <li className="p-3 text-sm text-slate-500">No places match these filters.</li>}
        {props.results.map((p) => (
          <li key={p.id}>
            <button onClick={() => props.onPick(p)} className="w-full px-3 py-2 text-left hover:bg-slate-50">
              <div className="flex justify-between text-sm font-medium">
                <span>
                  {CATS.find((c) => c.key === p.category)?.emoji} {p.name}
                </span>
                <span className="text-xs text-slate-500">⭐ {p.rating}</span>
              </div>
              <div className="text-xs text-slate-500">
                {p.area} · <span className="text-emerald-700">{price(p.price)}</span> · {p.tags.join(", ")}
              </div>
            </button>
          </li>
        ))}
      </ul>

      {f.cats.has("heritage") && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="mb-2 text-sm font-semibold text-amber-900">🪔 Local traditions</div>
          {TRADITIONS.map((t) => (
            <div key={t.name} className="mb-2 text-xs text-amber-900 last:mb-0">
              <b>{t.name}</b> <span className="opacity-70">({t.when})</span>: {t.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------- Route ---------------------------------- */

export interface Landmark {
  label: string;
  pos: LatLng;
}

export type PickTarget = "from" | "to" | "report" | null;

function PointPicker(props: {
  label: string;
  value: Landmark | null;
  landmarks: Landmark[];
  onChange: (l: Landmark | null) => void;
  onPickMap: () => void;
  picking: boolean;
  allowGps?: boolean;
}) {
  const [gpsErr, setGpsErr] = useState("");
  const useGps = () => {
    setGpsErr("");
    navigator.geolocation.getCurrentPosition(
      (pos) => props.onChange({ label: "📍 My location", pos: [pos.coords.latitude, pos.coords.longitude] }),
      () => setGpsErr("Location permission denied"),
    );
  };
  const isCustom = props.value && !props.landmarks.some((l) => l.label === props.value!.label);
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-slate-500">{props.label}</div>
      <div className="flex gap-1">
        <select
          value={props.value?.label ?? ""}
          onChange={(e) => props.onChange(props.landmarks.find((l) => l.label === e.target.value) ?? null)}
          className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">Choose a place…</option>
          {isCustom && <option>{props.value!.label}</option>}
          {props.landmarks.map((l) => (
            <option key={l.label}>{l.label}</option>
          ))}
        </select>
        <button
          onClick={props.onPickMap}
          title="Tap on map"
          className={`rounded border px-2 text-sm ${props.picking ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"}`}
        >
          🗺️
        </button>
        {props.allowGps && (
          <button onClick={useGps} title="Use my location" className="rounded border border-slate-300 bg-white px-2 text-sm">
            📍
          </button>
        )}
      </div>
      {props.picking && <div className="mt-1 text-xs text-blue-700">Tap anywhere on the map…</div>}
      {gpsErr && <div className="mt-1 text-xs text-red-600">{gpsErr}</div>}
    </div>
  );
}

export function RoutePanel(props: {
  landmarks: Landmark[];
  from: Landmark | null;
  to: Landmark | null;
  setFrom: (l: Landmark | null) => void;
  setTo: (l: Landmark | null) => void;
  picking: PickTarget;
  setPicking: (p: PickTarget) => void;
  onFind: () => void;
  loading: boolean;
  error: string;
  routes: RouteOption[];
  fastestIdx: number;
  safestIdx: number;
}) {
  const { routes, fastestIdx, safestIdx } = props;
  const fast = routes[fastestIdx];
  const safe = routes[safestIdx];
  return (
    <div className="space-y-3">
      <PointPicker
        label="From"
        value={props.from}
        landmarks={props.landmarks}
        onChange={props.setFrom}
        onPickMap={() => props.setPicking(props.picking === "from" ? null : "from")}
        picking={props.picking === "from"}
        allowGps
      />
      <PointPicker
        label="To"
        value={props.to}
        landmarks={props.landmarks}
        onChange={props.setTo}
        onPickMap={() => props.setPicking(props.picking === "to" ? null : "to")}
        picking={props.picking === "to"}
      />
      <button
        disabled={!props.from || !props.to || props.loading}
        onClick={props.onFind}
        className="w-full rounded bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        {props.loading ? "Finding routes…" : "🧭 Compare safest vs fastest"}
      </button>
      {props.error && <div className="text-sm text-red-600">{props.error}</div>}

      {routes.length > 0 && fast && safe && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
          {safestIdx === fastestIdx ? (
            <>✅ Good news: the fastest route is also the safest one.</>
          ) : (
            <>
              🛡️ The safer route takes <b>{safe.durationMin - fast.durationMin} min longer</b> but cuts risk by{" "}
              <b>{fast.risk ? Math.round(((fast.risk - safe.risk) / fast.risk) * 100) : 0}%</b>.
            </>
          )}
        </div>
      )}

      {routes.map((r, i) => (
        <div
          key={i}
          className={`rounded-lg border bg-white p-3 text-sm ${i === safestIdx ? "border-emerald-500" : i === fastestIdx ? "border-red-400" : "border-slate-200"}`}
        >
          <div className="flex items-center justify-between">
            <div className="font-medium">
              {r.durationMin} min · {r.distanceKm} km
            </div>
            <div className="flex gap-1">
              {i === fastestIdx && <span className="rounded bg-red-100 px-1.5 text-xs text-red-700">FASTEST</span>}
              {i === safestIdx && <span className="rounded bg-emerald-100 px-1.5 text-xs text-emerald-700">SAFEST</span>}
            </div>
          </div>
          <div className="text-xs text-slate-500">Risk score: {r.risk}</div>
          {r.hazards.length > 0 ? (
            <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
              {r.hazards.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          ) : (
            <div className="mt-1 text-xs text-emerald-700">No known hazards on this route</div>
          )}
        </div>
      ))}
      <p className="text-[11px] text-slate-400">
        Risk = accident blackspots within 250 m of the route (weighted by severity) + citizen reports (verified ones count 4× more).
      </p>
    </div>
  );
}

/* ---------------------------------- Report ---------------------------------- */

interface SubmitResult {
  report: Report;
  classifiedBy: string;
  locatedBy: string;
}

export function ReportPanel(props: {
  reports: Report[];
  pin: LatLng | null;
  clearPin: () => void;
  picking: boolean;
  setPicking: (on: boolean) => void;
  onSubmitted: (reports: Report[]) => void;
  onFocus: (r: Report) => void;
}) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  const startVoice = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return setErr("Voice input needs Chrome or Edge.");
    if (listening) return recRef.current?.stop();
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => setText(Array.from(e.results).map((r: any) => r[0].transcript).join(" "));
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setErr("");
    setListening(true);
    rec.start();
  };

  const submit = async () => {
    setBusy(true);
    setErr("");
    setResult(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lat: props.pin?.[0], lng: props.pin?.[1] }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setResult(j);
      props.onSubmitted(j.reports);
      props.onFocus(j.report);
      setText("");
      props.clearPin();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...props.reports].sort((a, b) => b.createdAt - a.createdAt);
  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="e.g. Big pothole and no streetlight near Katraj chowk"
          className="w-full rounded border border-slate-300 bg-white p-2 pr-10 text-sm"
        />
        <button
          onClick={startVoice}
          title="Speak your report"
          className={`absolute right-2 top-2 rounded-full p-1.5 text-sm ${listening ? "animate-pulse bg-red-600 text-white" : "bg-slate-100"}`}
        >
          🎙️
        </button>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => props.setPicking(!props.picking)}
          className={`rounded border px-2 py-1 ${props.picking ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"}`}
        >
          🗺️ {props.pin ? "Move pin" : "Pin on map"}
        </button>
        <span className="text-slate-500">
          {props.picking ? "Tap the map…" : props.pin ? "Location pinned" : "or just mention a landmark: AI will locate it"}
        </span>
      </div>
      <button
        disabled={!text.trim() || busy}
        onClick={submit}
        className="w-full rounded bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        {busy ? "AI is analysing…" : "📢 Submit report"}
      </button>
      {err && <div className="text-sm text-red-600">{err}</div>}

      {result && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <div className="font-medium">
            Classified as <b>{result.report.category}</b> · severity <b className="uppercase">{result.report.severity}</b>
          </div>
          <div className="text-xs text-slate-500">
            {result.classifiedBy === "groq" ? "🤖 AI (open-source LLM via Groq)" : "Keyword fallback"} · located from {result.locatedBy}
          </div>
          <div className={`mt-1 text-sm ${result.report.verified ? "text-red-600" : "text-slate-600"}`}>
            {result.report.verified
              ? `✅ VERIFIED: ${result.report.nearbyCount} independent reports within 300 m`
              : `⏳ Unverified: ${result.report.nearbyCount}/3 reports nearby`}
          </div>
        </div>
      )}

      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Live citizen feed</div>
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {sorted.map((r) => (
            <li key={r.id}>
              <button onClick={() => props.onFocus(r)} className="w-full px-3 py-2 text-left hover:bg-slate-50">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{r.summary}</span>
                  {r.verified && <span className="ml-2 shrink-0 rounded bg-red-100 px-1.5 text-xs text-red-700">VERIFIED</span>}
                </div>
                <div className="text-xs text-slate-500">
                  {r.category} · {r.severity} · {timeAgo(r.createdAt)}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ----------------------------------- Areas ---------------------------------- */

type ScoredArea = Area & { score: number; openReports: number };

const METRICS: { key: keyof Area; label: string }[] = [
  { key: "safety", label: "Safety" },
  { key: "cleanliness", label: "Clean" },
  { key: "affordability", label: "Afford" },
  { key: "rating", label: "Rating" },
  { key: "accessibility", label: "Access" },
];

export function AreasPanel(props: { areas: ScoredArea[]; onPick: (a: Area) => void }) {
  const n = props.areas.length;
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Ranked by a weighted score: safety 30%, cleanliness 20%, rating 20%, affordability 15%, accessibility 15%. Safety
        drops automatically when verified citizen reports appear nearby.
      </p>
      {props.areas.map((a, i) => {
        const tier = i < 3 ? "best" : i >= n - 3 ? "worst" : "mid";
        return (
          <button
            key={a.name}
            onClick={() => props.onPick(a)}
            className={`w-full rounded-lg border bg-white p-3 text-left ${tier === "best" ? "border-emerald-400" : tier === "worst" ? "border-red-300" : "border-slate-200"}`}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">
                #{i + 1} {a.name}
              </div>
              <div className={`text-lg font-bold ${tier === "best" ? "text-emerald-600" : tier === "worst" ? "text-red-600" : "text-slate-700"}`}>
                {a.score}
              </div>
            </div>
            <div className="mb-2 text-xs text-slate-500">
              {tier === "best" ? "🏆 Best · " : tier === "worst" ? "👎 Needs work · " : ""}
              {a.note}
              {a.openReports > 0 && ` · 📢 ${a.openReports} reports nearby`}
            </div>
            <div className="grid grid-cols-5 gap-1">
              {METRICS.map((m) => {
                const v = a[m.key] as number;
                return (
                  <div key={m.key}>
                    <div className="h-1.5 rounded bg-slate-100">
                      <div
                        className={`h-1.5 rounded ${v >= 7.5 ? "bg-emerald-500" : v >= 6 ? "bg-amber-400" : "bg-red-500"}`}
                        style={{ width: `${v * 10}%` }}
                      />
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {m.label} {v}
                    </div>
                  </div>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}
