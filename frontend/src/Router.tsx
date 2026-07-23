import { Navigate, createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { About } from "./pages/About";
import { AdminPanel } from "./pages/AdminPanel";
import { AlertsCenter } from "./pages/AlertsCenter";
import { Comparison } from "./pages/Comparison";
import { Dashboard } from "./pages/Dashboard";
import { Insights } from "./pages/Insights";
import { Methodology } from "./pages/Methodology";
import { RegionalAnalysis } from "./pages/RegionalAnalysis";

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Navigate to="/dashboard" replace /> },
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/regions", element: <RegionalAnalysis /> },
      { path: "/methodology", element: <Methodology /> },
      { path: "/alerts", element: <AlertsCenter /> },
      { path: "/comparison", element: <Comparison /> },
      { path: "/insights", element: <Insights /> },
      { path: "/about", element: <About /> },
      { path: "/admin", element: <AdminPanel /> }
    ]
  }
]);

