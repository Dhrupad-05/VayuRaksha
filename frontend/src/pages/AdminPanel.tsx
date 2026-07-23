import { Activity, DatabaseZap, RefreshCw, ServerCog } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "../components/common/Card";
import { useAQIData } from "../hooks/useAQIData";
import { number } from "../utils/formatting";

export function AdminPanel() {
  const { metrics, health } = useAQIData();
  return (
    <div className="page-grid">
      <section className="page-title">
        <div>
          <span className="eyebrow">Private Ops</span>
          <h1>System health, model management, and data quality</h1>
        </div>
      </section>
      <div className="method-grid">
        <Card><AdminStat icon={<ServerCog />} label="API status" value={health?.status ?? "fallback"} /></Card>
        <Card><AdminStat icon={<Activity />} label="Model R2" value={number(metrics?.test_r2, 3)} /></Card>
        <Card><AdminStat icon={<DatabaseZap />} label="Artifact ready" value={health?.artifact_ready ? "yes" : "no"} /></Card>
        <Card><AdminStat icon={<RefreshCw />} label="Retraining cadence" value="weekly" /></Card>
      </div>
      <Card title="Data quality gates" eyebrow="Validation">
        <div className="check-grid">
          <span>✓ Temporal split non-overlap</span>
          <span>✓ Range validation</span>
          <span>✓ Spatial anomalies</span>
          <span>✓ Temporal spikes</span>
          <span>✓ Coverage quality</span>
          <span>✓ Checksum cache</span>
        </div>
      </Card>
    </div>
  );
}

function AdminStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="method-card">
      <div className="kpi-icon">{icon}</div>
      <span>{label}</span>
      <h2>{value}</h2>
    </div>
  );
}
