import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiCpu, FiAlertTriangle, FiTrendingUp, FiMap, FiActivity, FiRefreshCw, FiExternalLink } from 'react-icons/fi';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import FloatingChatbot from '@/components/FloatingChatbot';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import CesiumViewer from '@/components/CesiumViewer';
import { api } from '@/lib/api';
import { API_BASE_URL, withAuth } from '@/lib/config';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import React from 'react';

const AIDetection = () => {
  const [metrics, setMetrics] = useState<null | { reports_total: number; alerts_total: number; blockchain_verified: number; detection_jobs: number; active_sites: number }>(null);
  const [jobs, setJobs] = useState<Array<{ id: string; status: string; created_at?: string; area_illegal?: number; volume_cubic_m?: number }>>([]);
  const [detections, setDetections] = useState<Array<{ id: string; geometry: any; properties: any }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [viz, setViz] = useState<null | { job_id: string; status: string; layers: any; metrics: any; map_url?: string; aoi_bbox?: [number,number,number,number] }>(null);
  const [localBbox, setLocalBbox] = useState<[number,number,number,number] | undefined>(undefined);
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');
  // Draft filters for Apply button UX
  const [draftStart, setDraftStart] = useState<string>('');
  const [draftEnd, setDraftEnd] = useState<string>('');
  const [draftUser, setDraftUser] = useState<string>('');
  const [jobsLimit, setJobsLimit] = useState<number>(20);
  const [jobsSkip, setJobsSkip] = useState<number>(0);
  const [detLimit, setDetLimit] = useState<number>(60);

  // Quick Detect (Image/Video) state
  const [qdLoading, setQdLoading] = useState(false);
  const [qdError, setQdError] = useState<string | null>(null);
  const [qdImgUrl, setQdImgUrl] = useState<string | null>(null);
  const [qdImgDims, setQdImgDims] = useState<{w:number;h:number} | null>(null);
  const [qdBoxes, setQdBoxes] = useState<Array<{ x:number; y:number; w:number; h:number; score:number; label:string }>>([]);
  const qdCount = qdBoxes.length;

  const handleQuickImage = async (file: File | undefined) => {
    if (!file) return;
    setQdError(null); setQdLoading(true); setQdBoxes([]);
    try {
      const url = URL.createObjectURL(file);
      setQdImgUrl(url);
      const res = await api.detectIllegalMining(file);
      setQdBoxes(res.detections || []);
      toast({ title: 'Quick Detect complete', description: `Detections: ${res.count}` });
    } catch (e:any) {
      setQdError(e?.message || 'Failed to run quick detect');
    } finally { setQdLoading(false); }
  };

  const extractFirstFrame = (file: File): Promise<Blob> => new Promise((resolve, reject) => {
    try {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.src = url; video.crossOrigin = 'anonymous'; video.muted = true;
      video.playsInline = true;
      const onLoaded = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.floor(video.videoWidth));
          canvas.height = Math.max(1, Math.floor(video.videoHeight));
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas context unavailable');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Failed to read frame'));
            resolve(blob);
          }, 'image/jpeg', 0.85);
        } catch (err) { reject(err); }
        finally { video.removeEventListener('loadeddata', onLoaded); URL.revokeObjectURL(url); }
      };
      video.addEventListener('loadeddata', onLoaded);
      // Safari sometimes needs play/pause to trigger frame ready
      video.play().then(()=> video.pause()).catch(()=>{});
    } catch (e) { reject(e as any); }
  });

  const handleQuickVideo = async (file: File | undefined) => {
    if (!file) return;
    setQdError(null); setQdLoading(true); setQdBoxes([]);
    try {
      const frameBlob = await extractFirstFrame(file);
      const frameFile = new File([frameBlob], 'frame.jpg', { type: 'image/jpeg' });
      const url = URL.createObjectURL(frameBlob);
      setQdImgUrl(url);
      const res = await api.detectIllegalMining(frameFile);
      setQdBoxes(res.detections || []);
      toast({ title: 'Quick Detect (video frame) complete', description: `Detections: ${res.count}` });
    } catch (e:any) {
      setQdError(e?.message || 'Failed to run quick detect on video');
    } finally { setQdLoading(false); }
  };

  // Keep draft inputs in sync with applied filters
  useEffect(() => {
    setDraftStart(start);
    setDraftEnd(end);
    setDraftUser(userFilter);
  }, [start, end, userFilter]);

  // Load initial data and poll
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // Build jobs URL with optional filters (authority only)
        const params = new URLSearchParams();
        if (start) params.set('start', start);
        if (end) params.set('end', end);
        if (userFilter) params.set('user', userFilter);
        params.set('limit', String(jobsLimit));
        params.set('skip', String(jobsSkip));
        const jobsUrl = params.toString() ? `${API_BASE_URL}/ai/models/jobs?${params.toString()}` : `${API_BASE_URL}/ai/models/jobs`;

        const [m, j, d] = await Promise.all([
          api.getOverviewMetrics().catch(()=>null),
          (async()=>{ const r = await fetch(jobsUrl, { headers: withAuth() }); if (!r.ok) throw new Error(await r.text()); return r.json(); })(),
          api.listRecentDetections(detLimit).catch(()=>[]),
        ]);
        if (cancelled) return;
        if (m) setMetrics(m);
        setJobs(j);
        setDetections(d);
        setError(null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 15000); // refresh every 15s
    return () => { cancelled = true; clearInterval(id); };
  }, [start, end, userFilter, jobsLimit, jobsSkip, detLimit]);

  // Load visualization for selected job
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!selectedJobId) { setViz(null); return; }
      try {
        const v = await api.getVisualization(selectedJobId);
        if (active) setViz(v);
      } catch (e) { /* ignore */ }
    };
    run();
    const id = setInterval(run, 10000); // poll viz updates while selected
    return () => { active = false; clearInterval(id); };
  }, [selectedJobId]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-accent text-accent-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  // Derive live stats
  const jobsProcessing = useMemo(()=> jobs.filter(j => ['queued','pending','running','processing'].includes(j.status?.toLowerCase?.() || '')).length, [jobs]);
  const illegalCount = useMemo(()=> detections.length, [detections]);
  const avgConfidence = useMemo(()=> {
    const vals = detections.map(d => Number(d?.properties?.confidence)).filter(v => Number.isFinite(v));
    if (vals.length === 0) return null; const s = vals.reduce((a,b)=>a+b,0)/vals.length; return Math.round(s*10)/10;
  }, [detections]);

  // Extract layers for CesiumViewer gracefully
  const polygons = useMemo(()=> {
    const l = viz?.layers || {};
    const fromViz = l.illegal_polygons || l.illegal || l.polygons || [];
    if (fromViz && fromViz.length > 0) return fromViz;
    // fallback: render detections directly if no viz selected
    return detections.map(d => d.geometry).filter(Boolean);
  }, [viz, detections]);
  const depthPolygons = useMemo(()=> {
    const l = viz?.layers || {};
    return l.depth_polygons || l.depth || [];
  }, [viz]);
  const legalBoundary = useMemo(()=> {
    const l = viz?.layers || {};
    return l.legal_boundary || l.boundary || null;
  }, [viz]);

  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />

      <main className="flex-1 container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <FiCpu className="text-primary" />
            AI Mining Detection
          </h1>
          <p className="text-muted-foreground">
            Automated detection and classification of mining activities using computer vision and satellite imagery
          </p>
        </motion.div>

        {/* Live Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-4 gap-6 mb-8"
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Active Detections</h3>
              <FiAlertTriangle className="text-destructive" />
            </div>
            <p className="text-3xl font-bold">{illegalCount}</p>
            <p className="text-xs text-muted-foreground mt-1">From database</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Illegal Sites</h3>
              <FiMap className="text-destructive" />
            </div>
            <p className="text-3xl font-bold">{illegalCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Live count</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground">AI Accuracy</h3>
              <FiTrendingUp className="text-primary" />
            </div>
            <p className="text-3xl font-bold">{avgConfidence !== null ? `${avgConfidence}%` : '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">Avg confidence from detections</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Processing</h3>
              <FiActivity className="text-accent" />
            </div>
            <p className="text-3xl font-bold">{jobsProcessing}</p>
            <p className="text-xs text-muted-foreground mt-1">Jobs running/queued</p>
          </Card>
        </motion.div>

        {/* Quick Detect (Image/Video) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Quick Detect</h2>
              {qdLoading && <span className="text-sm text-muted-foreground">Running…</span>}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Image upload</label>
                <Input type="file" accept="image/*" onChange={(e)=>handleQuickImage(e.target.files?.[0])} className="mt-2" />
              </div>
              <div>
                <label className="text-sm font-medium">Video upload (uses first frame)</label>
                <Input type="file" accept="video/*" onChange={(e)=>handleQuickVideo(e.target.files?.[0])} className="mt-2" />
              </div>
            </div>
            {qdError && <p className="text-sm text-destructive mt-3">{qdError}</p>}
            {(qdImgUrl) && (
              <div className="mt-4">
                <div className="text-sm text-muted-foreground mb-2">Preview {qdCount ? `· ${qdCount} detections` : ''}</div>
                <div className="relative inline-block max-w-full border rounded overflow-hidden">
                  <img
                    src={qdImgUrl}
                    alt="quick-detect-preview"
                    className="max-w-full h-auto block"
                    onLoad={(e)=>{
                      const t = e.currentTarget as HTMLImageElement;
                      setQdImgDims({ w: t.naturalWidth, h: t.naturalHeight });
                    }}
                  />
                  {/* Boxes overlay scaled to rendered size */}
                  {qdBoxes.length > 0 && (
                    <OverlayBoxes boxes={qdBoxes} imageSelector="img[alt='quick-detect-preview']" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Note: Quick Detect operates on raw pixels and is independent of map georeferencing.</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Detection Jobs + 3D Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">Detection Jobs</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Input type="datetime-local" value={draftStart} onChange={(e)=>setDraftStart(e.target.value)} className="h-9 w-44" />
                  <Input type="datetime-local" value={draftEnd} onChange={(e)=>setDraftEnd(e.target.value)} className="h-9 w-44" />
                  <Input placeholder="User email (authority)" value={draftUser} onChange={(e)=>setDraftUser(e.target.value)} className="h-9 w-56" />
                  <select
                    className="h-9 px-2 border border-border rounded-md text-sm bg-background"
                    value={jobsLimit}
                    onChange={(e)=>{ setJobsLimit(parseInt(e.target.value,10) || 20); setJobsSkip(0); }}
                    title="Items per page"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <Button size="sm" variant="outline" onClick={()=>{ setStart(draftStart); setEnd(draftEnd); setUserFilter(draftUser); setJobsSkip(0); }}>
                    Apply
                  </Button>
                  <Button size="sm" variant="outline" onClick={()=>{ setJobsSkip(Math.max(0, jobsSkip - jobsLimit)); }} disabled={jobsSkip===0}>Prev</Button>
                  <Button size="sm" variant="outline" onClick={()=>{ setJobsSkip(jobsSkip + jobsLimit); }} disabled={!loading && jobs.length < jobsLimit}>Next</Button>
                </div>
              </div>
              {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
              {error && <p className="text-sm text-destructive">{error}</p>}
              {!loading && jobs.length === 0 && <p className="text-sm text-muted-foreground">No jobs found.</p>}
              <div className="space-y-3">
                {jobs.map((j) => (
                  <div key={j.id} className="border border-border rounded-lg p-4 hover:bg-accent/5 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">Job {j.id}</div>
                        <div className="text-xs text-muted-foreground">{j.created_at ? new Date(j.created_at).toLocaleString() : ''}</div>
                      </div>
                      <Badge variant={j.status === 'completed' ? 'default' : 'outline'}>{j.status}</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                      <div>Illegal area: <span className="font-medium">{j.area_illegal ?? '—'}</span></div>
                      <div>Volume: <span className="font-medium">{j.volume_cubic_m ?? '—'}</span></div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 items-center">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedJobId(j.id); toast({ title: '3D Preview loaded', description: `Job ${j.id}` }); }}>
                        Load 3D Preview
                      </Button>
                      <Button size="sm" variant="outline" onClick={()=>{ window.open(`/authority/terrain3d?job=${encodeURIComponent(j.id)}`, '_blank'); }}>
                        <FiExternalLink className="mr-2" /> Open Map
                      </Button>
                      <Button size="sm" variant="outline" onClick={async()=>{
                        try {
                          const r = await fetch(`${API_BASE_URL}/ai/models/jobs/${j.id}/export`, { headers: withAuth() });
                          if (!r.ok) throw new Error(await r.text());
                          const blob = await r.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url; a.download = `${j.id}.geojson`; a.click(); URL.revokeObjectURL(url);
                        } catch{}
                      }}>Export GeoJSON</Button>
                      {/* Mini-map thumbnail if available */}
                      <JobMiniMap jobId={j.id} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-0 overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">3D Preview</h2>
                  <p className="text-xs text-muted-foreground">{selectedJobId ? `Visualization for job ${selectedJobId}` : 'Select a job to preview'}</p>
                </div>
                {viz?.map_url && (
                  <Button size="sm" variant="outline" onClick={()=> window.open(viz.map_url!, '_blank')}>
                    <FiExternalLink className="mr-2" /> Open Full Map
                  </Button>
                )}
              </div>
              <div className="h-[700px] relative">
                {selectedJobId ? (
                  <CesiumViewer polygons={polygons} depthPolygons={depthPolygons} legalBoundary={legalBoundary} bbox={(localBbox || viz?.aoi_bbox) as any} />
                ) : (
                  <CesiumViewer polygons={polygons} bbox={localBbox as any} />
                )}
                {/* Inline legend + metrics chips */}
                <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm rounded-md border border-border p-3 text-xs space-y-2">
                  <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 bg-red-500/60" /> Illegal Zones</div>
                  <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 bg-lime-400/40 border border-lime-500" /> Legal Boundary</div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-12 h-3 bg-gradient-to-r from-blue-400/50 via-purple-500/50 to-red-500/50 rounded" />
                    Depth (shallow → deep)
                  </div>
                  {viz?.metrics && (
                    <div className="pt-2 border-t border-border grid grid-cols-2 gap-2">
                      {viz.metrics.area_illegal != null && <div className="px-2 py-1 rounded bg-muted text-foreground">Illegal: <span className="font-semibold">{viz.metrics.area_illegal}</span></div>}
                      {viz.metrics.volume_cubic_m != null && <div className="px-2 py-1 rounded bg-muted text-foreground">Volume: <span className="font-semibold">{viz.metrics.volume_cubic_m}</span></div>}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </motion.div>

        {/* Recent Detections (DB) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-8"
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Recent Detections (from DB)</h2>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={()=> setDetLimit((v)=> Math.max(30, v-30))} disabled={detLimit<=60}>Show fewer</Button>
                <Button size="sm" variant="outline" onClick={()=> setDetLimit((v)=> v + 30)}>Load more</Button>
                  <Button size="sm" variant="outline" onClick={()=> exportDetectionsCsv(detections)}>Export CSV</Button>
              </div>
            </div>
            {detections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No detections available.</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {detections.map((d) => {
                  const props: any = d.properties || {};
                  const title = props.type || props.class || 'Detection';
                  const conf = Number(props.confidence);
                  const area = props.area || props['area_ha'] || props['area_sqkm'] || undefined;
                  const bbox = computeBbox(d.geometry);
                  return (
                    <div key={d.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold truncate" title={title}>{title}</div>
                        {Number.isFinite(conf) && (
                          <Badge variant="outline">{Math.round(conf)}%</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {area && <div>Area: <span className="font-medium">{String(area)}</span></div>}
                        <div>ID: <span className="font-mono">{d.id}</span></div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" onClick={()=> setLocalBbox(bbox)}>Focus</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>
      </main>

      <FloatingChatbot type="authority" />
    </div>
  );
};

// Overlay component: renders absolute-positioned boxes over the target image element
const OverlayBoxes: React.FC<{ boxes: Array<{x:number;y:number;w:number;h:number;score:number;label:string}>; imageSelector: string }>
 = ({ boxes, imageSelector }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(()=>{
    const img = document.querySelector(imageSelector) as HTMLImageElement | null;
    if (!img) return;
    const update = () => setRect(img.getBoundingClientRect());
    update();
    const ro = new ResizeObserver(update);
    ro.observe(img);
    window.addEventListener('scroll', update, true);
    return ()=>{ try{ ro.disconnect(); }catch{} window.removeEventListener('scroll', update, true); };
  }, [imageSelector]);
  if (!rect) return null;
  // We also need the natural dimensions to scale properly
  const img = document.querySelector(imageSelector) as HTMLImageElement | null;
  const natW = img?.naturalWidth || rect.width;
  const natH = img?.naturalHeight || rect.height;
  const sx = rect.width / natW;
  const sy = rect.height / natH;
  return (
    <div className="pointer-events-none absolute inset-0">
      {boxes.map((b, i) => (
        <div key={i}
          className="absolute border-2 border-red-500/80 bg-red-500/10"
          style={{ left: b.x * sx, top: b.y * sy, width: b.w * sx, height: b.h * sy }}
          title={`${b.label || 'object'} ${(b.score*100).toFixed(0)}%`}
        />
      ))}
    </div>
  );
};

export default AIDetection;

// Compute bbox for GeoJSON Polygon/MultiPolygon
function computeBbox(geom: any): [number,number,number,number] | undefined {
  try {
    if (!geom) return undefined as any;
    const pushCoords = (acc: number[], coords: any[]) => {
      for (const c of coords) {
        if (Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number') {
          const [x,y] = c; acc[0] = Math.min(acc[0], x); acc[1] = Math.min(acc[1], y); acc[2] = Math.max(acc[2], x); acc[3] = Math.max(acc[3], y);
        } else if (Array.isArray(c)) {
          pushCoords(acc, c);
        }
      }
    };
    const acc = [Infinity, Infinity, -Infinity, -Infinity];
    if (geom.type === 'Polygon') pushCoords(acc, geom.coordinates);
    else if (geom.type === 'MultiPolygon') pushCoords(acc, geom.coordinates);
    else if (geom.type === 'Point') { const [x,y] = geom.coordinates; return [x,y,x,y]; }
    else return undefined as any;
    if (!Number.isFinite(acc[0])) return undefined as any;
    return acc as any;
  } catch { return undefined as any; }
}

// Lightweight thumbnail component: renders an <img> if map_url is provided by visualization
function JobMiniMap({ jobId }: { jobId: string }){
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async()=>{
      try { const v = await fetch(`${API_BASE_URL}/visualization/${jobId}`, { headers: withAuth() });
        if (!v.ok) return; const data = await v.json(); if (active) setUrl(data?.map_url || null);
      } catch {}
    })();
    return () => { active = false; };
  }, [jobId]);
  if (!url) return null;
  return <img src={url} alt="map" className="h-16 w-28 object-cover rounded border border-border" />
}

// Export detections to a simple CSV (id, type/class, confidence, area)
function exportDetectionsCsv(detections: Array<{ id: string; properties: any }>) {
  try {
    const header = ['id','label','confidence','area'];
    const rows = detections.map((d) => {
      const p: any = d.properties || {};
      const label = p.type || p.class || '';
      const conf = (typeof p.confidence === 'number' || (typeof p.confidence === 'string' && p.confidence.trim() !== '')) ? String(p.confidence) : '';
      const area = p.area ?? p.area_ha ?? p.area_sqkm ?? '';
      return [d.id, label, conf, String(area)];
    });
    const csv = [header, ...rows]
      .map(cols => cols.map(v => {
        const s = String(v ?? '');
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      }).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'detections.csv'; a.click();
    URL.revokeObjectURL(url);
  } catch {}
}
