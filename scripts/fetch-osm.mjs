// One-off: pull real Pune places from OpenStreetMap (Overpass API, free, no key).
// Usage: node scripts/fetch-osm.mjs  -> writes data/osm_raw.json
import { writeFileSync, mkdirSync } from "node:fs";

const BBOX = "18.43,73.74,18.64,73.98"; // south,west,north,east (Pune city)
const query = `
[out:json][timeout:90];
(
  nwr["amenity"~"^(restaurant|cafe|fast_food)$"]["name"](${BBOX});
  nwr["tourism"~"^(hotel|guest_house|hostel)$"]["name"](${BBOX});
  nwr["tourism"~"^(attraction|museum|viewpoint|zoo|theme_park)$"]["name"](${BBOX});
  nwr["leisure"="park"]["name"]["wikidata"](${BBOX});
  nwr["historic"]["name"](${BBOX});
);
out center tags;
`;

const res = await fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
    "User-Agent": "PuneSathi-hackathon/0.1",
  },
  body: "data=" + encodeURIComponent(query),
});
if (!res.ok) throw new Error(`Overpass ${res.status}: ${await res.text()}`);
const json = await res.json();

const places = json.elements
  .map((e) => ({
    id: `${e.type}/${e.id}`,
    name: e.tags.name,
    lat: e.lat ?? e.center?.lat,
    lng: e.lon ?? e.center?.lon,
    tags: e.tags,
  }))
  .filter((p) => p.lat && p.lng);

mkdirSync("data", { recursive: true });
writeFileSync("data/osm_raw.json", JSON.stringify(places, null, 1));
console.log(`Saved ${places.length} places to data/osm_raw.json`);
