import { describe, expect, it } from "vitest";
import { distanceToPolyline, haversine, markVerified, overallScore, routeRisk, scoredAreas } from "@/lib/geo";
import type { Area, Blackspot, LatLng, Report } from "@/lib/types";

const report = (over: Partial<Report> = {}): Report => ({
  id: Math.random().toString(36),
  text: "pothole",
  category: "Road",
  severity: "high",
  summary: "Pothole",
  lat: 18.5204,
  lng: 73.8567,
  createdAt: Date.now(),
  ...over,
});

describe("haversine", () => {
  it("is zero for the same point", () => {
    expect(haversine([18.52, 73.85], [18.52, 73.85])).toBe(0);
  });
  it("matches a known distance (~1.11 km per 0.01° latitude)", () => {
    expect(haversine([18.52, 73.85], [18.53, 73.85])).toBeCloseTo(1112, -1);
  });
  it("is symmetric", () => {
    const a: LatLng = [18.5, 73.8], b: LatLng = [18.6, 73.9];
    expect(haversine(a, b)).toBeCloseTo(haversine(b, a), 6);
  });
});

describe("distanceToPolyline", () => {
  const line: LatLng[] = [[18.52, 73.85], [18.52, 73.86]];
  it("is ~0 for a point on the line", () => {
    expect(distanceToPolyline([18.52, 73.855], line)).toBeLessThan(1);
  });
  it("measures perpendicular distance", () => {
    expect(distanceToPolyline([18.521, 73.855], line)).toBeCloseTo(110, -1);
  });
  it("clamps to the nearest endpoint", () => {
    expect(distanceToPolyline([18.52, 73.87], line)).toBeCloseTo(haversine([18.52, 73.87], [18.52, 73.86]), -1);
  });
});

describe("routeRisk", () => {
  const route: LatLng[] = [[18.52, 73.85], [18.52, 73.86]];
  const spot: Blackspot = { id: "b1", name: "Test Chowk", lat: 18.5201, lng: 73.855, severity: 3, reason: "x" };

  it("is zero with no hazards", () => {
    expect(routeRisk(route, [], [])).toEqual({ risk: 0, hazards: [] });
  });
  it("adds blackspots near the route, weighted by severity", () => {
    const r = routeRisk(route, [spot], []);
    expect(r.risk).toBe(6);
    expect(r.hazards).toEqual(["Accident zone: Test Chowk"]);
  });
  it("ignores blackspots more than 250 m away", () => {
    expect(routeRisk(route, [{ ...spot, lat: 18.53 }], []).risk).toBe(0);
  });
  it("weighs verified reports 4x more than unverified", () => {
    const unverified = routeRisk(route, [], [report({ lat: 18.52, lng: 73.855 })]).risk;
    const verified = routeRisk(route, [], [report({ lat: 18.52, lng: 73.855, verified: true })]).risk;
    expect(verified).toBe(unverified * 4);
  });
});

describe("markVerified", () => {
  it("verifies when 3 reports are within 300 m", () => {
    const rs = [report(), report({ lat: 18.5205 }), report({ lat: 18.5206 })];
    const out = markVerified(rs);
    expect(out.every((r) => r.verified)).toBe(true);
    expect(out[0].nearbyCount).toBe(3);
  });
  it("does not verify with only 2 nearby reports", () => {
    expect(markVerified([report(), report()]).some((r) => r.verified)).toBe(false);
  });
  it("ignores reports older than 24 h", () => {
    const old = Date.now() - 25 * 3600_000;
    const out = markVerified([report(), report({ createdAt: old }), report({ createdAt: old })]);
    expect(out[0].verified).toBe(false);
  });
  it("ignores far-away reports", () => {
    const out = markVerified([report(), report({ lat: 18.6 }), report({ lat: 18.7 })]);
    expect(out[0].nearbyCount).toBe(1);
  });
});

describe("area scoring", () => {
  const area: Area = {
    name: "Test", lat: 18.52, lng: 73.85, safety: 8, cleanliness: 8, affordability: 8, rating: 8, accessibility: 8, note: "",
  };
  it("weights sum to 1", () => {
    expect(overallScore(area)).toBe(8);
  });
  it("lowers safety for verified reports within 1.5 km", () => {
    const [scored] = scoredAreas([area], [report({ lat: 18.52, lng: 73.85, verified: true })]);
    expect(scored.safety).toBe(7.5);
    expect(scored.openReports).toBe(1);
    expect(scored.score).toBeLessThan(8);
  });
  it("sorts best first", () => {
    const out = scoredAreas([{ ...area, name: "Low", safety: 2 }, area], []);
    expect(out.map((a) => a.name)).toEqual(["Test", "Low"]);
  });
});
