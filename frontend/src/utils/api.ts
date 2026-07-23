import axios from "axios";
import type { FeatureCollection, HealthResponse, MetricsSummary, RegionSummary, TimeSeriesPoint } from "../types/api";
import { fallbackGrid, fallbackHealth, fallbackHotspots, fallbackMetrics, fallbackRegions, fallbackSeries } from "./fallbackData";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  timeout: 30000
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export async function getHealth(): Promise<HealthResponse> {
  return safeGet("/health", fallbackHealth);
}

export async function getMetrics(): Promise<MetricsSummary> {
  return safeGet("/metrics/summary", fallbackMetrics);
}

export async function getAqiGrid(): Promise<FeatureCollection> {
  return safeGet("/aqi/grid", fallbackGrid);
}

export async function getHotspots(minSeverity = "minor"): Promise<FeatureCollection> {
  return safeGet(`/hotspots/geojson?min_severity=${minSeverity}`, fallbackHotspots);
}

export async function getUncertainty(): Promise<FeatureCollection> {
  return safeGet("/uncertainty/map", fallbackGrid);
}

export async function getRegions(): Promise<RegionSummary[]> {
  const payload = await safeGet<{ regions: RegionSummary[] }>("/regions/summary", { regions: fallbackRegions });
  return payload.regions;
}

export async function getTimeseries(region = "igp", days = 30): Promise<TimeSeriesPoint[]> {
  const payload = await safeGet<{ series: TimeSeriesPoint[] }>(
    `/aqi/timeseries?region=${region}&days=${days}`,
    { series: fallbackSeries }
  );
  return payload.series;
}

export async function getModelCard(): Promise<Record<string, unknown>> {
  return safeGet("/model/card", {});
}

async function safeGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await api.get<T>(path);
    return response.data;
  } catch {
    return fallback;
  }
}

