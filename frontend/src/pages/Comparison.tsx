import { Download, SlidersHorizontal } from "lucide-react";
import { TimeSeriesChart } from "../components/charts/TimeSeriesChart";
import { Card } from "../components/common/Card";
import { useAQIData } from "../hooks/useAQIData";
import { useAppStore } from "../store/appStore";

export function Comparison() {
  const { selectedRegion, addNotification } = useAppStore();
  const { regions, series } = useAQIData(selectedRegion);
  return (
    <div className="page-grid">
      <section className="page-title">
        <div>
          <span className="eyebrow">Comparison</span>
          <h1>Multi-region forecasting and scenario planning</h1>
        </div>
        <button type="button" onClick={() => addNotification("Scenario exported", "success")}><Download size={16} /> Export</button>
      </section>
      <Card title="Head-to-head metrics" eyebrow="Regions">
        <div className="comparison-table">
          {regions.map((region) => (
            <div key={region.region}>
              <strong>{region.region}</strong>
              <span>Mean {region.mean_aqi}</span>
              <span>P90 {region.p90_aqi}</span>
              <span>{region.dominant_category}</span>
            </div>
          ))}
        </div>
      </Card>
      <section className="analytics-grid two">
        <Card><TimeSeriesChart data={series} /></Card>
        <Card title="Scenario controls" eyebrow="What-if">
          <div className="scenario-panel">
            <SlidersHorizontal />
            <label>Fire activity increase<input type="range" min="0" max="100" defaultValue="50" /></label>
            <label>Wind speed shift<input type="range" min="-30" max="30" defaultValue="0" /></label>
            <label>Urban growth proxy<input type="range" min="0" max="40" defaultValue="12" /></label>
          </div>
        </Card>
      </section>
    </div>
  );
}

