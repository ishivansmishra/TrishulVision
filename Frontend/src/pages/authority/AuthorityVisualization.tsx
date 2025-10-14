import { motion } from 'framer-motion';
import { FiLayers, FiMap, FiMaximize, FiActivity, FiCrosshair, FiTrendingUp, FiGrid } from 'react-icons/fi';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VisualizationWidgets from '@/components/VisualizationWidgets';
import CesiumViewer from '@/components/CesiumViewer';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { API_BASE_URL, withAuth } from '@/lib/config';
import { toast } from '@/components/ui/use-toast';

const AuthorityVisualization = () => {
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
          <p className="text-muted-foreground">Interactive 3D view of mining sites with depth estimation and DEM analysis</p>
        </motion.div>

        {/* Control Panel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 flex flex-wrap gap-4"
        >
          <Button>
            <FiLayers className="mr-2" />
            Show Depth Analysis
          </Button>
          <Button variant="outline">
            <FiMap className="mr-2" />
            Highlight Illegal Zones
          </Button>
          <Button variant="outline">
            <FiMaximize className="mr-2" />
            Fullscreen Mode
          </Button>
        </motion.div>

  {/* 3D Viewer - live data from selected or recent job visualization */}
  <Visualization3DController />

        {/* LiDAR & Heatmap widgets */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-8">
          <VisualizationWidgets />
        </motion.div>

        {/* Computer Vision Analysis Tools */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <Tabs defaultValue="segmentation" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="segmentation">Segmentation</TabsTrigger>
              <TabsTrigger value="detection">Change Detection</TabsTrigger>
              <TabsTrigger value="volume">Volume Estimation</TabsTrigger>
            </TabsList>

            <TabsContent value="segmentation" className="mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <FiGrid className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Deep Learning Segmentation</h3>
                      <p className="text-sm text-muted-foreground">U-Net & SegNet models</p>
                    </div>
                  </div>
                  <SegmentationForm />
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-accent/10">
                      <FiCrosshair className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Boundary Classification</h3>
                      <p className="text-sm text-muted-foreground">Legal vs Illegal Mining</p>
                    </div>
                  </div>
                  <BoundaryOverlayForm />
                </Card>
              </div>
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <FiGrid className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">File-based Detection</h3>
                      <p className="text-sm text-muted-foreground">Upload imagery/shapefile/DEM</p>
                    </div>
                  </div>
                  <FileDetectionForm />
                </Card>
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-accent/10">
                      <FiTrendingUp className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Detect from URL</h3>
                      <p className="text-sm text-muted-foreground">HTTP/Earthdata</p>
                    </div>
                  </div>
                  <DetectFromUrlForm />
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="detection" className="mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <FiActivity className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">SAR Change Detection</h3>
                      <p className="text-sm text-muted-foreground">Sentinel-1 Analysis</p>
                    </div>
                  </div>
                  <ChangeDetectionForm />
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-accent/10">
                      <FiTrendingUp className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Optical Change Detection</h3>
                      <p className="text-sm text-muted-foreground">Sentinel-2 & Landsat</p>
                    </div>
                  </div>
                  <ChangeDetectionForm variant="optical" />
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="volume" className="mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <FiLayers className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">DEM Depth Estimation</h3>
                      <p className="text-sm text-muted-foreground">SRTM/ASTER/CartoDEM</p>
                    </div>
                  </div>
                  <DemEstimateForm />
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-accent/10">
                      <FiMap className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Volume Calculation</h3>
                      <p className="text-sm text-muted-foreground">Simpson's Rule Integration</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Use the DEM estimator on the left with your boundary to compute real volumes.</p>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Job History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8">
          <JobHistory />
        </motion.div>

      </main>

      <Footer />
    </div>
  );
};

export default AuthorityVisualization;

// Visualization with controls
function Visualization3DController() {
  const [layers, setLayers] = useState<any>(null);
  const [bbox, setBbox] = useState<[number, number, number, number] | undefined>(undefined);
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [shapefile, setShapefile] = useState<any | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshFromJob = async (jid?: string) => {
    try {
      const id = jid || jobId;
      if (!id) return;
      toast({ title: 'Loading visualization', description: `Job ${id}` });
      const vis = await api.getVisualization(id);
      setLayers(vis.layers);
      setBbox(vis.aoi_bbox as any);
    } catch (e: any) {
      setError(e?.message || 'Failed to load visualization');
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const jobs = await api.listDetectionJobs();
        const job = jobs.find(j => j.status === 'completed') || jobs[0];
        if (job) {
          setJobId(job.id);
          await refreshFromJob(job.id);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load visualization');
      }
    })();
    // Listen for boundary overlay selection
    const onBoundary = (e: any) => setShapefile(e.detail);
    window.addEventListener('tv:set-legal-boundary', onBoundary as any);
    // Listen for new jobs and start polling until completion, then load
    const onNewJob = (e: any) => {
      const id = e.detail as string | undefined;
      if (!id) return;
      setJobId(id);
      let cancelled = false;
      const poll = async () => {
        try {
          const j = await api.getDetectionJob(id);
          if (cancelled) return;
          if (j.status === 'completed') {
            toast({ title: 'Job completed', description: id });
            await refreshFromJob(id);
          } else {
            toast({ title: 'Job running…', description: id });
            setTimeout(poll, 3000);
          }
        } catch {
          setTimeout(poll, 4000);
        }
      };
      poll();
    };
    window.addEventListener('tv:new-job', onNewJob as any);
    return () => window.removeEventListener('tv:set-legal-boundary', onBoundary as any);
  }, []);

  const illegal = layers?.illegal_polygons as Array<any> | undefined;
  const legal = shapefile || (layers?.legal_boundary as any | undefined);
  const depth = layers?.depth_polygons as Array<any> | undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input placeholder="Job ID (optional)" value={jobId || ''} onChange={(e)=>setJobId(e.target.value || undefined)} className="max-w-sm" />
        <Button size="sm" onClick={()=>refreshFromJob()}>Load Visualization</Button>
        {jobId && (
          <>
            <Button size="sm" variant="outline" onClick={()=> window.open(`/authority/terrain3d?job=${encodeURIComponent(jobId!)}`, '_blank')}>Open Map</Button>
            <Button size="sm" variant="outline" onClick={async()=>{
              try {
                const r = await fetch(`${API_BASE_URL}/ai/models/jobs/${jobId}/export`, { headers: withAuth() });
                if (!r.ok) throw new Error(await r.text());
                const blob = await r.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `${jobId}.geojson`; a.click(); URL.revokeObjectURL(url);
              } catch (e) {}
            }}>Export GeoJSON</Button>
          </>
        )}
      </div>
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl border border-border overflow-hidden">
        {error && <div className="p-3 text-sm text-destructive">{error}</div>}
        <CesiumViewer polygons={illegal || []} legalBoundary={legal} depthPolygons={depth || []} bbox={bbox} />
      </motion.div>
    </div>
  );
}

