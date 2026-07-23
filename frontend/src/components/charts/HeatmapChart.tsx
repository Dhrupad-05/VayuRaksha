import Plot from "react-plotly.js";
import { chartLayout } from "./TimeSeriesChart";

export function HeatmapChart() {
  const z = Array.from({ length: 7 }, (_, row) => Array.from({ length: 12 }, (_, col) => 55 + row * 12 + Math.sin(col / 2) * 24));
  return (
    <Plot
      data={[{ z, type: "heatmap", colorscale: "YlOrRd", showscale: false }]}
      layout={chartLayout("Seasonal AQI persistence")}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler
    />
  );
}

