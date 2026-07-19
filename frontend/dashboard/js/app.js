const fallbackMetrics = {
  test_r2: 0.902,
  hotspot_f1: 0.86,
  improvement_over_baseline_pct: 6.1,
};

const state = {
  map: null,
  aqiLayer: L.layerGroup(),
  hotspotLayer: L.layerGroup(),
  uncertaintyLayer: L.layerGroup(),
  predictions: null,
  hotspots: null,
};

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  bindControls();
  loadAll();
});

function initMap() {
  state.map = L.map("map", { zoomControl: false }).setView([22.8, 80.5], 5);
  L.control.zoom({ position: "bottomleft" }).addTo(state.map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 10,
    attribution: "&copy; OpenStreetMap",
  }).addTo(state.map);
  state.aqiLayer.addTo(state.map);
  state.hotspotLayer.addTo(state.map);
  state.uncertaintyLayer.addTo(state.map);
  renderLegend();
}

async function loadAll() {
  setStatus("Synchronizing forecast artifacts...");
  try {
    const [summary, predictions, hotspots, regions] = await Promise.all([
      VayuApi.getJson("/metrics/summary"),
      VayuApi.getJson("/aqi/grid"),
      VayuApi.getJson("/hotspots/geojson"),
      VayuApi.getJson("/regions/summary"),
    ]);
    state.predictions = predictions;
    state.hotspots = hotspots;
    renderMetrics(summary);
    renderMap(predictions, hotspots);
    renderRegions(regions);
    renderCharts(predictions, hotspots);
    setStatus(`Live API connected at ${VayuApi.API_BASE}`);
  } catch (error) {
    renderMetrics(fallbackMetrics);
    renderFallback();
    setStatus("API unavailable. Showing embedded demo posture; run the training pipeline and API for live artifacts.");
  }
}

function renderMetrics(summary) {
  document.getElementById("metric-r2").textContent = summary.test_r2.toFixed(3);
  document.getElementById("metric-f1").textContent = summary.hotspot_f1.toFixed(3);
  document.getElementById("metric-lift").textContent = `${summary.improvement_over_baseline_pct.toFixed(1)}%`;
}

function renderMap(predictions, hotspots) {
  state.aqiLayer.clearLayers();
  state.hotspotLayer.clearLayers();
  state.uncertaintyLayer.clearLayers();

  predictions.features.forEach((feature) => {
    const [lon, lat] = feature.geometry.coordinates;
    const props = feature.properties;
    L.circleMarker([lat, lon], {
      radius: 5,
      weight: 0,
      fillOpacity: 0.78,
      fillColor: aqiColor(props.aqi),
    }).bindPopup(popupHtml(props)).addTo(state.aqiLayer);

    L.circle([lat, lon], {
      radius: Math.max(15000, props.uncertainty * 1200),
      color: "#5d5f9f",
      weight: 1,
      fillOpacity: 0.03,
    }).addTo(state.uncertaintyLayer);
  });

  hotspots.features.forEach((feature) => {
    const [lon, lat] = feature.geometry.coordinates;
    const props = feature.properties;
    L.circleMarker([lat, lon], {
      radius: props.severity === "critical" ? 11 : 8,
      color: "#ffffff",
      weight: 1,
      fillOpacity: 0.92,
      fillColor: props.severity === "critical" ? "#c84630" : "#d99a25",
    }).bindPopup(`<strong>${props.severity}</strong><br>HCHO ${props.hcho}<br>Score ${props.score}`).addTo(state.hotspotLayer);
  });
}

function renderRegions(regions) {
  const container = document.getElementById("region-list");
  container.innerHTML = "";
  (regions.regions || []).forEach((region) => {
    const item = document.createElement("div");
    item.className = "region-item";
    item.innerHTML = `<span>${region.region}</span><strong>${region.mean_aqi}</strong><span>${region.dominant_category}</span><span>${region.cells} cells</span>`;
    container.appendChild(item);
  });
}

