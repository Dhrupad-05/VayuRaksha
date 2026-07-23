export interface GeoFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Record<string, number | string | boolean | null | undefined>;
}

export interface FeatureCollection {
  type: "FeatureCollection";
  features: GeoFeature[];
}

export interface MetricsSummary {
  test_r2: number;
  hotspot_f1: number;
  improvement_over_baseline_pct: number;
}

export interface HealthResponse {
  status: string;
  artifact_ready: boolean;
  model_version: string;
}

export interface RegionSummary {
  region: string;
  mean_aqi: number;
  p90_aqi: number;
  cells: number;
  dominant_category: string;
}

export interface TimeSeriesPoint {
  date: string;
  aqi_pred: number;
  aqi_actual: number;
  uncertainty: number;
  fire_count: number;
  hcho: number;
}

