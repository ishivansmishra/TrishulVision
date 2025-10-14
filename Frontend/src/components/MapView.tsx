import { useEffect, useImperativeHandle, useRef, forwardRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';

export type MapViewHandle = {
  fitBounds: (bbox: [number, number, number, number]) => void;
};

type FeatureItem = { geometry: any; centroid?: any };

// Leaflet Map component with draw/edit and clustering
export const MapView = forwardRef<MapViewHandle, { boundary?: any; features: FeatureItem[]; onDraw_change?: (geojson: any) => void }>(function MapView({ boundary, features, onDraw_change }, ref) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapRefInst = useRef<L.Map | null>(null);
  const layersRef = useRef<{ boundary?: L.GeoJSON; polys?: L.GeoJSON; points?: L.LayerGroup } | null>(null);
  const [drawActive, setDrawActive] = useState(false);
  const [drawCoords, setDrawCoords] = useState<[number, number][]>([]);

  // init map
  useEffect(() => {
    if (!mapRef.current || mapRefInst.current) return;
    const map = L.map(mapRef.current, {
      center: [22.97, 78.65],
      zoom: 5,
      preferCanvas: true,
    });
    const tileUrl = import.meta.env.VITE_LEAFLET_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    L.tileLayer(tileUrl, { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    mapRefInst.current = map;

    // layers
    const boundaryLayer = L.geoJSON(undefined, {
      style: { color: '#22c55e', weight: 2, fillColor: '#22c55e', fillOpacity: 0.15 },
    }).addTo(map);
    const polysLayer = L.geoJSON(undefined, {
      style: { color: '#b91c1c', weight: 1, fillColor: '#ef4444', fillOpacity: 0.35 },
    }).addTo(map);
  // cluster group for points
  const pointsGroup: L.LayerGroup = (L as any).markerClusterGroup ? ((L as any).markerClusterGroup() as L.LayerGroup) : L.layerGroup();
  pointsGroup.addTo(map);
    layersRef.current = { boundary: boundaryLayer, polys: polysLayer, points: pointsGroup };

    // draw interaction
  const onClick = (e: L.LeafletMouseEvent) => {
      if (!drawActive) return;
      const { lat, lng } = e.latlng;
      const next = [...drawCoords, [lng, lat]] as [number, number][];
      setDrawCoords(next);
      updateBoundarySource(next, false);
    };
    map.on('click', onClick);

    const updateBoundarySource = (coords: [number, number][], close: boolean) => {
      const closed = coords.length >= 3 && close ? [...coords, coords[0]] : coords;
      const feature = coords.length >= 2 ? ({ type: 'Feature', geometry: closed.length >= 4 ? { type: 'Polygon', coordinates: [closed] } : { type: 'LineString', coordinates: coords }, properties: {} }) : null;
      const fc = feature ? { type: 'FeatureCollection', features: [feature] } : { type: 'FeatureCollection', features: [] };
      boundaryLayer.clearLayers();
      if (fc.features.length) boundaryLayer.addData(fc as any);
    };
    // @ts-ignore attach helper
    (map as any)._updateBoundary = updateBoundarySource;

    return () => { map.off('click', onClick); map.remove(); };
  }, [drawActive, drawCoords]);

  // update sources from props
  useEffect(() => {
    const map = mapRefInst.current; if (!map) return;
    const layers = layersRef.current; if (!layers) return;
    // boundary
    layers.boundary?.clearLayers();
    if (boundary) {
      layers.boundary?.addData(boundary as any);
      const bbox = geojsonBbox(boundary);
      if (bbox) {
  const sw: L.LatLngExpression = [bbox[1], bbox[0]];
  const ne: L.LatLngExpression = [bbox[3], bbox[2]];
        map.fitBounds([sw, ne], { padding: [20,20] });
      }
    }
    // features
    layers.polys?.clearLayers();
    layers.points?.clearLayers();
    const polys = features.filter(f => f.geometry?.type && f.geometry.type !== 'Point').map(f => ({ type:'Feature', properties:{}, geometry: f.geometry }));
    if (polys.length) layers.polys?.addData({ type:'FeatureCollection', features: polys } as any);
    const points = features.filter(f => f.geometry?.type === 'Point').map(f => ({ type:'Feature', properties:{}, geometry: f.geometry }));
    points.forEach(p => {
      const [lng, lat] = (p.geometry.coordinates || []) as [number, number];
      if (typeof lat === 'number' && typeof lng === 'number') {
        L.circleMarker([lat, lng], { radius: 5, color: '#ef4444', opacity: 0.9, fillOpacity: 0.9 }).addTo(layers.points!);
      }
    });
  }, [boundary, JSON.stringify(features)]);

  // expose fitBounds
  useImperativeHandle(ref, () => ({
    fitBounds: (bbox: [number, number, number, number]) => {
      const map = mapRefInst.current; if (!map) return;
      try {
  const sw: L.LatLngExpression = [bbox[1], bbox[0]];
  const ne: L.LatLngExpression = [bbox[3], bbox[2]];
        map.fitBounds([sw, ne], { padding: [20,20] });
      } catch {}
    }
  }), []);

  const finishPolygon = () => {
    const map = mapRefInst.current as any; if (!map) return;
    if (drawCoords.length < 3) return;
    map._updateBoundary?.(drawCoords, true);
    setDrawActive(false);
    const fc = { type: 'FeatureCollection', features: [{ type:'Feature', properties:{}, geometry: { type:'Polygon', coordinates: [[...drawCoords, drawCoords[0]]] } }] };
    onDraw_change?.(fc);
  };
  const undoPoint = () => {
    const map = mapRefInst.current as any; if (!map) return;
    const arr = drawCoords.slice(0,-1);
    setDrawCoords(arr);
    map._updateBoundary?.(arr, false);
  };
  const clearBoundary = () => {
    const map = mapRefInst.current as any; if (!map) return;
    setDrawCoords([]);
    try { layersRef.current?.boundary?.clearLayers(); } catch {}
    onDraw_change?.({ type:'FeatureCollection', features: [] });
  };

  return (
    <div className="relative">
  <div ref={mapRef} className="w-full h-96 rounded-lg border border-border" />
      <div className="absolute top-2 left-2 bg-card/90 border border-border rounded p-2 flex gap-2 text-xs">
        <button className="px-2 py-1 border border-border rounded" onClick={()=> setDrawActive(v=>!v)}>{drawActive ? 'Drawing…' : 'Draw'}</button>
        <button className="px-2 py-1 border border-border rounded" onClick={finishPolygon} disabled={drawCoords.length < 3}>Finish</button>
        <button className="px-2 py-1 border border-border rounded" onClick={undoPoint} disabled={drawCoords.length === 0}>Undo</button>
        <button className="px-2 py-1 border border-border rounded" onClick={clearBoundary}>Clear</button>
      </div>
    </div>
  );
});

function geojsonBbox(gj: any): [number, number, number, number] | null {
  try {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const visit = (geom: any) => {
      if (!geom) return;
      const coords: any = geom.coordinates;
      const recur = (c: any) => {
        if (typeof c[0] === 'number' && typeof c[1] === 'number') {
          const x = c[0], y = c[1];
          if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y;
        } else if (Array.isArray(c)) { c.forEach(recur); }
      };
      recur(coords);
    };
    const feats = gj.type === 'FeatureCollection' ? gj.features : gj.type === 'Feature' ? [gj] : [];
    feats.forEach((f: any) => visit(f.geometry));
    if (minX === Infinity) return null;
    return [minX, minY, maxX, maxY];
  } catch { return null; }
}