function SegmentationForm() {
  const [bboxText, setBboxText] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true); setMessage(null);
    try {
      const parts = bboxText.split(',').map(s=>parseFloat(s.trim()));
      if (!Array.isArray(parts) || parts.length !== 4 || parts.some(isNaN)) throw new Error('Enter bbox as minLng,minLat,maxLng,maxLat');
      const bbox = [parts[0], parts[1], parts[2], parts[3]] as [number,number,number,number];
      const res = await api.createDetectionJobFromBbox(bbox, notes || undefined);
      setMessage(`Job created: ${res.job_id}`);
      window.dispatchEvent(new CustomEvent('tv:new-job', { detail: res.job_id }));
    } catch (e:any) {
      setMessage(e?.message || 'Failed to create job');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-3">
      <Input placeholder="BBox: minLng,minLat,maxLng,maxLat" value={bboxText} onChange={(e)=>setBboxText(e.target.value)} />
      <Textarea placeholder="Notes (optional)" value={notes} onChange={(e)=>setNotes(e.target.value)} />
      <Button className="w-full" disabled={submitting} onClick={submit}>{submitting ? 'Submitting…' : 'Run Segmentation Model'}</Button>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}

function BoundaryOverlayForm() {
  const [selectedId, setSelectedId] = useState('');
  const [items, setItems] = useState<Array<{ id: string; name: string; geojson: any }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.listShapefiles();
        setItems(data.map(d => ({ id: d.id, name: d.name, geojson: d.geojson })));
      } catch (e:any) {
        setError(e?.message || 'Failed to load shapefiles');
      }
    })();
  }, []);

  // Lift selected overlay into a global-ish place by dispatching a CustomEvent consumed by Visualization3DController
  const apply = () => {
    const sf = items.find(i => i.id === selectedId);
    if (!sf) return;
    window.dispatchEvent(new CustomEvent('tv:set-legal-boundary', { detail: sf.geojson }));
  };

  // Visualization3DController listens to this event
  useEffect(() => {
    const handler = (e: any) => {};
    window.addEventListener('tv:set-legal-boundary', handler as any);
    return () => window.removeEventListener('tv:set-legal-boundary', handler as any);
  }, []);

  return (
    <div className="space-y-3">
      {error && <p className="text-destructive text-sm">{error}</p>}
      <select className="w-full border border-border rounded p-2 text-sm bg-background" value={selectedId} onChange={(e)=>setSelectedId(e.target.value)}>
        <option value="">Select shapefile…</option>
        {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
      </select>
      <Button variant="outline" className="w-full" onClick={apply} disabled={!selectedId}>Load Boundary Layer</Button>
    </div>
  );
}

