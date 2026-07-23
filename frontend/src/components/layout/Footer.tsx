import type { HealthResponse } from "../../types/api";

export function Footer({ health }: { health?: HealthResponse | null }) {
  return (
    <footer className="app-footer">
      <span>Data products: INSAT, TROPOMI, FIRMS, ERA5, CPCB-ready adapters</span>
      <span>Model: {health?.model_version ?? "offline fallback"}</span>
      <span>Health advisory output is decision support, not medical advice.</span>
    </footer>
  );
}

