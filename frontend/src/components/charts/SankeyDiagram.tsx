import Plot from "react-plotly.js";
import { chartLayout } from "./TimeSeriesChart";

export function SankeyDiagram() {
  return (
    <Plot
      data={[
        {
          type: "sankey",
          node: {
            label: ["Fires", "Urban heat", "Stagnation", "HCHO", "AQI risk"],
            color: ["#ff9f1c", "#4A90E2", "#888888", "#ff6b6b", "#8b0000"]
          },
          link: {
            source: [0, 1, 2, 3],
            target: [3, 4, 4, 4],
            value: [6, 3, 5, 7]
          }
        }
      ]}
      layout={chartLayout("Pollution pathway")}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler
    />
  );
}

