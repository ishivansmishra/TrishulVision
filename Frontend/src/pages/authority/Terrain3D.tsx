import { motion } from 'framer-motion';
import { FiLayers, FiMaximize, FiRotateCw, FiDownload, FiZoomIn, FiZoomOut } from 'react-icons/fi';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import CesiumViewer from '@/components/CesiumViewer';
import { useAoi } from '@/context/AoiContext';
import { api } from '@/lib/api';
import VisualizationWidgets from '@/components/VisualizationWidgets';

const Terrain3D = () => {
  const { aoi, setAoi, saveAoi } = useAoi();
  const [jobId, setJobId] = useState<string>('');
  const [polys, setPolys] = useState<any[]>([
    { type: 'Polygon', coordinates: [[[77.23, 28.62],[77.26, 28.62],[77.26, 28.65],[77.23, 28.65],[77.23, 28.62]]]} 
  ]);
  const [legal, setLegal] = useState<any | undefined>(undefined);
  const [depthPolys, setDepthPolys] = useState<Array<{ geometry:any; properties?: { depth?: number } }>>([
    { geometry: { type: 'Polygon', coordinates: [[[77.24,28.625],[77.255,28.625],[77.255,28.64],[77.24,28.64],[77.24,28.625]]] }, properties: { depth: 10 } }
  ]);
  const [bbox, setBbox] = useState<[number,number,number,number] | undefined>([77.20,28.60,77.30,28.70]);
  const [showDepth, setShowDepth] = useState<boolean>(true);
  // Volume analysis state
  const [volumeLoading, setVolumeLoading] = useState(false);
  const [volumeError, setVolumeError] = useState<string | null>(null);
  const [volumeResult, setVolumeResult] = useState<{ volume_cubic_m: number; dem_source: string } | null>(null);
  // Before/After state
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<{ t1: any[]; t2: any[] } | null>(null);

  const loadVis = async () => {
    if (!jobId) return;
    try {
      const v = await api.getVisualization(jobId);
      const illegal: any[] = Array.isArray(v.layers?.illegal_zones) ? v.layers.illegal_zones : [];
      const legalB = v.layers?.legal_boundary;
      const dpolys: any[] = Array.isArray(v.layers?.depth_polygons) ? v.layers.depth_polygons : [];
      setPolys(illegal.filter(g => g && (g.type === 'Polygon' || g.type === 'MultiPolygon')));
      setLegal(legalB);
      setDepthPolys(dpolys.filter(f => f?.geometry).map(f=>({ geometry: f.geometry, properties: f.properties })));
      setBbox(Array.isArray(v.aoi_bbox) && v.aoi_bbox.length === 4 ? v.aoi_bbox : undefined);
    } catch (e) {
      setPolys([]); setLegal(undefined); setDepthPolys([]); setBbox(undefined);
    }
  };

  // Auto-load job from query param and when jobId changes
  const loc = useLocation();
  useEffect(() => {
    try {
      const sp = new URLSearchParams(loc.search);
      const j = sp.get('job');
      if (j) setJobId(j);
    } catch {}
  // run only on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (jobId) { loadVis(); } }, [jobId]);

  // Derived depth stats from depth polygons
  const depthStats = useMemo(() => {
    const depths: number[] = [];
    for (const f of depthPolys) {
      const d = Number((f?.properties as any)?.depth);
      if (!Number.isNaN(d)) depths.push(d);
    }
    if (!depths.length) return null;
    const min = Math.min(...depths);
    const max = Math.max(...depths);
    const avg = depths.reduce((a,b)=>a+b,0)/depths.length;
    return { min, max, avg };
  }, [depthPolys]);

  const effectiveBoundary = useMemo(() => {
    // Prefer drawn AOI, else legal boundary from visualization, else a demo square
    if (aoi && typeof aoi === 'object') return aoi;
    if (legal && typeof legal === 'object') return legal;
    return { type: 'Polygon', coordinates: [[[77.23, 28.62],[77.27, 28.62],[77.27, 28.66],[77.23, 28.66],[77.23, 28.62]]] };
  }, [aoi, legal]);

  const runVolumeEstimate = async () => {
    setVolumeLoading(true); setVolumeError(null); setVolumeResult(null);
    try {
      const res = await api.demEstimateVolume({ dem_source: 'SRTM', boundary: effectiveBoundary });
      setVolumeResult(res);
    } catch (e: any) {
      setVolumeError(e?.message || 'Failed to estimate volume');
    } finally { setVolumeLoading(false); }
  };

  const runTemporalCompare = async () => {
    setCompareLoading(true); setCompareError(null); setCompareResult(null);
    try {
      const today = new Date();
      const t2 = today.toISOString().slice(0,10);
      const past = new Date(today.getTime() - 30*24*3600*1000);
      const t1 = past.toISOString().slice(0,10);
      const res = await api.temporalCompare({ aoi: effectiveBoundary, t1, t2, collection: 'S2L2A' });
      setCompareResult(res);
    } catch (e: any) {
      setCompareError(e?.message || 'Failed to load before/after');
    } finally { setCompareLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />

      <main className="flex-1 container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">3D Terrain Visualization</h1>
          <p className="text-muted-foreground">
            Interactive 3D terrain analysis with DEM-based depth and volume estimation
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Control Panel */}
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
                  3D Controls
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="mb-3 block">Vertical Exaggeration: 2.5x</Label>
                  <Slider defaultValue={[25]} max={50} step={5} />
                </div>

                <div>
                  <Label className="mb-3 block">Rotation Speed</Label>
                  <Slider defaultValue={[30]} max={100} step={10} />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="depth-overlay">Show Depth Overlay</Label>
                  <Switch id="depth-overlay" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="contour-lines">Contour Lines</Label>
                  <Switch id="contour-lines" />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="mining-boundaries">Mining Boundaries</Label>
                  <Switch id="mining-boundaries" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="illegal-zones-3d">Illegal Zones</Label>
                  <Switch id="illegal-zones-3d" defaultChecked />
                </div>
              </div>

              <div className="pt-4 border-t border-border space-y-3">
                <h4 className="font-semibold text-sm">View Controls</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm">
                    <FiRotateCw className="mr-1 h-3 w-3" />
                    Rotate
                  </Button>
                  <Button variant="outline" size="sm">
                    <FiMaximize className="mr-1 h-3 w-3" />
                    Reset View
                  </Button>
                  <Button variant="outline" size="sm">
                    <FiZoomIn className="mr-1 h-3 w-3" />
                    Zoom In
                  </Button>
                  <Button variant="outline" size="sm">
                    <FiZoomOut className="mr-1 h-3 w-3" />
                    Zoom Out
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h4 className="font-semibold text-sm mb-3">Depth Scale</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-destructive to-primary rounded"></div>
                    <span>0-10m Deep</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-primary to-accent rounded"></div>
                    <span>10-20m Deep</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-accent to-secondary rounded"></div>
                    <span>20-30m Deep</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-secondary to-muted rounded"></div>
                    <span>30m+ Deep</span>
                  </div>
                </div>
              </div>

              <Button className="w-full">
                <FiDownload className="mr-2" />
                Export 3D Model
              </Button>
            </Card>
          </motion.div>

          {/* 3D Viewer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-3"
          >
            <Card className="overflow-hidden">
              <div className="p-3 flex items-center gap-2 border-b border-border">
                <input value={jobId} onChange={(e)=>setJobId(e.target.value)} placeholder="Enter detection job id" className="flex-1 px-3 py-2 rounded-md bg-background border border-border text-sm" />
                <Button onClick={loadVis} variant="secondary">Load</Button>
              </div>
              <div className="relative">
                <CesiumViewer polygons={polys} legalBoundary={legal} depthPolygons={showDepth ? depthPolys : []} bbox={bbox} enableDraw onDrawChange={(gj)=> setAoi(gj)} />
                {/* Legend */}
                <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm rounded-md border border-border p-3 text-xs space-y-2">
                  <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 bg-red-500/60" /> Illegal Zones</div>
                  <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 bg-lime-400/40 border border-lime-500" /> Legal Boundary</div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-12 h-3 bg-gradient-to-r from-blue-400/50 via-purple-500/50 to-red-500/50 rounded" />
                    Depth (shallow → deep)
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>0m</span><span>15m</span><span>30m+</span>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={showDepth} onChange={(e)=>setShowDepth(e.target.checked)} />
                      Show Depth Overlay
                    </label>
                  </div>
                  <div className="pt-2 border-t border-border flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={async()=>{ await saveAoi('3D AOI'); }}>Save AOI</Button>
                    {aoi && <span>AOI: {Array.isArray(aoi?.coordinates?.[0]) ? aoi.coordinates[0].length : 0} pts</span>}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
          
          {/* LiDAR & Heatmap widgets */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-3 mt-4">
            <VisualizationWidgets />
          </motion.div>
        </div>

        {/* Analysis Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Tabs defaultValue="volume" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="volume">Volume Analysis</TabsTrigger>
              <TabsTrigger value="depth">Depth Estimation</TabsTrigger>
              <TabsTrigger value="comparison">Before/After</TabsTrigger>
            </TabsList>

            <TabsContent value="volume" className="mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Volume Calculation</h3>
                  <div className="space-y-3 text-sm">
                    <p className="text-muted-foreground">Estimate excavation volume for the current AOI boundary using DEM (SRTM).</p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={runVolumeEstimate} disabled={volumeLoading}>{volumeLoading ? 'Estimating…' : 'Estimate Volume'}</Button>
                      {volumeError && <span className="text-destructive text-xs">{volumeError}</span>}
                    </div>
                    {volumeResult && (
                      <div className="p-4 bg-muted rounded-lg space-y-2">
                        <div className="flex justify-between"><span>DEM Source:</span><span className="font-mono">{volumeResult.dem_source}</span></div>
                        <div className="flex justify-between"><span>Estimated Volume:</span><span className="font-mono font-semibold text-primary">{Math.round(volumeResult.volume_cubic_m).toLocaleString()} m³</span></div>
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Excavation Trends</h3>
                  <div className="space-y-3 text-sm">
                    <div className="h-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                      [Volume Over Time Chart Placeholder]
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-xs text-muted-foreground">This Month</div>
                        <div className="text-lg font-bold">+8,500 m³</div>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-xs text-muted-foreground">This Quarter</div>
                        <div className="text-lg font-bold">+24,200 m³</div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="depth" className="mt-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Depth Estimation Analysis</h3>
                {depthStats ? (
                  <>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <div className="text-sm text-muted-foreground mb-2">Minimum Depth</div>
                        <div className="text-3xl font-bold">{depthStats.min.toFixed(1)}m</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-2">Average Depth</div>
                        <div className="text-3xl font-bold text-primary">{depthStats.avg.toFixed(1)}m</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-2">Maximum Depth</div>
                        <div className="text-3xl font-bold text-destructive">{depthStats.max.toFixed(1)}m</div>
                      </div>
                    </div>
                    <p className="mt-6 text-sm text-muted-foreground">Depth estimated from depth polygons returned by the visualization layer.</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No depth polygons available for statistics.</p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="comparison" className="mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Before/After Preview</h3>
                    <Button size="sm" variant="outline" onClick={runTemporalCompare} disabled={compareLoading}>{compareLoading ? 'Loading…' : 'Load'}</Button>
                  </div>
                  {compareError && <p className="text-destructive text-sm">{compareError}</p>}
                  {!compareResult ? (
                    <div className="h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">[Load to view acquisitions]</div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Before (t1)</h4>
                        <ul className="text-xs space-y-1">
                          {compareResult.t1.slice(0,3).map((it:any, i:number)=> (
                            <li key={i} className="p-2 bg-accent/10 rounded">{it?.id || JSON.stringify(it)}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">After (t2)</h4>
                        <ul className="text-xs space-y-1">
                          {compareResult.t2.slice(0,3).map((it:any, i:number)=> (
                            <li key={i} className="p-2 bg-accent/10 rounded">{it?.id || JSON.stringify(it)}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </Card>
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Notes</h3>
                  <p className="text-sm text-muted-foreground">Previews list sample Sentinel-2 acquisitions for the AOI. Integrate real imagery rendering next.</p>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default Terrain3D;
