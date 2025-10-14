import { useCallback, useRef, useState } from 'react';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { MapView } from '@/components/MapView';
import type { MapViewHandle } from '@/components/MapView';

const ComplianceChecker = () => {
  const [lease, setLease] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [features, setFeatures] = useState<any[]>([]);
  const mapRef = useRef<MapViewHandle>(null);

  const onDrawChange = useCallback((gj: any) => setLease(gj), []);

  const onUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      setBusy(true);
      const { geojson } = await api.uploadConvertGeoJSON(f);
      setLease(geojson);
      toast.success('Boundary loaded');
    } catch (err: any) {
      toast.error('Failed to import boundary', { description: String(err?.message||err) });
    } finally { setBusy(false); }
  }, []);

  const run = useCallback(async () => {
    if (!lease) { toast.message('Provide a lease boundary (draw or upload).'); return; }
    try {
      setBusy(true);
      const r = await api.complianceCheck(lease);
      setResult(r);
      setFeatures((r.outside||[]).map((d: any) => ({ geometry: d.geometry })));
      toast.success(`Score: ${r.compliance_score} | Outside: ${r.outside_count}`);
      // Fit map if available
      mapRef.current?.fitToGeoJSON?.(lease);
    } catch (err:any) {
      toast.error('Compliance check failed', { description: String(err?.message||err) });
    } finally { setBusy(false); }
  }, [lease]);

  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">AI Legal Mining Compliance Checker</h1>
          <div className="flex items-center gap-2">
            <input type="file" accept=".kml,.zip" onChange={onUpload} />
            <Button onClick={run} disabled={busy}>{busy ? 'Checking…' : 'Run Check'}</Button>
          </div>
        </div>
        {result && (
          <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded border"><div className="text-muted-foreground text-sm">Compliance score</div><div className="text-xl font-semibold">{result.compliance_score}</div></div>
            <div className="p-3 rounded border"><div className="text-muted-foreground text-sm">Outside count</div><div className="text-xl font-semibold">{result.outside_count}</div></div>
            <div className="p-3 rounded border"><div className="text-muted-foreground text-sm">Outside area</div><div className="text-xl font-semibold">{result.outside_area ?? 'N/A'}</div></div>
            <div className="p-3 rounded border"><div className="text-muted-foreground text-sm">Lease area</div><div className="text-xl font-semibold">{result.lease_area ?? 'N/A'}</div></div>
          </div>
        )}
        <MapView ref={mapRef} boundary={lease} features={features} onDraw_change={onDrawChange} />
      </main>
    </div>
  );
};

export default ComplianceChecker;
