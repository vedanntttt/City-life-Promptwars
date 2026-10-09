import { describe, expect, it } from "vitest";
import { MAX_TEXT, inPune, sanitizeText, validateReport } from "@/lib/validate";
import { memoryLimit } from "@/lib/rateLimit";
import { geocodeHint } from "@/lib/geocode";
import { price, timeAgo } from "@/lib/format";

describe("validateReport", () => {
  it("accepts text only", () => {
    expect(validateReport({ text: "Pothole near Katraj" })).toEqual({ ok: true, value: { text: "Pothole near Katraj" } });
  });
  it("accepts text with a location inside Pune", () => {
    const v = validateReport({ text: "Pothole here", lat: 18.52, lng: 73.85 });
    expect(v.ok && v.value).toEqual({ text: "Pothole here", lat: 18.52, lng: 73.85 });
  });
  it.each([
    [null, "Invalid request body"],
    [[], "Invalid request body"],
    [{}, "text is required"],
    [{ text: 42 }, "text is required"],
    [{ text: "hi" }, "at least"],
    [{ text: "x".repeat(MAX_TEXT + 1) }, "too long"],
    [{ text: "Pothole here", lat: 18.5 }, "together"],
    [{ text: "Pothole here", lat: "18.5", lng: "73.8" }, "numbers"],
    [{ text: "Pothole here", lat: NaN, lng: 73.8 }, "numbers"],
    [{ text: "Pothole here", lat: 28.6, lng: 77.2 }, "inside Pune"],
  ])("rejects %j", (body, msg) => {
    const v = validateReport(body);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toContain(msg);
  });
});

describe("sanitizeText", () => {
  it("strips control characters and collapses whitespace", () => {
    expect(sanitizeText("  bad\u0000 road\u0007\n\n here  ")).toBe("bad road here");
  });
});

describe("inPune", () => {
  it("knows Shaniwar Wada is in Pune and Mumbai is not", () => {
    expect(inPune(18.5195, 73.8553)).toBe(true);
    expect(inPune(19.076, 72.8777)).toBe(false);
  });
});

describe("memoryLimit", () => {
  it("allows up to the limit, then blocks until the window resets", () => {
    const key = `test-${Math.random()}`;
    const t = 1_000_000;
    expect([1, 2, 3].map(() => memoryLimit(key, 2, 60, t))).toEqual([true, true, false]);
    expect(memoryLimit(key, 2, 60, t + 61_000)).toBe(true);
  });
});

describe("geocodeHint", () => {
  it("matches a known landmark", () => {
    const p = geocodeHint("katraj chowk");
    expect(p).not.toBeNull();
    expect(inPune(p!.lat, p!.lng)).toBe(true);
  });
  it("returns null for empty or unknown hints", () => {
    expect(geocodeHint("")).toBeNull();
    expect(geocodeHint("zzzz qqqq")).toBeNull();
  });
});

describe("format", () => {
  it("renders price as rupee symbols", () => {
    expect(price(2)).toBe("₹₹");
  });
  it("renders relative time", () => {
    expect(timeAgo(Date.now())).toBe("just now");
    expect(timeAgo(Date.now() - 5 * 60_000)).toBe("5 min ago");
    expect(timeAgo(Date.now() - 3 * 3600_000)).toBe("3 h ago");
  });
});
