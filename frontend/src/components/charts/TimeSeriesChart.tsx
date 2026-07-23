import Plot from "react-plotly.js";
import type { TimeSeriesPoint } from "../../types/api";

export function TimeSeriesChart({ data }: { data: TimeSeriesPoint[] }) {
  return (
    <Plot
      data={[
        {
          x: data.map((point) => point.date),
          y: data.map((point) => point.aqi_pred),
          error_y: { array: data.map((point) => point.uncertainty), visible: true, color: "#4A90E2" },
          fill: "tozeroy",
          mode: "lines+markers",
          line: { color: "#1a9850", width: 3 },
          marker: { size: 5 },
          name: "AQI forecast",
          type: "scatter"
        }
      ]}
      layout={chartLayout("AQI time-series with uncertainty")}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler
    />
  );
}

export function chartLayout(title: string) {
  return {
    title: { text: title, font: { color: "#ffffff", size: 14 } },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#c9d4e4" },
    margin: { t: 42, r: 16, b: 38, l: 42 },
    xaxis: { gridcolor: "rgba(255,255,255,0.08)" },
    yaxis: { gridcolor: "rgba(255,255,255,0.08)" }
  };
}

