import { useEffect, useState } from "react";
import type { FeatureCollection, HealthResponse, MetricsSummary, RegionSummary, TimeSeriesPoint } from "../types/api";
import { getAqiGrid, getHealth, getHotspots, getMetrics, getRegions, getTimeseries, getUncertainty } from "../utils/api";

export function useAQIData(region = "igp") {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [grid, setGrid] = useState<FeatureCollection | null>(null);
  const [hotspots, setHotspots] = useState<FeatureCollection | null>(null);
  const [uncertainty, setUncertainty] = useState<FeatureCollection | null>(null);
  const [regions, setRegions] = useState<RegionSummary[]>([]);
  const [series, setSeries] = useState<TimeSeriesPoint[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      getHealth(),
      getMetrics(),
      getAqiGrid(),
      getHotspots(),
      getUncertainty(),
      getRegions(),
      getTimeseries(region, 30)
    ])
      .then(([healthPayload, metricPayload, gridPayload, hotspotPayload, uncertaintyPayload, regionPayload, seriesPayload]) => {
        if (!alive) return;
        setHealth(healthPayload);
        setMetrics(metricPayload);
        setGrid(gridPayload);
        setHotspots(hotspotPayload);
        setUncertainty(uncertaintyPayload);
        setRegions(regionPayload);
        setSeries(seriesPayload);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [region]);

  return { loading, health, metrics, grid, hotspots, uncertainty, regions, series };
}

