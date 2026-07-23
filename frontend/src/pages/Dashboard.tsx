import { AlertTriangle, Activity, Gauge, RadioTower } from "lucide-react";
import type { ReactNode } from "react";
import { CorrelationChart } from "../components/charts/CorrelationChart";
import { DistributionChart } from "../components/charts/DistributionChart";
import { TimeSeriesChart } from "../components/charts/TimeSeriesChart";
import { Card } from "../components/common/Card";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { LeafletMap } from "../components/maps/LeafletMap";
import { useAQIData } from "../hooks/useAQIData";
import { useAppStore } from "../store/appStore";
import { fallbackGrid, fallbackHotspots } from "../utils/fallbackData";
import { number, pct } from "../utils/formatting";

export function Dashboard() {
  const { selectedRegion } = useAppStore();
  const { loading, metrics, grid, hotspots, uncertainty, regions, series, health } = useAQIData(selectedRegion);
  const aqiGrid = grid ?? fallbackGrid;
  const hotspotGrid = hotspots ?? fallbackHotspots;
  return (
    <div className="page-grid dashboard-page">
      <section className="page-title">
        <div>
          <span className="eyebrow">Command Center</span>
          <h1>National AQI forecast and emission intelligence</h1>
        </div>
        <div className="status-cluster">
          <span className="live-pill"><span className="pulse-dot" />API {health?.status ?? "fallback"}</span>
          <span className="live-pill">Model {health?.model_version ?? "demo"}</span>
        </div>
      </section>
      <div className="kpi-grid">
        <Kpi icon={<Gauge />} label="Production R2" value={number(metrics?.test_r2, 3)} tone="green" />
        <Kpi icon={<AlertTriangle />} label="Hotspot F1" value={number(metrics?.hotspot_f1, 3)} tone="red" />
        <Kpi icon={<Activity />} label="Baseline Lift" value={pct(metrics?.improvement_over_baseline_pct)} tone="blue" />
        <Kpi icon={<RadioTower />} label="Grid Points" value={String(aqiGrid.features.length)} tone="gold" />
      </div>
      {loading ? <LoadingSpinner /> : <LeafletMap grid={aqiGrid} hotspots={hotspotGrid} uncertainty={uncertainty} />}
      <section className="analytics-grid">
        <Card><TimeSeriesChart data={series} /></Card>
        <Card><CorrelationChart grid={aqiGrid} /></Card>
        <Card><DistributionChart hotspots={hotspotGrid} /></Card>
      </section>
      <Card title="Regional Watch" eyebrow="Prioritized risk">
        <div className="region-watch">
          {regions.map((region) => (
            <article className="region-row" key={region.region}>
              <div>
                <strong>{region.region}</strong>
                <span>{region.cells} cells · {region.dominant_category}</span>
              </div>
              <div>
                <strong>{number(region.mean_aqi, 1)}</strong>
                <span>P90 {number(region.p90_aqi, 1)}</span>
              </div>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) {
  return (
    <Card className={`kpi kpi-${tone}`}>
      <div className="kpi-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </Card>
  );
}
