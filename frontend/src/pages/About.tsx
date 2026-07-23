import { Github, Mail, Satellite } from "lucide-react";
import { Card } from "../components/common/Card";

export function About() {
  return (
    <div className="page-grid">
      <section className="about-hero">
        <Satellite size={42} />
        <span className="eyebrow">About VayuRaksha</span>
        <h1>Satellite-scale air intelligence for public resilience</h1>
        <p>VayuRaksha extends sparse ground air-quality observations with satellite, fire, weather, and ML uncertainty intelligence.</p>
      </section>
      <section className="analytics-grid two">
        <Card title="Mission">
          <p>Make AQI prediction interpretable, actionable, and honest about uncertainty for policymakers, researchers, journalists, and citizens.</p>
        </Card>
        <Card title="Technology Stack">
          <p>FastAPI, PyTorch CNN-LSTM, XGBoost, React, Leaflet, Plotly, Vite, and production-oriented artifact serving.</p>
        </Card>
      </section>
      <Card title="Contact & Credits" eyebrow="Engagement">
        <div className="button-row">
          <button type="button"><Mail size={16} /> Contact team</button>
          <button type="button"><Github size={16} /> GitHub</button>
          <button type="button">Data attribution</button>
          <button type="button">Privacy & disclaimer</button>
        </div>
      </Card>
    </div>
  );
}

