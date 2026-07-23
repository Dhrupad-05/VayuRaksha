import { RouterProvider } from "react-router-dom";
import { router } from "./Router";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { NotificationCenter } from "./components/common/Notification";

export function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <NotificationCenter />
    </ErrorBoundary>
  );
}

