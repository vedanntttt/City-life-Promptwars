import Groq from "groq-sdk";
import type { Severity } from "./types";

// Groq retires models often; override with GROQ_MODEL in .env.local if this one disappears.
export const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

export const CATEGORIES =["Road", "Traffic", "Safety", "Lighting", "Garbage", "Water", "Flooding", "Other"] as const;

export interface Classification {
  category: string;
  severity: Severity;
  summary: string;
  location_hint: string;
  source: "groq" | "keywords";
}

const SYSTEM = `You triage citizen reports for Pune city. Reports may mix English, Hindi and Marathi.
Return ONLY JSON: {"category": one of ${JSON.stringify(CATEGORIES)}, "severity": "low"|"medium"|"high", "summary": "<=8 word English summary", "location_hint": "place/landmark named in the text, or empty string"}.
"Flooding" = waterlogged/flooded roads; "Water" = water supply problems or pipe leaks.
Severity is high if there is risk to life or injury (accidents, open manholes, flooding, harassment), medium for disruption, low for minor nuisance.`;

export async function classifyReport(text: string): Promise<Classification> {
  const key = process.env.GROQ_API_KEY;
  if (key) {
    try {
      const groq = new Groq({ apiKey: key });
      const res = await groq.chat.completions.create({
        model: MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: text },
        ],
      });
      const j = JSON.parse(res.choices[0]?.message?.content ?? "{}");
      return {
        category: CATEGORIES.includes(j.category) ? j.category : "Other",
        severity: ["low", "medium", "high"].includes(j.severity) ? j.severity : "medium",
        summary: String(j.summary || text).slice(0, 80),
        location_hint: String(j.location_hint || ""),
        source: "groq",
      };
    } catch (e) {
      console.error("Groq classify failed, using keyword fallback:", e);
    }
  }
  return keywordClassify(text);
}

/** Offline fallback so the demo still works without a key or network. */
function keywordClassify(text: string): Classification {
  const t = text.toLowerCase();
  const rules: [string, RegExp][] = [
    ["Flooding", /flood|waterlog|water ?logging|paani bhar/],
    ["Road", /pothole|khadda|road (is )?(broken|damaged)|manhole/],
    ["Lighting", /street ?light|dark|andhera|no light/],
    ["Traffic", /traffic|jam|signal|congestion/],
    ["Garbage", /garbage|trash|kachra|waste|dump/],
    ["Water", /water supply|pipeline|leak|no water/],
    ["Safety", /unsafe|theft|harass|robbery|fight|accident|chain snatch/],
  ];
  const category = rules.find(([, re]) => re.test(t))?.[0] ?? "Other";
  const severity: Severity = /accident|injur|danger|flood|harass|urgent|huge|massive/.test(t)
    ? "high"
    : /minor|small/.test(t)
      ? "low"
      : "medium";
  const near = t.match(/(?:near|at|in|opposite)\s+([a-z ]{3,30}?)(?:[,.]|$| and| on| signal)/);
  return {
    category,
    severity,
    summary: text.length > 60 ? text.slice(0, 57) + "…" : text,
    location_hint: near?.[1]?.trim() ?? "",
    source: "keywords",
  };
}
