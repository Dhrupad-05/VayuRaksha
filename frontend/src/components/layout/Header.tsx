import { Bell, Menu, Moon, Search, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppStore } from "../../store/appStore";
import type { HealthResponse, MetricsSummary } from "../../types/api";
import { number } from "../../utils/formatting";

interface HeaderProps {
  health?: HealthResponse | null;
  metrics?: MetricsSummary | null;
}

export function Header({ health, metrics }: HeaderProps) {
  const { darkMode, setDarkMode, setSidebarOpen, notifications } = useAppStore();
  return (
    <header className="app-header">
      <div className="header-left">
        <button className="icon-button mobile-only" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
          <Menu size={20} />
        </button>
        <Link className="brand" to="/dashboard" aria-label="VayuRaksha dashboard">
          <span className="brand-mark" />
          <span>
            <strong>VayuRaksha</strong>
            <small>Air intelligence command center</small>
          </span>
        </Link>
      </div>
      <label className="global-search">
        <Search size={18} />
        <input type="search" placeholder="Search city, region, alert..." aria-label="Search city or region" />
      </label>
      <div className="header-actions">
        <div className="live-pill" title={health?.model_version ?? "Model pending"}>
          <span className={health?.artifact_ready ? "pulse-dot" : "pulse-dot warning"} />
          <span>{health?.status ?? "offline"}</span>
          <strong>R2 {number(metrics?.test_r2, 3)}</strong>
        </div>
        <button className="icon-button notification-button" type="button" aria-label="Open notifications">
          <Bell size={19} />
          {notifications.length > 0 && <span>{notifications.length}</span>}
        </button>
        <button className="icon-button" type="button" onClick={() => setDarkMode(!darkMode)} aria-label="Toggle dark mode">
          {darkMode ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        <button className="avatar-button" type="button" aria-label="User settings">VR</button>
      </div>
    </header>
  );
}

