declare module 'leaflet.heat';

declare module 'leaflet-image' {
	import * as L from 'leaflet';
	const leafletImage: (map: L.Map, cb: (err: any, canvas: HTMLCanvasElement) => void) => void;
	export default leafletImage;
}

// Ensure the plugin module can be imported for its side effects
declare module 'leaflet.markercluster' {
	import 'leaflet';
}

// Augment the global L namespace with MarkerCluster types without clobbering the leaflet module
declare global {
	namespace L {
		class MarkerClusterGroup extends L.LayerGroup {
			constructor(options?: any);
			addLayer(layer: L.Layer): this;
			removeLayer(layer: L.Layer): this;
			clearLayers(): this;
			getVisibleParent(marker: L.Marker): L.Marker | null;
			refreshClusters(): this;
		}

		function markerClusterGroup(options?: any): L.MarkerClusterGroup;
	}
}

declare module 'leaflet-draw';
