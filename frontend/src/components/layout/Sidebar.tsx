import { BarChart3, Bell, BookOpen, GitCompare, Info, MapPin, Microscope, Settings, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAppStore } from "../../store/appStore";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/regions", label: "Regional Analysis", icon: MapPin },
  { path: "/methodology", label: "Methodology", icon: Microscope },
  { path: "/alerts", label: "Alerts Center", icon: Bell },
  { path: "/comparison", label: "Comparison", icon: GitCompare },
  { path: "/insights", label: "Insights", icon: BookOpen },
  { path: "/about", label: "About", icon: Info },
  { path: "/admin", label: "Admin Panel", icon: Settings }
];

export function Sidebar() {
  const {
    sidebarOpen,
    setSidebarOpen,
    layersVisible,
    setLayerVisible,
    selectedRegion,
    setSelectedRegion,
    analysisMode,
    setAnalysisMode,
    selectedDay,
    setSelectedDay
  } = useAppStore();
  return (
    <aside className={`app-sidebar ${sidebarOpen ? "open" : ""}`} aria-label="Primary navigation">
      <div className="sidebar-top">
        <strong>Navigation</strong>
        <button className="icon-button mobile-only" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">
          <X size={18} />
        </button>
      </div>
      <nav className="nav-list">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink key={path} to={path} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-section">
        <span className="eyebrow">Layers</span>
        {Object.entries(layersVisible).map(([layer, visible]) => (
          <label className="toggle-row" key={layer}>
            <input type="checkbox" checked={visible} onChange={(event) => setLayerVisible(layer, event.target.checked)} />
            <span>{layer === "hcho" ? "HCHO hotspots" : layer}</span>
          </label>
        ))}
      </div>
      <div className="sidebar-section">
        <label className="field-label" htmlFor="region-select">Region</label>
        <select id="region-select" value={selectedRegion} onChange={(event) => setSelectedRegion(event.target.value)}>
          <option value="igp">Indo-Gangetic Plain</option>
          <option value="south">Coastal South</option>
          <option value="east">Eastern Belt</option>
          <option value="west">Western Corridor</option>
        </select>
      </div>
      <div className="sidebar-section">
        <label className="field-label" htmlFor="mode-select">Analysis mode</label>
        <select id="mode-select" value={analysisMode} onChange={(event) => setAnalysisMode(event.target.value)}>
          <option value="trends">Trends</option>
          <option value="hotspots">Hotspots</option>
          <option value="correlation">Correlation</option>
          <option value="transport">Transport</option>
        </select>
      </div>
      <div className="sidebar-section">
        <label className="field-label" htmlFor="time-range">Forecast day {selectedDay}</label>
        <input id="time-range" type="range" min="1" max="30" value={selectedDay} onChange={(event) => setSelectedDay(Number(event.target.value))} />
      </div>
    </aside>
  );
}

