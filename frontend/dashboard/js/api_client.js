const API_BASE = window.localStorage.getItem("vayurakshaApiBase") || "http://127.0.0.1:8000";

async function getJson(path) {
  const response = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path} ${response.status}`);
  return response.json();
}

window.VayuApi = { getJson, API_BASE };

