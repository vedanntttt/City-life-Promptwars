export type Category = "food" | "hotel" | "attraction" | "heritage";

export interface Place {
  id: string;
  name: string;
  category: Category;
  area: string;
  lat: number;
  lng: number;
  price: 1 | 2 | 3;
  rating: number;
  tags: string[];
  desc: string;
}

export interface Blackspot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  severity: 1 | 2 | 3;
  reason: string;
}

export interface Area {
  name: string;
  lat: number;
  lng: number;
  safety: number;
  cleanliness: number;
  affordability: number;
  rating: number;
  accessibility: number;
  note: string;
}

export type Severity = "low" | "medium" | "high";

export interface Report {
  id: string;
  text: string;
  category: string;
  severity: Severity;
  summary: string;
  lat: number;
  lng: number;
  createdAt: number;
  verified?: boolean;
  nearbyCount?: number;
}

export type LatLng = [number, number];

export interface RouteOption {
  coords: LatLng[];
  durationMin: number;
  distanceKm: number;
  risk: number;
  hazards: string[];
}
