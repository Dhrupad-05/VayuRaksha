import { BookOpen, Share2 } from "lucide-react";
import { SankeyDiagram } from "../components/charts/SankeyDiagram";
import { Card } from "../components/common/Card";

const insights = [
  "Winter inversion risk explains the strongest IGP AQI excursions.",
  "Fire-HCHO coupling peaks before AQI maxima, making it useful as an early warning signal.",
  "Coastal ventilation suppresses severe AQI despite moderate aerosol loads.",
  "Sparse monitoring regions carry wider uncertainty intervals and should be flagged explicitly."
];

export function Insights() {
  return (
    <div className="page-grid">
      <section className="page-title">
        <div>
          <span className="eyebrow">Research</span>
          <h1>Data-driven stories and exportable findings</h1>
        </div>
      </section>
      <div className="insight-grid">
        {insights.map((insight) => (
          <Card key={insight} className="insight-card">
            <BookOpen />
            <p>{insight}</p>
            <button type="button"><Share2 size={14} /> Share</button>
          </Card>
        ))}
      </div>
      <Card><SankeyDiagram /></Card>
      <Card title="Research Exports" eyebrow="Artifacts">
        <div className="button-row">
          <button type="button">Download predictions</button>
          <button type="button">Download features</button>
          <button type="button">Download validation metrics</button>
          <button type="button">Copy BibTeX citation</button>
        </div>
      </Card>
    </div>
  );
}

