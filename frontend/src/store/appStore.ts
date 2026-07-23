import { create } from "zustand";

type ToastType = "info" | "error" | "success" | "warning";

interface AppState {
  darkMode: boolean;
  sidebarOpen: boolean;
  selectedRegion: string;
  selectedDay: number;
  severityRange: [number, number];
  analysisMode: string;
  layersVisible: Record<string, boolean>;
  notifications: Array<{ id: string; message: string; type: ToastType }>;
  setDarkMode: (value: boolean) => void;
  setSidebarOpen: (value: boolean) => void;
  setSelectedRegion: (region: string) => void;
  setSelectedDay: (day: number) => void;
  setSeverityRange: (range: [number, number]) => void;
  setAnalysisMode: (mode: string) => void;
  setLayerVisible: (layer: string, visible: boolean) => void;
  addNotification: (message: string, type?: ToastType) => void;
  removeNotification: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  darkMode: true,
  sidebarOpen: true,
  selectedRegion: "igp",
  selectedDay: 30,
  severityRange: [0, 500],
  analysisMode: "trends",
  layersVisible: {
    aqi: true,
    hcho: true,
    uncertainty: true,
    fires: true,
    wind: false,
    transport: true
  },
  notifications: [],
  setDarkMode: (value) => set({ darkMode: value }),
  setSidebarOpen: (value) => set({ sidebarOpen: value }),
  setSelectedRegion: (region) => set({ selectedRegion: region }),
  setSelectedDay: (day) => set({ selectedDay: day }),
  setSeverityRange: (range) => set({ severityRange: range }),
  setAnalysisMode: (mode) => set({ analysisMode: mode }),
  setLayerVisible: (layer, visible) =>
    set((state) => ({ layersVisible: { ...state.layersVisible, [layer]: visible } })),
  addNotification: (message, type = "info") =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { id: crypto.randomUUID?.() ?? String(Date.now()), message, type }
      ].slice(-5)
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id)
    }))
}));

