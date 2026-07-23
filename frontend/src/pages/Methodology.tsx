import { BrainCircuit, Database, LineChart, Sigma } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { HeatmapChart } from "../components/charts/HeatmapChart";
import { SankeyDiagram } from "../components/charts/SankeyDiagram";
import { Card } from "../components/common/Card";
import { getModelCard } from "../utils/api";

export function Methodology() {
  const [modelCard, setModelCard] = useState<Record<string, unknown>>({});
  useEffect(() => {
    getModelCard().then(setModelCard);
  }, []);
  const featureCount = Number(modelCard.feature_count ?? 55);
  return (
    <div className="page-grid">
      <section className="page-title">
        <div>
          <span className="eyebrow">Transparency</span>
          <h1>Model, features, uncertainty, and validation</h1>
        </div>
      </section>
      <div className="method-grid">
        <Card><Method icon={<BrainCircuit />} title="CNN-LSTM primary" text="Depthwise separable convolutions, SE blocks, BiLSTM, multihead attention, location embeddings, and dual AQI/sigma heads." /></Card>
        <Card><Method icon={<LineChart />} title="XGBoost secondary" text="Fast gradient boosting baseline validates tabular satellite-weather signal and feeds the production meta blend." /></Card>
        <Card><Method icon={<Sigma />} title="Uncertainty" text="Gaussian NLL learns aleatoric confidence, while MC dropout estimates epistemic model doubt for map halos." /></Card>
        <Card><Method icon={<Database />} title={`${featureCount} features`} text="Satellite lags, fire recency, BLH stability, IGP/coastal effects, seasonal flags, and composite transport terms." /></Card>
      </div>
      <section className="analytics-grid two">
        <Card><SankeyDiagram /></Card>
        <Card><HeatmapChart /></Card>
      </section>
      <Card title="Gotcha Prevention" eyebrow="Production discipline">
        <div className="check-grid">
          {["Temporal leakage", "NaN/outlier ranges", "Spatial Laplacian anomalies", "Temporal spike detection", "Artifact checksum cache", "Prediction interval coverage", "Sparse region flags", "Fire transport lag"].map((item) => (
            <span key={item}>✓ {item}</span>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Method({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="method-card">
      <div className="kpi-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}
