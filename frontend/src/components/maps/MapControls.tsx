import { Download, Maximize2, Play } from "lucide-react";
import { useAppStore } from "../../store/appStore";

export function MapControls({ onExport }: { onExport: () => void }) {
  const { addNotification } = useAppStore();
  return (
    <div className="map-controls" aria-label="Map controls">
      <button type="button" onClick={() => addNotification("Temporal animation queued", "info")}>
        <Play size={16} /> Animate
      </button>
      <button type="button" onClick={() => addNotification("Fullscreen view is available in browser zoom", "info")}>
        <Maximize2 size={16} /> Focus
      </button>
      <button type="button" onClick={onExport}>
        <Download size={16} /> Export
      </button>
    </div>
  );
}

