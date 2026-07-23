import { Outlet } from "react-router-dom";
import { useAQIData } from "../../hooks/useAQIData";
import { useAppStore } from "../../store/appStore";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function Layout() {
  const { selectedRegion, darkMode } = useAppStore();
  const { health, metrics } = useAQIData(selectedRegion);
  return (
    <div className={darkMode ? "app dark" : "app"}>
      <Sidebar />
      <div className="app-shell">
        <Header health={health} metrics={metrics} />
        <main className="page-shell">
          <Outlet />
        </main>
        <Footer health={health} />
      </div>
    </div>
  );
}