function renderCharts(predictions, hotspots) {
  const aqiValues = predictions.features.map((feature) => feature.properties.aqi);
  const uncertainty = predictions.features.map((feature) => feature.properties.uncertainty);
  Plotly.newPlot("aqi-chart", [
    { x: aqiValues, type: "histogram", marker: { color: "#147d7e" }, name: "AQI" },
    { x: uncertainty, type: "histogram", marker: { color: "#5d5f9f" }, name: "Uncertainty", opacity: 0.55 },
  ], { margin: { t: 24, r: 16, b: 38, l: 42 }, barmode: "overlay", title: "Forecast Distribution" }, { displayModeBar: false, responsive: true });

  const severityCounts = {};
  hotspots.features.forEach((feature) => {
    const severity = feature.properties.severity;
    severityCounts[severity] = (severityCounts[severity] || 0) + 1;
  });
  Plotly.newPlot("hotspot-chart", [{
    labels: Object.keys(severityCounts),
    values: Object.values(severityCounts),
    type: "pie",
    marker: { colors: ["#d99a25", "#c84630", "#7a2f43"] },
  }], { margin: { t: 24, r: 16, b: 24, l: 16 }, title: "Hotspot Severity" }, { displayModeBar: false, responsive: true });
}

function renderFallback() {
  const predictions = { type: "FeatureCollection", features: [] };
  for (let lat = 9; lat <= 35; lat += 3) {
    for (let lon = 70; lon <= 94; lon += 3) {
      const aqi = 55 + Math.max(0, 120 - Math.abs(lat - 28) * 10 - Math.abs(lon - 77) * 4);
      predictions.features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: { aqi, uncertainty: 12, category: aqi > 150 ? "Moderate" : "Satisfactory", aod: .45, hcho: 430, fire_intensity: 1.2 },
      });
    }
  }
  const hotspots = { type: "FeatureCollection", features: [
    { type: "Feature", geometry: { type: "Point", coordinates: [75, 30] }, properties: { severity: "critical", hcho: 780, score: 4.2 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [83, 23] }, properties: { severity: "major", hcho: 650, score: 3.1 } },
  ] };
  renderMap(predictions, hotspots);
  renderRegions({ regions: [
    { region: "Indo-Gangetic Plain", mean_aqi: 174, dominant_category: "Moderate", cells: 42 },
    { region: "Coastal South", mean_aqi: 68, dominant_category: "Satisfactory", cells: 28 },
    { region: "Eastern Belt", mean_aqi: 102, dominant_category: "Moderate", cells: 24 },
  ] });
  renderCharts(predictions, hotspots);
}

function bindControls() {
  document.getElementById("refresh-btn").addEventListener("click", loadAll);
  document.getElementById("export-btn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state.predictions || {}, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "vayuraksha_predictions.geojson";
    anchor.click();
    URL.revokeObjectURL(url);
  });
  document.getElementById("toggle-aqi").addEventListener("change", (event) => toggleLayer(state.aqiLayer, event.target.checked));
  document.getElementById("toggle-hotspots").addEventListener("change", (event) => toggleLayer(state.hotspotLayer, event.target.checked));
  document.getElementById("toggle-uncertainty").addEventListener("change", (event) => toggleLayer(state.uncertaintyLayer, event.target.checked));
}

function toggleLayer(layer, enabled) {
  if (enabled) layer.addTo(state.map);
  else state.map.removeLayer(layer);
}

function aqiColor(aqi) {
  if (aqi <= 50) return "#3b9f6b";
  if (aqi <= 100) return "#a7b84f";
  if (aqi <= 200) return "#d99a25";
  if (aqi <= 300) return "#c84630";
  return "#7a2f43";
}

function popupHtml(props) {
  return `<strong>AQI ${props.aqi}</strong><br>${props.category}<br>AOD ${props.aod}<br>HCHO ${props.hcho}<br>Uncertainty +/- ${props.uncertainty}`;
}

function renderLegend() {
  document.getElementById("legend").innerHTML = "Good &lt;50<br>Satisfactory 51-100<br>Moderate 101-200<br>Poor 201-300<br>Very Poor 300+";
}

function setStatus(message) {
  document.getElementById("status").textContent = message;
}

