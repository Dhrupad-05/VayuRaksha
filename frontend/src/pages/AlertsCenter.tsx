import { BellRing, Flame, RadioTower, ShieldAlert } from "lucide-react";
import { Card } from "../components/common/Card";
import { useAppStore } from "../store/appStore";

const alerts = [
  { title: "Punjab-Haryana fire transport", severity: "critical", icon: Flame, detail: "HCHO and fire lag terms exceed major threshold." },
  { title: "IGP uncertainty watch", severity: "major", icon: ShieldAlert, detail: "Low ventilation index increases interval width." },
  { title: "API model artifact healthy", severity: "info", icon: RadioTower, detail: "Latest championship artifacts available." }
];

export function AlertsCenter() {
  const { addNotification } = useAppStore();
  return (
    <div className="page-grid">
      <section className="page-title">
        <div>
          <span className="eyebrow">Alerts</span>
          <h1>Real-time monitoring and notification center</h1>
        </div>
        <button type="button" onClick={() => addNotification("Alert policy saved", "success")}><BellRing size={16} /> Save policy</button>
      </section>
      <div className="alert-grid">
        {alerts.map(({ title, severity, icon: Icon, detail }) => (
          <Card key={title} className={`alert-card ${severity}`}>
            <Icon />
            <span className="eyebrow">{severity}</span>
            <h2>{title}</h2>
            <p>{detail}</p>
          </Card>
        ))}
      </div>
      <Card title="Alert Configuration" eyebrow="Thresholds">
        <div className="settings-grid">
          <label>Critical AQI threshold<input type="number" defaultValue={200} /></label>
          <label>Hotspot score threshold<input type="number" defaultValue={3.2} step="0.1" /></label>
          <label>Uncertainty threshold<input type="number" defaultValue={25} /></label>
          <label>Webhook URL<input type="url" placeholder="https://ops.example.com/webhook" /></label>
        </div>
      </Card>
    </div>
  );
}

