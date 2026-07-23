import Plot from "react-plotly.js";
import type { FeatureCollection } from "../../types/api";
import { chartLayout } from "./TimeSeriesChart";

export function DistributionChart({ hotspots }: { hotspots: FeatureCollection }) {
  const counts = hotspots.features.reduce<Record<string, number>>((acc, feature) => {
    const severity = String(feature.properties.severity ?? "minor");
    acc[severity] = (acc[severity] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <Plot
      data={[
        {
          labels: Object.keys(counts),
          values: Object.values(counts),
          type: "pie",
          hole: 0.48,
          marker: { colors: ["#ffd700", "#ff6b6b", "#8b0000"] }
        }
      ]}
      layout={chartLayout("Hotspot severity")}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler
    />
  );
}

