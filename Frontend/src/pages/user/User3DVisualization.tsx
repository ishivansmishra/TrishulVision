import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiBox, FiRotateCw, FiMaximize, FiDownload, FiLayers } from 'react-icons/fi';
import { UserNavbar } from '@/components/UserNavbar';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CesiumViewer from '@/components/CesiumViewer';
import { api } from '@/lib/api';
import { useLocation } from 'react-router-dom';

const User3DVisualization = () => {
  const [jobs, setJobs] = useState<Array<{ id: string; status: string; created_at?: string }>>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [viz, setViz] = useState<null | { job_id: string; status: string; layers: any; metrics: any; map_url?: string; aoi_bbox?: [number,number,number,number] }>(null);
  const [loading, setLoading] = useState(true);

  const location = useLocation();
  // Load available jobs (user's jobs implicitly filtered server-side via token)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const js = await api.listDetectionJobs();
        if (cancelled) return;
        setJobs(js);
        // preselect most recent completed or last job
        const sp = new URLSearchParams(location.search);
        const fromQuery = sp.get('job');
        const completed = js.filter(j => j.status === 'completed');
        const pre = fromQuery || (completed[0]?.id) || (js[0]?.id) || null;
        setSelectedJobId(pre);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    const id = setInterval(run, 20000);
    return () => { cancelled = true; clearInterval(id); };
  }, [location.search]);

  // Load visualization when job selected
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!selectedJobId) { setViz(null); return; }
      try { const v = await api.getVisualization(selectedJobId); if (active) setViz(v); } catch {}
    };
    run();
    const id = setInterval(run, 10000);
    return () => { active = false; clearInterval(id); };
  }, [selectedJobId]);

  const polygons = useMemo(()=> viz?.layers?.illegal_polygons || viz?.layers?.illegal || viz?.layers?.polygons || [
    { type: 'Polygon', coordinates: [[[77.23, 28.62],[77.26, 28.62],[77.26, 28.65],[77.23, 28.65],[77.23, 28.62]]]} 
  ], [viz]);
  const depthPolygons = useMemo(()=> viz?.layers?.depth_polygons || viz?.layers?.depth || [
    { geometry: { type: 'Polygon', coordinates: [[[77.24,28.625],[77.255,28.625],[77.255,28.64],[77.24,28.64],[77.24,28.625]]] }, properties: { depth: 12 } }
  ], [viz]);
  const legalBoundary = useMemo(()=> viz?.layers?.legal_boundary || viz?.layers?.boundary || { type: 'Polygon', coordinates: [[[77.20, 28.60],[77.30, 28.60],[77.30, 28.70],[77.20, 28.70],[77.20, 28.60]]] }, [viz]);

  return (
    <div className="min-h-screen flex flex-col">
      <UserNavbar />

      <main className="flex-1 container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <FiBox className="text-primary" />
            3D Mining Visualization
          </h1>
          <p className="text-muted-foreground">
            Interactive 3D model of your mining site with terrain and depth analysis
          </p>
        </motion.div>

        {/* Control Panel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label>View Mode</Label>
                <Select defaultValue="3d">
                  <SelectTrigger>
                    <SelectValue placeholder="Select view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3d">3D Terrain</SelectItem>
                    <SelectItem value="depth">Depth Map</SelectItem>
                    <SelectItem value="volume">Volume Heatmap</SelectItem>
                    <SelectItem value="boundary">Lease Boundary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Layer Visibility</Label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="Select layers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Layers</SelectItem>
                    <SelectItem value="terrain">Terrain Only</SelectItem>
                    <SelectItem value="mining">Mining Areas Only</SelectItem>
                    <SelectItem value="boundary">Boundaries Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Rotation Speed: Medium</Label>
                <Slider defaultValue={[50]} max={100} step={1} />
              </div>

              <div className="space-y-2">
                <Label>Vertical Exaggeration: 2x</Label>
                <Slider defaultValue={[50]} max={100} step={1} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button>
                <FiRotateCw className="mr-2" />
                Reset View
              </Button>
              <Button variant="outline">
                <FiMaximize className="mr-2" />
                Fullscreen
              </Button>
              <Button variant="outline">
                <FiDownload className="mr-2" />
                Export Model
              </Button>
              <Button variant="outline">
                <FiLayers className="mr-2" />
                Toggle Layers
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* 3D Viewer (Live) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border overflow-hidden"
        >
          <div className="relative h-[700px] bg-muted/20">
            {selectedJobId ? (
              <CesiumViewer polygons={polygons} depthPolygons={depthPolygons} legalBoundary={legalBoundary} bbox={viz?.aoi_bbox as any} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">{loading ? 'Loading jobs…' : 'No jobs available.'}</div>
            )}
            {/* Info Panel */}
            <div className="absolute top-4 right-4 bg-card/90 backdrop-blur-sm p-3 rounded-lg shadow-lg">
              <div className="text-xs">Selected job: <span className="font-medium">{selectedJobId ?? '—'}</span></div>
            </div>
          </div>
        </motion.div>

        {/* Analysis Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 grid md:grid-cols-3 gap-6"
        >
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Select Job</h3>
            <div className="flex flex-wrap gap-2">
              {jobs.map(j => (
                <Button key={j.id} size="sm" variant={selectedJobId===j.id? 'default':'outline'} onClick={()=>setSelectedJobId(j.id)}>
                  {j.id.slice(0,8)}… {j.status}
                </Button>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Visualization Metrics</h3>
            <div className="text-xs text-muted-foreground">{viz ? JSON.stringify(viz.metrics || {}, null, 2) : 'No metrics available.'}</div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Legend</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><span className="inline-block w-4 h-4 bg-red-500/40 border border-red-600" /> Illegal mining polygons</div>
              <div className="flex items-center gap-2"><span className="inline-block w-4 h-4 bg-green-500/20 border border-green-600" /> Legal boundary</div>
              <div className="flex items-center gap-2"><span className="inline-block w-4 h-4 bg-blue-500/30 border border-blue-600" /> Depth overlays</div>
            </div>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default User3DVisualization;