function ChangeDetectionForm({ variant = 'sar' as 'sar'|'optical' }) {
  const [scene1, setScene1] = useState('');
  const [scene2, setScene2] = useState('');
  const [aoi, setAoi] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true); setMsg(null);
    try {
      const aoiGeo = aoi ? JSON.parse(aoi) : undefined;
      const res = await api.changeDetection({ scene1, scene2, aoi: aoiGeo || null as any });
      setMsg(`Change detection submitted: ${JSON.stringify(res).slice(0,80)}…`);
      // If change detection triggers a job in your backend in future, emit event here.
    } catch (e:any) {
      setMsg(e?.message || 'Failed to run change detection');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-2">
      <Input placeholder={`${variant.toUpperCase()} scene 1 URL`} value={scene1} onChange={(e)=>setScene1(e.target.value)} />
      <Input placeholder={`${variant.toUpperCase()} scene 2 URL`} value={scene2} onChange={(e)=>setScene2(e.target.value)} />
      <Textarea placeholder='AOI GeoJSON (optional)' value={aoi} onChange={(e)=>setAoi(e.target.value)} />
      <Button className="w-full" disabled={submitting} onClick={submit}>{submitting ? 'Submitting…' : (variant === 'sar' ? 'Analyze SAR Data' : 'Run Change Detection')}</Button>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}

