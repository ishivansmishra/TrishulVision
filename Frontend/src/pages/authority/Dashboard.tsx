import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import Footer from '@/components/Footer';
import CesiumViewer from '@/components/CesiumViewer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const Dashboard = () => {
  const [jobId, setJobId] = useState('');
  const [reportId, setReportId] = useState('');
  const [polys, setPolys] = useState<any[]>([]);
  const [legal, setLegal] = useState<any | undefined>(undefined);
  const [depthPolys, setDepthPolys] = useState<Array<{ geometry:any; properties?: { depth?: number } }>>([]);
  const [bbox, setBbox] = useState<[number,number,number,number] | undefined>(undefined);

  const loadVis = async () => {
    if (!jobId) { toast.message('Enter a Job ID to load visualization'); return; }
    try {
      const v = await api.getVisualization(jobId);
      const illegal: any[] = Array.isArray(v.layers?.illegal_zones) ? v.layers.illegal_zones : [];
      const legalB = v.layers?.legal_boundary;
      const dpolys: any[] = Array.isArray(v.layers?.depth_polygons) ? v.layers.depth_polygons : [];
      setPolys(illegal.filter(g => g && (g.type === 'Polygon' || g.type === 'MultiPolygon')));
      setLegal(legalB);
      setDepthPolys(dpolys.filter(f => f?.geometry).map(f=>({ geometry: f.geometry, properties: f.properties })));
      setBbox(Array.isArray(v.aoi_bbox) && v.aoi_bbox.length === 4 ? v.aoi_bbox : undefined);
    } catch (e:any) {
      toast.error('Failed to load visualization', { description: String(e?.message||e) });
      setPolys([]); setLegal(undefined); setDepthPolys([]); setBbox(undefined);
    }
  };

  const pinReport = async () => {
    if (!reportId) { toast.message('Enter a Report ID to pin'); return; }
    try { const r = await api.pinReport(reportId); toast.success('Pinned to IPFS', { description: `CID: ${r.cid} | tx: ${r.tx_hash}` }); }
    catch(e:any) { toast.error('Pin failed', { description: String(e?.message||e) }); }
  };

  const verifyReport = async () => {
    if (!reportId) { toast.message('Enter a Report ID to verify'); return; }
    try { const r = await api.getReportAuthenticity(reportId); toast.info('Authenticity', { description: `Valid: ${r.valid ? 'Yes' : 'No'}${r.tx_hash ? `, tx: ${r.tx_hash}`:''}` }); }
    catch(e:any) { toast.error('Verify failed', { description: String(e?.message||e) }); }
  };

  useEffect(() => { /* placeholder */ }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-bold">Authority Dashboard</h1>
          <p className="text-muted-foreground">Quick 3D visualization and report authenticity controls</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Visualization</h3>
            <div className="flex gap-2">
              <Input placeholder="Enter Detection Job ID" value={jobId} onChange={e=>setJobId(e.target.value)} />
              <Button variant="secondary" onClick={loadVis}>Load</Button>
            </div>
            <div className="text-xs text-muted-foreground">Loads illegal zones, legal boundary and optional depth overlays for the job.</div>
          </Card>

          <Card className="p-4 space-y-3 lg:col-span-2">
            <h3 className="font-semibold">Report Authenticity</h3>
            <div className="flex gap-2">
              <Input placeholder="Enter Report ID" value={reportId} onChange={e=>setReportId(e.target.value)} />
              <Button onClick={pinReport}>Pin & Log</Button>
              <Button variant="outline" onClick={verifyReport}>Verify</Button>
            </div>
            <div className="text-xs text-muted-foreground">Pins the report PDF to IPFS and logs to blockchain; Verify checks on-chain status.</div>
          </Card>
        </div>

        <div className="mt-6">
          <Card className="overflow-hidden">
            <CesiumViewer polygons={polys} legalBoundary={legal} depthPolygons={depthPolys} bbox={bbox} />
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
