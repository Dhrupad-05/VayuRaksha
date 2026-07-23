import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          charts: ["plotly.js", "react-plotly.js"],
          maps: ["leaflet"],
          state: ["zustand", "axios", "lucide-react"]
        }
      }
    }
  },
  server: {
    proxy: {
      "/health": "http://127.0.0.1:8000",
      "/metrics": "http://127.0.0.1:8000",
      "/aqi": "http://127.0.0.1:8000",
      "/hotspots": "http://127.0.0.1:8000",
      "/uncertainty": "http://127.0.0.1:8000",
      "/regions": "http://127.0.0.1:8000",
      "/model": "http://127.0.0.1:8000",
      "/prometheus": "http://127.0.0.1:8000"
    }
  }
});
