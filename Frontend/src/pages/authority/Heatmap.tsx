import { motion } from 'framer-motion';
import { FiMap, FiDownload, FiMaximize } from 'react-icons/fi';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import VisualizationWidgets from '@/components/VisualizationWidgets';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
// @ts-ignore
import leafletImage from 'leaflet-image';
import { api } from '@/lib/api';

const Heatmap = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapboxRef = useRef<L.Map | null>(null);
  const [points, setPoints] = useState<Array<{ lat:number; lng:number; intensity:number }>>([]);
  const [basemap, setBasemap] = useState<string>('OSM');
  const baseLayersRef = useRef<Record<string, L.TileLayer> | null>(null);
  const [threshold, setThreshold] = useState<number>(70);
  const [type, setType] = useState<string>('density');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current || mapboxRef.current) return;
    const map = L.map(mapRef.current, { center: [22.97, 78.65], zoom: 5, preferCanvas: true });
    const tileUrl = import.meta.env.VITE_LEAFLET_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const osm = L.tileLayer(tileUrl, { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    const carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap, © CARTO' });
    const satellite = L.tileLayer('https://gibs-{s}.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/{time}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg', {
      subdomains: 'abc', attribution: 'NASA GIBS',
      // @ts-ignore custom time
      time: new Date().toISOString().slice(0,10),
    } as any);
    baseLayersRef.current = { OSM: osm, Carto: carto, Satellite: satellite };
    mapboxRef.current = map;
    setReady(true);
    return () => { map.remove(); };
  }, []);

  // Update heat source whenever points or threshold change
  useEffect(() => {
    const map = mapboxRef.current as any; if (!map) return;
    try {
      const filtered = points.filter(p => p.intensity >= threshold);
      // Remove old layer
      if (map._tvHeatLayer) { map.removeLayer(map._tvHeatLayer); map._tvHeatLayer = null; }
      const heatData = filtered.map(p => [p.lat, p.lng, Math.max(0, Math.min(1, p.intensity/100))]);
      const heat = (L as any).heatLayer(heatData, { radius: 20, blur: 15, maxZoom: 12, max: 1.0 });
      heat.addTo(map);
      map._tvHeatLayer = heat;
    } catch (e:any) {
      setError(e?.message || 'Failed to render heatmap');
    }
  }, [JSON.stringify(points), threshold]);

  const load = async () => {
    try {
      const pts = await api.getHeatmapPoints(1000, type as any);
      setPoints(pts);
    } catch { setPoints([]); }
  };

  const exportPng = async () => {
    try {
      const map = mapboxRef.current as any; if (!map) return;
      leafletImage(map, (err: any, canvas: HTMLCanvasElement) => {
        if (err) return;
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a'); a.href = url; a.download = 'heatmap.png'; a.click();
      });
    } catch {}
  };
  
  // Switch basemap when selection changes
  useEffect(() => {
    const map = mapboxRef.current; const bases = baseLayersRef.current; if (!map || !bases) return;
    try {
      Object.values(bases).forEach((tl) => { try { map.removeLayer(tl); } catch {} });
      (bases[basemap] || bases['OSM']).addTo(map);
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
          <h1 className="text-4xl font-bold mb-2">Mining Activity Heatmap</h1>
          <p className="text-muted-foreground">
            Visualize mining density and activity intensity across regions
          </p>
        </motion.div>

        {/* Control Panel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label>Region/District</Label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    <SelectItem value="jharkhand">Jharkhand</SelectItem>
                    <SelectItem value="odisha">Odisha</SelectItem>
                    <SelectItem value="chhattisgarh">Chhattisgarh</SelectItem>
                    <SelectItem value="madhya-pradesh">Madhya Pradesh</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Time Period</Label>
                <Select defaultValue="1month">
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1week">Last Week</SelectItem>
                    <SelectItem value="1month">Last Month</SelectItem>
                    <SelectItem value="3months">Last 3 Months</SelectItem>
                    <SelectItem value="1year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Intensity Threshold: {threshold}%</Label>
                <Slider value={[threshold]} onValueChange={(v)=>setThreshold(v[0] ?? 70)} max={100} step={1} />
              </div>

              <div className="space-y-2">
                <Label>Heatmap Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="density">Activity Density</SelectItem>
                    <SelectItem value="volume">Excavation Volume</SelectItem>
                    <SelectItem value="violations">Boundary Violations</SelectItem>
                    <SelectItem value="depth">Mining Depth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Basemap</Label>
                <select className="border rounded h-9 px-2 w-full" value={basemap} onChange={(e)=> setBasemap(e.target.value)}>
                  <option value="OSM">OpenStreetMap</option>
                  <option value="Carto">Carto Light</option>
                  <option value="Satellite">Satellite (GIBS)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={async()=>{ await load(); }}>
                <FiMap className="mr-2" />
                Generate Heatmap
              </Button>
              <Button variant="outline" onClick={exportPng}>
                <FiDownload className="mr-2" />
                Export Image
              </Button>
              <Button variant="outline">
                <FiMaximize className="mr-2" />
                Fullscreen
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* LiDAR & Heatmap widgets preview */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-6">
          <VisualizationWidgets />
        </motion.div>

        {/* Heatmap Viewer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl border border-border overflow-hidden"
        >
          <div className="relative h-[700px] bg-muted/20">
            <div ref={mapRef} className="absolute inset-0" />

            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4 max-w-lg mx-auto p-8 bg-background/80 backdrop-blur-sm rounded-xl">
                  <FiMap className="w-20 h-20 mx-auto text-primary" />
                  <h3 className="text-2xl font-bold">Heatmap Viewer</h3>
                  <p className="text-muted-foreground mb-4">Loading Leaflet base map…</p>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute top-4 right-4 bg-destructive text-destructive-foreground text-xs p-2 rounded">
                {error}
              </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-6 left-6 bg-card/90 backdrop-blur-sm p-4 rounded-lg shadow-lg">
              <h4 className="font-semibold mb-3">Activity Intensity</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-4 bg-gradient-to-r from-destructive/80 to-destructive rounded"></div>
                  <span className="text-sm">Very High (90-100%)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-4 bg-gradient-to-r from-primary/80 to-primary rounded"></div>
                  <span className="text-sm">High (70-90%)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-4 bg-gradient-to-r from-accent/80 to-accent rounded"></div>
                  <span className="text-sm">Medium (40-70%)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-4 bg-gradient-to-r from-secondary/80 to-secondary rounded"></div>
                  <span className="text-sm">Low (0-40%)</span>
                </div>
              </div>
            </div>

            {/* Zoom Controls (non-functional placeholders left out for clarity) */}
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 grid md:grid-cols-4 gap-6"
        >
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Total Mining Sites</h3>
            <p className="text-3xl font-bold">247</p>
            <p className="text-xs text-muted-foreground mt-2">Across all regions</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">High Activity Zones</h3>
            <p className="text-3xl font-bold text-destructive">23</p>
            <p className="text-xs text-muted-foreground mt-2">Requires monitoring</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Avg. Mining Area</h3>
            <p className="text-3xl font-bold">4.7 ha</p>
            <p className="text-xs text-muted-foreground mt-2">Per site</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Total Volume</h3>
            <p className="text-3xl font-bold">1.2M m³</p>
            <p className="text-xs text-muted-foreground mt-2">Excavated this month</p>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default Heatmap;
