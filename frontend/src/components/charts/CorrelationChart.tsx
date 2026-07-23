import Plot from "react-plotly.js";
import type { FeatureCollection } from "../../types/api";
import { chartLayout } from "./TimeSeriesChart";

export function CorrelationChart({ grid }: { grid: FeatureCollection }) {
  const x = grid.features.map((feature) => Number(feature.properties.fire_intensity ?? 0));
  const y = grid.features.map((feature) => Number(feature.properties.hcho ?? 0));
  return (
    <Plot
      data={[
        {
          x,
          y,
          mode: "markers",
          type: "scatter",
          marker: { color: y, colorscale: "YlOrRd", size: 8, opacity: 0.82 },
          name: "Fire-HCHO"
        }
      ]}
      layout={chartLayout("Fire-HCHO correlation")}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler
    />
  );
}

