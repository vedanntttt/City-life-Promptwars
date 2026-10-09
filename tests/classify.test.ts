import { describe, expect, it } from "vitest";
import { CATEGORIES, classifyReport, keywordClassify, parseClassification } from "@/lib/classify";

describe("keywordClassify", () => {
  it.each([
    ["Big pothole near Katraj chowk", "Road"],
    ["Road is waterlogged near Sinhagad road", "Flooding"],
    ["No streetlight at Baner, very dark", "Lighting"],
    ["Huge traffic jam at Swargate", "Traffic"],
    ["Garbage dumped near FC Road", "Garbage"],
    ["Chain snatching incident near Camp", "Safety"],
    ["Something weird happened", "Other"],
  ])("%s → %s", (text, category) => {
    expect(keywordClassify(text).category).toBe(category);
  });

  it("marks injuries/accidents as high severity", () => {
    expect(keywordClassify("Accident at Hadapsar signal").severity).toBe("high");
  });
  it("marks minor issues as low severity", () => {
    expect(keywordClassify("Minor garbage pile").severity).toBe("low");
  });
  it("extracts a location hint", () => {
    expect(keywordClassify("Big pothole near Katraj chowk").location_hint).toBe("katraj chowk");
  });
  it("truncates long summaries", () => {
    expect(keywordClassify("x".repeat(200)).summary.length).toBeLessThanOrEqual(58);
  });
});

describe("parseClassification (untrusted LLM output)", () => {
  it("accepts valid output", () => {
    const c = parseClassification(
      '{"category":"Road","severity":"high","summary":"Pothole","location_hint":"Katraj"}',
      "t",
    );
    expect(c).toMatchObject({ category: "Road", severity: "high", summary: "Pothole", location_hint: "Katraj" });
  });
  it("rejects unknown categories and severities", () => {
    const c = parseClassification('{"category":"<script>","severity":"extreme"}', "text");
    expect(c.category).toBe("Other");
    expect(c.severity).toBe("medium");
    expect(c.summary).toBe("text");
  });
  it("caps field lengths", () => {
    const c = parseClassification(JSON.stringify({ summary: "a".repeat(500), location_hint: "b".repeat(500) }), "t");
    expect(c.summary.length).toBe(80);
    expect(c.location_hint.length).toBe(100);
  });
  it("throws on non-JSON so the caller falls back", () => {
    expect(() => parseClassification("not json", "t")).toThrow();
  });
});

describe("classifyReport", () => {
  it("falls back to keywords without a Groq key", async () => {
    const c = await classifyReport("Open manhole near Shivajinagar");
    expect(c.source).toBe("keywords");
    expect(CATEGORIES).toContain(c.category as (typeof CATEGORIES)[number]);
  });
});
