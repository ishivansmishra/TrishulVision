import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { I18nProvider } from "./context/I18nContext";
import { AoiProvider } from "./context/AoiContext";
import "./index.css";
// Ensure Cesium widgets are styled and assets load correctly
import "cesium/Build/Cesium/Widgets/widgets.css";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// Fallback for Cesium base URL (vite-plugin-cesium should set this, but we guard against misconfig)
declare global {
	interface Window { CESIUM_BASE_URL?: string }
}
if (typeof window !== 'undefined' && !window.CESIUM_BASE_URL) {
	window.CESIUM_BASE_URL = "/cesium";
}

createRoot(document.getElementById("root")!).render(
	<I18nProvider>
		<AoiProvider>
			<App />
		</AoiProvider>
	</I18nProvider>
);
