import { MapPin, ShieldAlert, ThermometerSun, Wind } from "lucide-react";
import { HeatmapChart } from "../components/charts/HeatmapChart";
import { TimeSeriesChart } from "../components/charts/TimeSeriesChart";
import { Card } from "../components/common/Card";
import { LeafletMap } from "../components/maps/LeafletMap";
import { useAQIData } from "../hooks/useAQIData";
import { useAppStore } from "../store/appStore";
import { fallbackGrid, fallbackHotspots } from "../utils/fallbackData";
import { number } from "../utils/formatting";

export function RegionalAnalysis() {
  const { selectedRegion } = useAppStore();
  const { grid, hotspots, uncertainty, regions, series } = useAQIData(selectedRegion);
  const active = regions[0];
  return (
    <div className="page-grid">
      <section className="regional-hero">
        <span className="eyebrow">Regional Analysis</span>
        <h1>{active?.region ?? "Indo-Gangetic Plain"}</h1>
        <p>Focused regional risk profile with AQI trend, hotspot drivers, and health-facing interpretation.</p>
        <div className="hero-metrics">
          <span><MapPin size={16} /> {active?.cells ?? 0} cells</span>
          <span><ThermometerSun size={16} /> Mean AQI {number(active?.mean_aqi)}</span>
          <span><ShieldAlert size={16} /> {active?.dominant_category ?? "Moderate"}</span>
          <span><Wind size={16} /> Stagnation watch</span>
        </div>
      </section>
      <div className="two-column">
        <Card title="Regional map" eyebrow="Spatial detail">
          <LeafletMap grid={grid ?? fallbackGrid} hotspots={hotspots ?? fallbackHotspots} uncertainty={uncertainty} />
        </Card>
        <Card title="Health Advisory" eyebrow="Decision support">
          <div className="advisory">
            <strong>Moderate to poor risk window</strong>
            <p>Outdoor exertion should be reduced for sensitive groups during stagnant wind periods. Fire transport and HCHO anomalies are the primary watch factors.</p>
            <ul>
              <li>Schools: morning activity review</li>
              <li>Hospitals: respiratory case readiness</li>
              <li>Operations: verify hotspot escalation alerts</li>
            </ul>
          </div>
        </Card>
      </div>
      <section className="analytics-grid two">
        <Card><TimeSeriesChart data={series} /></Card>
        <Card><HeatmapChart /></Card>
      </section>
    </div>
  );
}

