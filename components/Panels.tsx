"use client";

import { useId, useRef, useState } from "react";
import {
  ArrowUpDown,
  BedDouble,
  FerrisWheel,
  Landmark as LandmarkIcon,
  LocateFixed,
  type LucideIcon,
  Map as MapIcon,
  Mic,
  SearchX,
  ShieldCheck,
  Star,
  UtensilsCrossed,
} from "lucide-react";
import type { Area, Category, LatLng, Place, Report, RouteOption } from "@/lib/types";
import { price, timeAgo } from "@/lib/format";

/* ---------------------------------- Explore --------------------------------- */

// `dot` matches the map pin colours in globals.css.
export const CATS: { key: Category; label: string; Icon: LucideIcon; dot: string }[] = [
  { key: "food", label: "Food", Icon: UtensilsCrossed, dot: "bg-orange-500" },
  { key: "hotel", label: "Stays", Icon: BedDouble, dot: "bg-indigo-500" },
  { key: "attraction", label: "Attractions", Icon: FerrisWheel, dot: "bg-sky-500" },
  { key: "heritage", label: "Heritage", Icon: LandmarkIcon, dot: "bg-yellow-700" },
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
  onReset: () => void;
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
            aria-pressed={f.cats.has(c.key)}
            className={`flex min-h-[36px] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium shadow-sm transition-all ${f.cats.has(c.key) ? "border-slate-900 bg-slate-900 text-white shadow-slate-900/20" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}
          >
            <c.Icon className="h-3.5 w-3.5" aria-hidden /> {c.label} <span className="opacity-80">{props.counts[c.key]}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <select
          value={f.area}
          onChange={(e) => setF({ ...f, area: e.target.value })}
          aria-label="Filter by area"
          className="field min-w-0 flex-1"
        >
          <option value="">All areas</option>
          {props.areaNames.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <select
          value={f.maxPrice}
          onChange={(e) => setF({ ...f, maxPrice: Number(e.target.value) })}
          aria-label="Filter by budget"
          className="field"
        >
          <option value={3}>Any budget</option>
          <option value={1}>₹ Budget</option>
          <option value={2}>Up to ₹₹</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" className="h-4 w-4 accent-orange-600" checked={f.showBlackspots} onChange={(e) => setF({ ...f, showBlackspots: e.target.checked })} />
          Accident zones
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" className="h-4 w-4 accent-orange-600" checked={f.showReports} onChange={(e) => setF({ ...f, showReports: e.target.checked })} />
          Citizen reports
        </label>
      </div>

      <div>
        <div className="eyebrow mb-2" role="status" aria-live="polite">
          {props.results.length} {props.results.length === 1 ? "place" : "places"}
        </div>
        <ul className="card divide-y divide-slate-100 overflow-hidden">
          {props.results.length === 0 && (
            <li className="p-4 text-center text-sm text-slate-600">
              <SearchX className="mx-auto mb-1 h-6 w-6 text-slate-400" aria-hidden />
              No places match these filters.
              <button onClick={props.onReset} className="mt-2 block w-full text-sm font-semibold text-orange-700 hover:underline">
                Reset filters
              </button>
            </li>
          )}
          {props.results.map((p) => (
            <li key={p.id}>
              <button onClick={() => props.onPick(p)} className="w-full px-4 py-3 text-left transition-colors hover:bg-orange-50">
                <div className="flex justify-between gap-2 text-sm font-medium">
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${CATS.find((c) => c.key === p.category)?.dot}`} />
                    {p.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-0.5 text-xs text-slate-600">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-500" aria-hidden /> <span className="sr-only">Rating</span> {p.rating}
                  </span>
                </div>
                <div className="truncate pl-[18px] text-xs text-slate-600">
                  {p.area} · <span className="text-emerald-700">{price(p.price)}</span> · {p.tags.join(", ")}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {f.cats.has("heritage") && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-amber-900">Local traditions</h3>
          {TRADITIONS.map((t) => (
            <div key={t.name} className="mb-2 text-xs text-amber-900 last:mb-0">
              <b>{t.name}</b> <span className="font-medium">({t.when})</span>: {t.text}
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
  group?: "Areas" | "Places";
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
      (pos) => props.onChange({ label: "My location", pos: [pos.coords.latitude, pos.coords.longitude] }),
      () => setGpsErr("Location permission denied"),
    );
  };
  const id = useId();
  const isCustom = props.value && !props.landmarks.some((l) => l.label === props.value!.label);
  return (
    <div>
      <label htmlFor={id} className="eyebrow mb-1 block">
        {props.label}
      </label>
      <div className="flex gap-1.5">
        <select
          id={id}
          value={props.value?.label ?? ""}
          onChange={(e) => props.onChange(props.landmarks.find((l) => l.label === e.target.value) ?? null)}
          className="field min-w-0 flex-1"
        >
          <option value="">Choose a place…</option>
          {isCustom && <option>{props.value!.label}</option>}
          {(["Areas", "Places"] as const).map((g) => (
            <optgroup key={g} label={g}>
              {props.landmarks
                .filter((l) => l.group === g)
                .map((l) => (
                  <option key={l.label}>{l.label}</option>
                ))}
            </optgroup>
          ))}
        </select>
        <button
          onClick={props.onPickMap}
          title="Pick on map"
          aria-label={`Pick ${props.label.toLowerCase()} on map`}
          aria-pressed={props.picking}
          className="btn-icon"
        >
          <MapIcon className="h-4 w-4" aria-hidden />
        </button>
        {props.allowGps && (
          <button
            onClick={useGps}
            title="Use my location"
            aria-label="Use my location"
            className="btn-icon"
          >
            <LocateFixed className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
      {props.picking && <div className="mt-1 text-xs text-blue-700">Tap anywhere on the map…</div>}
      {gpsErr && <div role="alert" className="mt-1 text-xs text-red-700">{gpsErr}</div>}
    </div>
  );
}

export function RoutePanel(props: {
  landmarks: Landmark[];
  from: Landmark | null;
  to: Landmark | null;
  setFrom: (l: Landmark | null) => void;
  setTo: (l: Landmark | null) => void;
  onSwap: () => void;
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
      <div className="-my-1 flex justify-center">
        <button
          onClick={props.onSwap}
          disabled={!props.from && !props.to}
          aria-label="Swap start and destination"
          className="flex min-h-[32px] items-center gap-1 rounded-full border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-400 disabled:opacity-40"
        >
          <ArrowUpDown className="h-3 w-3" aria-hidden /> Swap
        </button>
      </div>
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
        aria-busy={props.loading}
        className="btn-primary"
      >
        {props.loading ? (
          <>
            <span className="spinner mr-1.5" /> Finding routes…
          </>
        ) : (
          "Compare safest vs fastest"
        )}
      </button>
      {props.error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {props.error}{" "}
          <button onClick={props.onFind} className="font-medium underline">
            Try again
          </button>
        </div>
      )}

      {props.loading &&
        [0, 1].map((i) => <div key={i} aria-hidden className="card h-20 animate-pulse" />)}

      {!props.loading && !props.error && routes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-5 text-center text-sm text-slate-600">
          <ShieldCheck className="mx-auto mb-1 h-7 w-7 text-orange-500" aria-hidden />
          Pick a start and destination. We compare routes against accident blackspots and live citizen reports.
        </div>
      )}

      {routes.length > 0 && fast && safe && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {safestIdx === fastestIdx ? (
            <>Good news: the fastest route is also the safest one.</>
          ) : (
            <>
              The safer route{" "}
              {safe.durationMin > fast.durationMin ? (
                <>
                  takes <b>{safe.durationMin - fast.durationMin} min longer</b> but
                </>
              ) : (
                "takes about the same time and"
              )}{" "}
              cuts risk by{" "}
              <b>{fast.risk ? Math.round(((fast.risk - safe.risk) / fast.risk) * 100) : 0}%</b>.
            </>
          )}
        </div>
      )}

      {routes.map((r, i) => (
        <div
          key={i}
          className={`card p-4 text-sm ${i === safestIdx ? "!border-emerald-500 ring-1 ring-emerald-500" : i === fastestIdx ? "!border-red-400" : ""}`}
        >
          <div className="flex items-center justify-between">
            <div className="font-medium">
              {r.durationMin} min · {r.distanceKm} km
            </div>
            <div className="flex gap-1">
              {i === fastestIdx && <span className="badge bg-red-100 text-red-800">FASTEST</span>}
              {i === safestIdx && <span className="badge bg-emerald-100 text-emerald-800">SAFEST</span>}
            </div>
          </div>
          <div className="text-xs text-slate-600">Risk score: {r.risk}</div>
          {r.hazards.length > 0 ? (
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-700 marker:text-red-500">
              {r.hazards.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          ) : (
            <div className="mt-1 text-xs text-emerald-700">No known hazards on this route</div>
          )}
        </div>
      ))}
      <p className="text-[11px] text-slate-600">
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
  loadingReports: boolean;
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
        <label htmlFor="report-text" className="eyebrow mb-1 block">
          What&apos;s the issue?
        </label>
        <textarea
          id="report-text"
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && text.trim() && !busy) submit();
          }}
          rows={3}
          placeholder="e.g. Big pothole and no streetlight near Katraj chowk"
          className="field w-full rounded-2xl p-3 pr-12"
        />
        <button
          onClick={startVoice}
          title={listening ? "Stop listening" : "Speak your report"}
          aria-label={listening ? "Stop listening" : "Speak your report"}
          aria-pressed={listening}
          className={`absolute right-2 top-8 flex h-9 w-9 items-center justify-center rounded-full shadow-sm ${listening ? "animate-pulse bg-red-600 text-white" : "bg-orange-50 text-orange-700 hover:bg-orange-100"}`}
        >
          <Mic className="h-4 w-4" aria-hidden />
        </button>
        <div aria-live="polite">{listening && <div className="mt-1 text-xs font-medium text-red-700">● Listening… tap the mic again to stop</div>}</div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => props.setPicking(!props.picking)}
          aria-pressed={props.picking}
          className="btn-icon gap-1 px-3 text-xs font-medium"
        >
          <MapIcon className="h-3.5 w-3.5" aria-hidden /> {props.pin ? "Move pin" : "Pin on map"}
        </button>
        <span className="text-slate-600">
          {props.picking ? "Tap the map…" : props.pin ? "Location pinned" : "or just mention a landmark: AI will locate it"}
        </span>
      </div>
      <button
        disabled={!text.trim() || busy}
        onClick={submit}
        aria-busy={busy}
        className="btn-primary"
      >
        {busy ? (
          <>
            <span className="spinner mr-1.5" /> AI is analysing…
          </>
        ) : (
          "Submit report"
        )}
      </button>
      {err && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</div>}

      {result && (
        <div
          role="status"
          className={`rounded-xl border p-3 text-sm ${result.report.verified ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}
        >
          <div className="eyebrow mb-1">✓ Report submitted</div>
          <div className="font-medium">
            Classified as <b>{result.report.category}</b> · severity <b className="uppercase">{result.report.severity}</b>
          </div>
          <div className="text-xs text-slate-600">
            {result.classifiedBy === "groq" ? "AI (open-source LLM via Groq)" : "Keyword fallback"} · located from {result.locatedBy}
          </div>
          <div className={`mt-1 text-sm ${result.report.verified ? "font-semibold text-red-700" : "text-slate-700"}`}>
            {result.report.verified
              ? `VERIFIED: ${result.report.nearbyCount} independent reports within 300 m`
              : `Unverified: ${result.report.nearbyCount}/3 reports nearby`}
          </div>
        </div>
      )}

      <div>
        <h3 className="eyebrow mb-2 flex items-center gap-1.5">
          <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> Live citizen feed
          {!props.loadingReports && <span className="font-normal normal-case">· {sorted.length}</span>}
        </h3>
        <ul aria-busy={props.loadingReports} className="card divide-y divide-slate-100 overflow-hidden">
          {props.loadingReports && (
            <li className="flex items-center gap-2 p-3 text-sm text-slate-600">
              <span className="spinner" /> Loading reports…
            </li>
          )}
          {!props.loadingReports && sorted.length === 0 && (
            <li className="p-4 text-center text-sm text-slate-600">No reports yet. Be the first to flag an issue.</li>
          )}
          {sorted.map((r) => (
            <li key={r.id}>
              <button onClick={() => props.onFocus(r)} className="w-full px-4 py-3 text-left transition-colors hover:bg-orange-50">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{r.summary}</span>
                  {r.verified && <span className="badge ml-2 shrink-0 bg-red-100 text-red-800">VERIFIED</span>}
                </div>
                <div className="text-xs text-slate-600">
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
    <div className="space-y-3">
      <p className="text-xs text-slate-600">
        Ranked by a weighted score: safety 30%, cleanliness 20%, rating 20%, affordability 15%, accessibility 15%. Safety
        drops automatically when verified citizen reports appear nearby.
      </p>
      {props.areas.map((a, i) => {
        const tier = i < 3 ? "best" : i >= n - 3 ? "worst" : "mid";
        return (
          <button
            key={a.name}
            onClick={() => props.onPick(a)}
            className={`card w-full p-4 text-left transition-transform hover:-translate-y-0.5 ${tier === "best" ? "!border-emerald-400" : tier === "worst" ? "!border-red-300" : ""}`}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">
                #{i + 1} {a.name}
              </div>
              <div className={`text-xl font-bold tabular-nums ${tier === "best" ? "text-emerald-700" : tier === "worst" ? "text-red-700" : "text-slate-800"}`}>
                {a.score}
              </div>
            </div>
            <div className="mb-2 text-xs text-slate-600">
              {tier === "best" ? (
                <span className="font-medium text-emerald-700">Best · </span>
              ) : tier === "worst" ? (
                <span className="font-medium text-red-700">Needs work · </span>
              ) : null}
              {a.note}
              {a.openReports > 0 && ` · ${a.openReports} reports nearby`}
            </div>
            <div className="grid grid-cols-5 gap-1">
              {METRICS.map((m) => {
                const v = a[m.key] as number;
                return (
                  <div key={m.key}>
                    <div className="h-1.5 rounded-full bg-slate-100" aria-hidden>
                      <div
                        className={`h-1.5 rounded-full ${v >= 7.5 ? "bg-emerald-500" : v >= 6 ? "bg-amber-400" : "bg-red-500"}`}
                        style={{ width: `${v * 10}%` }}
                      />
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-600">
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
