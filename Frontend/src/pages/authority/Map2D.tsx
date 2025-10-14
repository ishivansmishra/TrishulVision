import { motion } from 'framer-motion';
import { FiMap, FiLayers, FiDownload, FiMaximize, FiFilter, FiSearch, FiEdit2, FiCheck, FiRotateCcw, FiTrash2 } from 'react-icons/fi';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import VisualizationWidgets from '@/components/VisualizationWidgets';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.heat';
import { api } from '@/lib/api';

const Map2D = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapboxRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{ heat?: any; dets?: L.GeoJSON; boundary?: L.GeoJSON; illegal?: L.GeoJSON, base?: L.TileLayer, baseAlt?: Record<string, L.TileLayer> } | null>(null);
  const [basemap, setBasemap] = useState<string>('OSM');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Drawing state
  const [drawActive, setDrawActive] = useState(false);
  const [drawCoords, setDrawCoords] = useState<[number, number][]>([]); // [lng,lat]
  const [outsideCount, setOutsideCount] = useState<number | null>(null);
  const [showHeat, setShowHeat] = useState<boolean>(false);

  useEffect(() => {
    if (!mapRef.current || mapboxRef.current) return;
    const map = L.map(mapRef.current, { center: [22.97, 78.65], zoom: 5, preferCanvas: true });
    // basemaps
    const tileUrl = import.meta.env.VITE_LEAFLET_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const osm = L.tileLayer(tileUrl, { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    const carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap, © CARTO' });
    const satellite = L.tileLayer('https://gibs-{s}.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/{time}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg', {
      subdomains: 'abc', attribution: 'NASA GIBS',
      // @ts-ignore custom
      time: new Date().toISOString().slice(0,10),
    } as any);
    layersRef.current = { ...(layersRef.current||{}), base: osm, baseAlt: { OSM: osm, Carto: carto, Satellite: satellite } } as any;
    mapboxRef.current = map;
    setReady(true);
    (async () => {
      try {
        // Heatmap is omitted on this page to keep deps minimal; show detections and boundary overlays
        const dets = await api.listRecentDetections(200);
        const feat = dets.map(d => ({ type: 'Feature', geometry: d.geometry, properties: { id: d.id, label: d.properties?.type || d.properties?.class || 'det' } }));
        const detsLayer = L.geoJSON({ type: 'FeatureCollection', features: feat } as any, {
          style: (f) => ({ color: '#b91c1c', weight: 1, fillColor: '#ef4444', fillOpacity: 0.35 }),
          pointToLayer: (f, latlng) => L.circleMarker(latlng, { radius: 4, color: '#ef4444', opacity: 0.8, fillOpacity: 0.8 }),
        }).addTo(map);
        const boundaryLayer = L.geoJSON(undefined, { style: { color: '#22c55e', weight: 2, dashArray: '2,2', fillColor: '#22c55e', fillOpacity: 0.15 } }).addTo(map);
        const illegalLayer = L.geoJSON(undefined, {
          style: { color: '#b91c1c', weight: 1.2, fillColor: '#ef4444', fillOpacity: 0.45 },
          pointToLayer: (f, latlng) => L.circleMarker(latlng, { radius: 4, color: '#ef4444', opacity: 0.9, fillOpacity: 0.9 }),
        }).addTo(map);
  layersRef.current = { ...(layersRef.current||{}), dets: detsLayer, boundary: boundaryLayer, illegal: illegalLayer } as any;
      } catch (e:any) { setError(e?.message || 'Failed to load overlays'); }
    })();

    // Draw
    const onClick = (e: L.LeafletMouseEvent) => {
      if (!drawActive) return;
      const { lat, lng } = e.latlng;
      const nxt = [...drawCoords, [lng, lat]] as [number, number][];
      setDrawCoords(nxt);
      updateBoundarySource(nxt, false);
    };
    map.on('click', onClick);
    const updateBoundarySource = (coords: [number,number][], close: boolean) => {
      const c = coords.length >= 3 && close ? [...coords, coords[0]] : coords;
      const feature = coords.length >= 2 ? { type:'Feature', geometry: c.length >= 4 ? { type:'Polygon', coordinates:[c] } : { type:'LineString', coordinates: coords }, properties:{} } : null;
      const data = feature ? { type:'FeatureCollection', features:[feature] } : { type:'FeatureCollection', features: [] };
      layersRef.current?.boundary?.clearLayers();
      if (feature) layersRef.current?.boundary?.addData(data as any);
    };
    // @ts-ignore
    (map as any)._updateBoundary = updateBoundarySource;
    return () => { map.off('click', onClick); map.remove(); };
  }, []);

  // Heatmap overlay toggle
  useEffect(() => {
    const map = mapboxRef.current as any; if (!map) return;
    const lr = layersRef.current as any;
    const remove = () => { try { if (lr?.heat) { map.removeLayer(lr.heat); lr.heat = null; } } catch {}
    };
    if (!showHeat) { remove(); return; }
    (async () => {
      try {
        const pts = await api.getHeatmapPoints(1000, 'density');
        const heatData = pts.map(p => [p.lat, p.lng, Math.max(0, Math.min(1, p.intensity/100))]);
        remove();
        lr.heat = (L as any).heatLayer(heatData, { radius: 20, blur: 15, maxZoom: 12, max: 1.0 });
        lr.heat.addTo(map);
      } catch (e:any) {
        setError(e?.message || 'Failed to load heatmap');
        remove();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHeat]);

  const finishPolygon = () => {
    const map = mapboxRef.current as any; if (!map) return;
    if (drawCoords.length < 3) return;
    map._updateBoundary?.(drawCoords, true);
    setDrawActive(false);
  };
  const undoPoint = () => {
    const map = mapboxRef.current as any; if (!map) return;
    const arr = drawCoords.slice(0, -1);
    setDrawCoords(arr);
    map._updateBoundary?.(arr, false);
  };
  const clearBoundary = () => {
    const map = mapboxRef.current as any; if (!map) return;
    setDrawCoords([]);
    setOutsideCount(null);
    try { layersRef.current?.boundary?.clearLayers(); } catch {}
    try { layersRef.current?.illegal?.clearLayers(); } catch {}
  };

  const analyzeBoundary = async () => {
    if (drawCoords.length < 3) return;
    const ring = [...drawCoords, drawCoords[0]];
    const poly = { type: 'Polygon', coordinates: [ring] } as any;
    try {
      const results = await api.queryIllegalByBoundary(poly, 'within', { withCentroid: false });
      const features = results.map((r:any)=> ({ type:'Feature', geometry: r.geometry, properties: { id: r.id } }));
      const gj = { type: 'FeatureCollection', features } as any;
      layersRef.current?.illegal?.clearLayers();
      layersRef.current?.illegal?.addData(gj as any);
      setOutsideCount(results.length);
    } catch (e:any) {
      setError(e?.message || 'Boundary analysis failed');
    }
  };

  // basemap switcher: when state changes, swap layers
  useEffect(() => {
    const map = mapboxRef.current; const lr = layersRef.current; if (!map || !lr?.baseAlt) return;
    try {
      // remove current base layers
      Object.values(lr.baseAlt).forEach((tl) => { try { map.removeLayer(tl); } catch {} });
      const next = lr.baseAlt[basemap] || lr.baseAlt['OSM'];
      next.addTo(map);
    } catch {}
  }, [basemap]);
  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />

      <main className="flex-1 container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">Interactive 2D Map (Leaflet)</h1>
          <p className="text-muted-foreground">
            Comprehensive 2D mapping with boundary overlays and mining area detection
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Layer Control Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FiLayers className="text-primary" />
                  Layer Controls
                </h3>
              </div>

              {/* Boundary Draw Controls */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Boundary Analysis</h4>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={drawActive ? 'default' : 'outline'} onClick={()=> setDrawActive(s=>!s)}>
                    <FiEdit2 className="mr-2" /> {drawActive ? 'Drawing…' : 'Start Drawing'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={finishPolygon} disabled={drawCoords.length < 3}>
                    <FiCheck className="mr-2" /> Finish
                  </Button>
                  <Button size="sm" variant="outline" onClick={undoPoint} disabled={drawCoords.length === 0}>
                    <FiRotateCcw className="mr-2" /> Undo
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearBoundary}>
                    <FiTrash2 className="mr-2" /> Clear
                  </Button>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={analyzeBoundary} disabled={drawCoords.length < 3}>Analyze Outside</Button>
                  {outsideCount !== null && (
                    <div className="text-xs text-muted-foreground self-center">Outside detections: <span className="font-semibold">{outsideCount}</span></div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Basemap</Label>
                  <select className="border rounded h-9 px-2 w-full" value={basemap} onChange={(e)=> setBasemap(e.target.value)}>
                    <option value="OSM">OpenStreetMap</option>
                    <option value="Carto">Carto Light</option>
                    <option value="Satellite">Satellite (GIBS)</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="legal-boundaries">Legal Boundaries</Label>
                  <Switch id="legal-boundaries" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="mining-areas">Mining Areas</Label>
                  <Switch id="mining-areas" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="illegal-zones">Illegal Zones</Label>
                  <Switch id="illegal-zones" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="protected-areas">Protected Areas</Label>
                  <Switch id="protected-areas" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="water-bodies">Water Bodies</Label>
                  <Switch id="water-bodies" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="roads">Roads & Infrastructure</Label>
                  <Switch id="roads" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="forest-cover">Forest Cover</Label>
                  <Switch id="forest-cover" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="satellite-imagery">Satellite Imagery</Label>
                  <Switch id="satellite-imagery" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="heat-overlay">Heatmap Overlay</Label>
                  <Switch id="heat-overlay" checked={showHeat} onCheckedChange={(v)=> setShowHeat(!!v)} />
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <Label className="mb-3 block">Search Location</Label>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="District, GPS coords..." className="pl-10" />
                </div>
              </div>

              <div className="pt-4 border-t border-border space-y-3">
                <h4 className="font-semibold text-sm">Map Actions</h4>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <FiFilter className="mr-2 h-4 w-4" />
                  Apply Filters
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <FiDownload className="mr-2 h-4 w-4" />
                  Export Map
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <FiMaximize className="mr-2 h-4 w-4" />
                  Fullscreen
                </Button>
              </div>

              <div className="pt-4 border-t border-border">
                <h4 className="font-semibold text-sm mb-3">Legend</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-primary rounded"></div>
                    <span>Legal Mining</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-destructive rounded"></div>
                    <span>Illegal Mining</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-accent rounded"></div>
                    <span>Lease Boundary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-secondary rounded"></div>
                    <span>Protected Zone</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Map Viewer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-3"
          >
            <Card className="overflow-hidden">
              <div className="relative h-[800px] bg-muted/20">
                <div ref={mapRef} className="absolute inset-0" />
                {!ready && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-4 max-w-lg mx-auto p-8 bg-background/80 backdrop-blur-sm rounded-xl">
                      <FiMap className="w-20 h-20 mx-auto text-primary" />
                      <h3 className="text-2xl font-bold">2D Interactive Map Viewer</h3>
                      <p className="text-muted-foreground mb-4">Loading Leaflet base map…</p>
                    </div>
                  </div>
                )}

                {/* Map Controls Overlay */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  <div className="bg-card/90 backdrop-blur-sm p-2 rounded-lg shadow-lg">
                    <div className="text-xs font-mono">
                      <div>Lat: 23.4567°N</div>
                      <div>Lng: 85.1234°E</div>
                      <div>Zoom: 12x</div>
                    </div>
                  </div>
                  {error && <div className="bg-destructive text-destructive-foreground text-xs p-2 rounded">{error}</div>}
                </div>

                {/* Info Panel */}
                <div className="absolute bottom-4 left-4 right-4 bg-card/90 backdrop-blur-sm p-4 rounded-lg shadow-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs">Total Mining Sites</div>
                      <div className="text-xl font-bold">247</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Visible in View</div>
                      <div className="text-xl font-bold">18</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Illegal Detected</div>
                      <div className="text-xl font-bold text-destructive">5</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Total Area</div>
                      <div className="text-xl font-bold">1,234 ha</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* LiDAR & Heatmap widgets */}
            <div className="mt-6">
              <VisualizationWidgets />
            </div>
          </motion.div>
        </div>

        {/* Quick Access Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 grid md:grid-cols-3 gap-6"
        >
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <h3 className="font-semibold mb-2">Recent Detections</h3>
            <p className="text-sm text-muted-foreground mb-3">View latest AI-detected mining activity</p>
            <Button size="sm" variant="outline" className="w-full">View Details</Button>
          </Card>
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <h3 className="font-semibold mb-2">Boundary Analysis</h3>
            <p className="text-sm text-muted-foreground mb-3">Compare mining vs authorized boundaries</p>
            <Button size="sm" variant="outline" className="w-full">Analyze</Button>
          </Card>
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <h3 className="font-semibold mb-2">Historical Changes</h3>
            <p className="text-sm text-muted-foreground mb-3">Track mining expansion over time</p>
            <Button size="sm" variant="outline" className="w-full">Compare</Button>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default Map2D;