function DemEstimateForm() {
  const [boundary, setBoundary] = useState('');
  const [source, setSource] = useState('SRTM');
  const [res, setRes] = useState<{ volume_cubic_m: number; dem_source: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setLoading(true); setErr(null); setRes(null);
    try {
      const boundaryGeo = JSON.parse(boundary);
      const r = await api.demEstimateVolume({ dem_source: source, boundary: boundaryGeo });
      setRes(r);
    } catch (e:any) {
      setErr(e?.message || 'Failed to estimate');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-2">
      <select className="w-full border border-border rounded p-2 text-sm bg-background" value={source} onChange={(e)=>setSource(e.target.value)}>
        <option value="SRTM">SRTM</option>
        <option value="ASTER">ASTER</option>
        <option value="CartoDEM">CartoDEM</option>
      </select>
      <Textarea placeholder='Paste boundary GeoJSON Polygon/MultiPolygon' value={boundary} onChange={(e)=>setBoundary(e.target.value)} rows={6} />
      <Button className="w-full" onClick={run} disabled={loading}>{loading ? 'Estimating…' : 'Generate Depth/Volume'}</Button>
      {err && <p className="text-destructive text-sm">{err}</p>}
      {res && <p className="text-sm">Volume: <span className="font-semibold">{res.volume_cubic_m.toLocaleString()} m³</span> ({res.dem_source})</p>}
    </div>
  );
}

function FileDetectionForm() {
  const [imagery, setImagery] = useState<File | undefined>();
  const [shapefile, setShapefile] = useState<File | undefined>();
  const [dem, setDem] = useState<File | undefined>();
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true); setMsg(null);
    try {
      const res = await api.createDetectionJob({ imagery, shapefile, dem, notes: notes || undefined });
      setMsg(`Job created: ${res.job_id}`);
      toast({ title: 'Job submitted', description: res.job_id });
      window.dispatchEvent(new CustomEvent('tv:new-job', { detail: res.job_id }));
    } catch (e:any) {
      setMsg(e?.message || 'Failed to create job');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input type="file" onChange={(e)=>setImagery(e.target.files?.[0])} />
        <input type="file" onChange={(e)=>setShapefile(e.target.files?.[0])} />
        <input type="file" onChange={(e)=>setDem(e.target.files?.[0])} />
      </div>
      <Textarea placeholder="Notes (optional)" value={notes} onChange={(e)=>setNotes(e.target.value)} />
      <Button className="w-full" disabled={submitting} onClick={submit}>{submitting ? 'Uploading…' : 'Start Detection'}</Button>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}

function DetectFromUrlForm() {
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [provider, setProvider] = useState<'earthdata'|'http'|undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true); setMsg(null);
    try {
      const res = await api.createDetectionJobFromUrl(url, notes || undefined, provider);
      setMsg(`Job created: ${res.job_id}`);
      toast({ title: 'Job submitted', description: res.job_id });
      window.dispatchEvent(new CustomEvent('tv:new-job', { detail: res.job_id }));
    } catch (e:any) {
      setMsg(e?.message || 'Failed to create job from URL');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-2">
      <Input placeholder="Imagery URL" value={url} onChange={(e)=>setUrl(e.target.value)} />
      <div className="flex gap-2">
        <select className="border border-border rounded p-2 text-sm bg-background" value={provider || ''} onChange={(e)=>setProvider((e.target.value || undefined) as any)}>
          <option value="">Provider: http</option>
          <option value="earthdata">earthdata</option>
          <option value="http">http</option>
        </select>
        <Input placeholder="Notes (optional)" value={notes} onChange={(e)=>setNotes(e.target.value)} />
      </div>
      <Button className="w-full" onClick={submit} disabled={loading || !url.trim()}>{loading ? 'Submitting…' : 'Detect from URL'}</Button>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}

function JobHistory() {
  const [jobs, setJobs] = useState<Array<{ id: string; status: string; created_at?: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const data = await api.listDetectionJobs();
        setJobs(data);
      } catch (e:any) {
        setError(e?.message || 'Failed to load jobs');
      }
    })();
  }, []);
  const load = (id: string) => window.dispatchEvent(new CustomEvent('tv:new-job', { detail: id }));
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Job History</h3>
        {error && <span className="text-destructive text-xs">{error}</span>}
      </div>
      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No jobs yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {jobs.map(j => (
            <li key={j.id} className="py-2 flex items-center justify-between">
              <div>
                <p className="font-mono text-sm">{j.id}</p>
                <p className="text-xs text-muted-foreground">{j.created_at ? new Date(j.created_at).toLocaleString() : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${j.status === 'completed' ? 'bg-green-600/20 text-green-600' : 'bg-amber-600/20 text-amber-600'}`}>{j.status}</span>
                <Button size="sm" variant="outline" onClick={()=>load(j.id)}>Load in 3D</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
