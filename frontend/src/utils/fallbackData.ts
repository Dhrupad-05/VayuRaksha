import type { FeatureCollection, RegionSummary, TimeSeriesPoint } from "../types/api";

export const fallbackMetrics = {
  test_r2: 0.9815,
  hotspot_f1: 0.9378,
  improvement_over_baseline_pct: 15.47
};

export const fallbackHealth = {
  status: "degraded",
  artifact_ready: true,
  model_version: "0.2.0-championship"
};

export const fallbackGrid: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    point(77.2, 28.6, 176, 13, 0.8, 720, 4.1),
    point(75.8, 31.8, 164, 16, 1.3, 680, 6.4),
    point(72.9, 19.1, 104, 11, 0.4, 410, 1.2),
    point(80.2, 13.0, 82, 9, 0.2, 360, 0.5),
    point(88.4, 22.6, 118, 14, 0.6, 550, 2.3),
    point(78.5, 17.4, 92, 10, 0.3, 390, 0.8),
    point(91.7, 26.1, 74, 24, 0.2, 320, 0.3)
  ]
};

export const fallbackHotspots: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    hotspot(75.1, 30.2, "critical", 780, 4.4),
    hotspot(83.4, 23.1, "major", 690, 3.2),
    hotspot(88.8, 24.5, "major", 640, 2.9)
  ]
};

export const fallbackRegions: RegionSummary[] = [
  { region: "Indo-Gangetic Plain", mean_aqi: 169, p90_aqi: 214, cells: 42, dominant_category: "Moderate" },
  { region: "Eastern Belt", mean_aqi: 118, p90_aqi: 156, cells: 24, dominant_category: "Moderate" },
  { region: "Coastal South", mean_aqi: 76, p90_aqi: 103, cells: 28, dominant_category: "Satisfactory" },
  { region: "Western Corridor", mean_aqi: 101, p90_aqi: 140, cells: 31, dominant_category: "Moderate" }
];

export const fallbackSeries: TimeSeriesPoint[] = Array.from({ length: 30 }, (_, index) => ({
  date: `D-${29 - index}`,
  aqi_pred: 130 + Math.sin(index / 4) * 24 + index * 0.9,
  aqi_actual: 127 + Math.sin(index / 3.8) * 21 + index * 0.8,
  uncertainty: 10 + Math.cos(index / 5) * 3,
  fire_count: Math.max(0, Math.round(8 + Math.sin(index / 3) * 7)),
  hcho: 430 + Math.sin(index / 4) * 90
}));

function point(lon: number, lat: number, aqi: number, uncertainty: number, aod: number, hcho: number, fire: number) {
  return {
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [lon, lat] as [number, number] },
    properties: { aqi, uncertainty, aod, hcho, fire_intensity: fire, category: "Moderate" }
  };
}

function hotspot(lon: number, lat: number, severity: string, hcho: number, score: number) {
  return {
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [lon, lat] as [number, number] },
    properties: { severity, hcho, score, fire_intensity: score }
  };
}

