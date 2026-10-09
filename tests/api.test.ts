import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/reports/route";

let ip = 0;
const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request("http://localhost/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${++ip}`, ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

describe("GET /api/reports", () => {
  it("returns seed reports with verification flags", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const reports = await res.json();
    expect(reports.length).toBeGreaterThan(0);
    expect(reports[0]).toHaveProperty("verified");
  });
});

describe("POST /api/reports", () => {
  it("classifies and stores a report located by landmark", async () => {
    const res = await post({ text: "Big pothole near Katraj chowk" });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.report.category).toBe("Road");
    expect(j.classifiedBy).toBe("keywords");
    expect(j.reports.some((r: { id: string }) => r.id === j.report.id)).toBe(true);
  });

  it("uses the map pin when given", async () => {
    const res = await post({ text: "Garbage pile here", lat: 18.52, lng: 73.85 });
    const j = await res.json();
    expect(j.locatedBy).toBe("map pin");
    expect(j.report.lat).toBe(18.52);
  });

  it("rejects invalid JSON", async () => {
    expect((await post("{not json")).status).toBe(400);
  });
  it("rejects empty text", async () => {
    expect((await post({ text: "  " })).status).toBe(400);
  });
  it("rejects locations outside Pune", async () => {
    expect((await post({ text: "Pothole on the road", lat: 0, lng: 0 })).status).toBe(400);
  });
  it("rejects non-JSON content types", async () => {
    expect((await post({ text: "Pothole here" }, { "content-type": "text/plain" })).status).toBe(415);
  });
  it("rate-limits repeated submissions from one IP", async () => {
    const headers = { "x-forwarded-for": "203.0.113.9" };
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++)
      statuses.push((await post({ text: "Pothole here", lat: 18.52, lng: 73.85 }, headers)).status);
    expect(statuses.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});
