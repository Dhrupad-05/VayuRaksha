import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import { useAppStore } from "../../store/appStore";
import type { FeatureCollection } from "../../types/api";
import { aqiColor } from "../../utils/colors";
import { MapControls } from "./MapControls";
import { MapLegend } from "./MapLegend";

interface LeafletMapProps {
  grid: FeatureCollection;
  hotspots: FeatureCollection;
  uncertainty?: FeatureCollection | null;
}

export function LeafletMap({ grid, hotspots, uncertainty }: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layers = useRef<Record<string, L.LayerGroup>>({});
  const { layersVisible, addNotification } = useAppStore();

  const visibleGrid = useMemo(() => grid.features.filter((feature) => Number(feature.properties.aqi ?? 0) >= 0), [grid]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [23.5, 82.5],
      zoom: 4,
      maxBounds: [
        [6.5, 68.5],
        [35.8, 97.8]
      ],
      maxBoundsViscosity: 1,
      attributionControl: true
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "OpenStreetMap, CartoDB",
      maxZoom: 12,
      opacity: 0.92
    }).addTo(map);
    L.rectangle(
      [
        [6.5, 68.5],
        [35.8, 97.8]
      ],
      { color: "#8b9bb4", weight: 1, fillOpacity: 0 }
    ).addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 50);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.values(layers.current).forEach((layer) => layer.removeFrom(map));
    layers.current = {
      uncertainty: L.layerGroup(),
      aqi: L.layerGroup(),
      fires: L.layerGroup(),
      hcho: L.layerGroup(),
      wind: L.layerGroup(),
      transport: L.layerGroup()
    };

    (uncertainty?.features ?? grid.features).forEach((feature) => {
      const [lon, lat] = feature.geometry.coordinates;
      const sigma = Number(feature.properties.uncertainty ?? 12);
      L.circle([lat, lon], {
        radius: Math.max(12000, sigma * 1200),
        color: "#4A90E2",
        weight: 1,
        fillOpacity: 0.05,
        opacity: 0.35
      }).addTo(layers.current.uncertainty);
    });

    visibleGrid.forEach((feature) => {
      const [lon, lat] = feature.geometry.coordinates;
      const aqi = Number(feature.properties.aqi ?? 0);
      const uncertaintyValue = Number(feature.properties.uncertainty ?? 0);
      const fire = Number(feature.properties.fire_intensity ?? 0);
      const hcho = Number(feature.properties.hcho ?? 0);
      L.circleMarker([lat, lon], {
        radius: Math.min(14, Math.max(4, aqi / 28)),
        fillColor: aqiColor(aqi),
        color: "#ffffff",
        weight: 0.5,
        opacity: 0.9,
        fillOpacity: 0.76
      })
        .bindPopup(
          `<strong>AQI ${aqi.toFixed(1)} ± ${uncertaintyValue.toFixed(1)}</strong><br/>HCHO ${hcho.toFixed(0)}<br/>Fire ${fire.toFixed(1)}`
        )
        .addTo(layers.current.aqi);
      if (fire > 0.5) {
        L.circleMarker([lat, lon], {
          radius: Math.min(12, 3 + fire * 1.5),
          fillColor: "#ff9f1c",
          color: "#0a0e27",
          weight: 1,
          fillOpacity: 0.55
        }).addTo(layers.current.fires);
      }
      L.polyline(
        [
          [lat, lon],
          [lat + 0.25, lon + 0.45]
        ],
        { color: "#8fd3ff", weight: 1, opacity: 0.42 }
      ).addTo(layers.current.wind);
    });

    hotspots.features.forEach((feature) => {
      const [lon, lat] = feature.geometry.coordinates;
      const severity = String(feature.properties.severity ?? "minor");
      L.circleMarker([lat, lon], {
        radius: severity === "critical" ? 12 : severity === "major" ? 10 : 7,
        fillColor: severity === "critical" ? "#8b0000" : "#ff6b6b",
        color: "#ffffff",
        weight: 1,
        fillOpacity: 0.86
      })
        .bindPopup(`<strong>HCHO hotspot</strong><br/>Severity: ${severity}<br/>Score: ${feature.properties.score ?? "--"}`)
        .addTo(layers.current.hcho);
      L.polyline(
        [
          [lat, lon],
          [lat + 0.5, lon + 0.85]
        ],
        { color: "#ff6b6b", weight: 2, opacity: 0.35, dashArray: "6 8" }
      ).addTo(layers.current.transport);
    });

    Object.entries(layers.current).forEach(([key, layer]) => {
      if (layersVisible[key]) layer.addTo(map);
    });
    setTimeout(() => map.invalidateSize(), 50);
  }, [grid, hotspots, uncertainty, layersVisible, visibleGrid]);

  function exportGeoJson() {
    const blob = new Blob([JSON.stringify(grid, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "vayuraksha-aqi-grid.geojson";
    anchor.click();
    URL.revokeObjectURL(url);
    addNotification("GeoJSON exported", "success");
  }

  return (
    <section className="map-container" aria-label="AQI forecast map">
      <div ref={containerRef} id="map" className="leaflet-map" />
      <MapControls onExport={exportGeoJson} />
      <MapLegend />
    </section>
  );
}

