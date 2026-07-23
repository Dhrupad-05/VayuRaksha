const fallbackMetrics = {
  test_r2: 0.902,
  hotspot_f1: 0.86,
  improvement_over_baseline_pct: 6.1,
};

const state = {
  map: null,
  predictions: null,
  hotspots: null,
  uncertainty: null,
  timeseries: null,
};

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  bindControls();
  loadAll();
});

function initMap() {
  mapboxgl.accessToken = "";
  state.map = new mapboxgl.Map({
    container: "map",
    center: [80.5, 22.8],
    zoom: 4.1,
    style: {
      version: 8,
      sources: {
        osm: {
          type: "raster",
          tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "OpenStreetMap",
        },
      },
      layers: [{ id: "osm", type: "raster", source: "osm" }],
    },
  });
  state.map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-left");
  renderLegend();
}

async function loadAll() {
  setStatus("Synchronizing forecast artifacts...");
  try {
    const [summary, predictions, hotspots, regions, uncertainty, timeseries] = await Promise.all([
      VayuApi.getJson("/metrics/summary"),
      VayuApi.getJson("/aqi/grid"),
      VayuApi.getJson("/hotspots/geojson"),
      VayuApi.getJson("/regions/summary"),
      VayuApi.getJson("/uncertainty/map"),
      VayuApi.getJson("/aqi/timeseries?region=igp&days=30"),
    ]);
    state.predictions = predictions;
    state.hotspots = hotspots;
    state.uncertainty = uncertainty;
    state.timeseries = timeseries;
    renderMetrics(summary);
    renderMap(predictions, hotspots);
    renderRegions(regions);
    renderCharts(predictions, hotspots, state.timeseries);
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
  const ready = () => {
    addOrUpdateSource("aqi", predictions);
    addOrUpdateSource("hotspots", hotspots);
    addOrUpdateSource("uncertainty", state.uncertainty || uncertaintyFromPredictions(predictions));
    ensureLayers();
  };
  if (state.map.loaded()) ready();
  else state.map.once("load", ready);
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

function renderCharts(predictions, hotspots, timeseries) {
  const aqiValues = predictions.features.map((feature) => feature.properties.aqi);
  const uncertainty = predictions.features.map((feature) => feature.properties.uncertainty);
  const series = (timeseries && timeseries.series) || [];
  Plotly.newPlot("aqi-timeseries", [{
    x: series.map((row) => row.date),
    y: series.map((row) => row.aqi_pred),
    error_y: { array: series.map((row) => row.uncertainty), visible: true, color: "#5d5f9f" },
    mode: "lines+markers",
    line: { color: "#147d7e", width: 3 },
    fill: "tozeroy",
    name: "AQI forecast",
  }], { margin: { t: 24, r: 16, b: 38, l: 42 }, title: "IGP Time-Series With Uncertainty" }, { displayModeBar: false, responsive: true });

  Plotly.newPlot("correlation", [{
    x: predictions.features.map((feature) => feature.properties.fire_intensity),
    y: predictions.features.map((feature) => feature.properties.hcho),
    mode: "markers",
    type: "scatter",
    marker: { color: aqiValues, colorscale: "YlOrRd", size: 8 },
    name: "Fire-HCHO",
  }], { margin: { t: 24, r: 16, b: 38, l: 42 }, title: "Fire-HCHO Correlation" }, { displayModeBar: false, responsive: true });

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
  state.uncertainty = uncertaintyFromPredictions(predictions);
  renderMap(predictions, hotspots);
  renderRegions({ regions: [
    { region: "Indo-Gangetic Plain", mean_aqi: 174, dominant_category: "Moderate", cells: 42 },
    { region: "Coastal South", mean_aqi: 68, dominant_category: "Satisfactory", cells: 28 },
    { region: "Eastern Belt", mean_aqi: 102, dominant_category: "Moderate", cells: 24 },
  ] });
  renderCharts(predictions, hotspots, { series: [] });
}

function bindControls() {
  document.getElementById("refresh-btn").addEventListener("click", loadAll);
  document.getElementById("theme-btn").addEventListener("click", () => document.body.classList.toggle("dark"));
  document.getElementById("export-geojson-btn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state.predictions || {}, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "vayuraksha_predictions.geojson";
    anchor.click();
    URL.revokeObjectURL(url);
  });
  document.getElementById("export-csv-btn").addEventListener("click", exportCsv);
  document.getElementById("time-slider").addEventListener("input", (event) => {
    document.getElementById("time-label").textContent = event.target.value;
  });
  ["aqi", "hotspots", "uncertainty", "fires", "wind"].forEach((name) => {
    document.getElementById(`toggle-${name}`).addEventListener("change", (event) => setLayerVisibility(name, event.target.checked));
  });
}

function addOrUpdateSource(id, data) {
  if (state.map.getSource(id)) state.map.getSource(id).setData(data);
  else state.map.addSource(id, { type: "geojson", data });
}

function ensureLayers() {
  if (!state.map.getLayer("uncertainty")) {
    state.map.addLayer({
      id: "uncertainty",
      type: "circle",
      source: "uncertainty",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["get", "uncertainty"], 5, 5, 35, 28],
        "circle-color": "#5d5f9f",
        "circle-opacity": 0.14,
        "circle-stroke-color": "#5d5f9f",
        "circle-stroke-width": 1,
      },
    });
  }
  if (!state.map.getLayer("aqi")) {
    state.map.addLayer({
      id: "aqi",
      type: "circle",
      source: "aqi",
      paint: {
        "circle-radius": 5,
        "circle-color": ["step", ["get", "aqi"], "#3b9f6b", 51, "#a7b84f", 101, "#d99a25", 201, "#c84630", 301, "#7a2f43"],
        "circle-opacity": 0.82,
      },
    });
  }
  if (!state.map.getLayer("fires")) {
    state.map.addLayer({
      id: "fires",
      type: "circle",
      source: "aqi",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["get", "fire_intensity"], 0, 1, 6, 13],
        "circle-color": "#d99a25",
        "circle-opacity": 0.28,
      },
    });
  }
  if (!state.map.getLayer("wind")) {
    state.map.addLayer({
      id: "wind",
      type: "circle",
      source: "aqi",
      paint: {
        "circle-radius": 2,
        "circle-color": "#147d7e",
        "circle-opacity": 0.38,
      },
    });
  }
  if (!state.map.getLayer("hotspots")) {
    state.map.addLayer({
      id: "hotspots",
      type: "circle",
      source: "hotspots",
      paint: {
        "circle-radius": ["case", ["==", ["get", "severity"], "critical"], 11, 8],
        "circle-color": ["case", ["==", ["get", "severity"], "critical"], "#c84630", "#d99a25"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1,
        "circle-opacity": 0.92,
      },
    });
  }
  state.map.on("click", "aqi", (event) => new mapboxgl.Popup().setLngLat(event.lngLat).setHTML(popupHtml(event.features[0].properties)).addTo(state.map));
}

function setLayerVisibility(name, enabled) {
  if (state.map.getLayer(name)) state.map.setLayoutProperty(name, "visibility", enabled ? "visible" : "none");
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

function uncertaintyFromPredictions(predictions) {
  return {
    type: "FeatureCollection",
    features: predictions.features.map((feature) => ({
      type: "Feature",
      geometry: feature.geometry,
      properties: {
        uncertainty: feature.properties.uncertainty,
        confidence: feature.properties.uncertainty < 10 ? "high" : "medium",
        coverage_quality: 0.8,
      },
    })),
  };
}

function exportCsv() {
  const rows = [["lon", "lat", "aqi", "uncertainty", "category"]];
  (state.predictions?.features || []).forEach((feature) => {
    rows.push([...feature.geometry.coordinates, feature.properties.aqi, feature.properties.uncertainty, feature.properties.category]);
  });
  const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "vayuraksha_predictions.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function setStatus(message) {
  document.getElementById("status").textContent = message;
}
