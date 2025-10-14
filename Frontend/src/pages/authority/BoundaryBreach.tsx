import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import { MapView } from '@/components/MapView';
import { useCallback, useMemo, useRef, useState } from 'react';
import { API_BASE_URL, withAuth } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { MapViewHandle } from '@/components/MapView';

const BoundaryBreach = () => {
  const [boundary, setBoundary] = useState<any>(null);
  const [features, setFeatures] = useState<Array<{ geometry: any; centroid?: any }>>([]);
  const [busy, setBusy] = useState(false);
  const mapRef = useRef<MapViewHandle>(null);

  const onDrawChange = useCallback((geojson: any) => {
    setBoundary(geojson);
  }, []);

  const runQuery = useCallback(async () => {
    if (!boundary) { toast.info('Draw a polygon first.'); return; }
    try {
      setBusy(true);
      const url = new URL(`${API_BASE_URL}/mining/illegal/by-boundary`);
      url.searchParams.set('with_centroid', 'true');
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { ...withAuth({ 'Content-Type': 'application/json' }) },
        body: JSON.stringify(boundary),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const mapped = (data || []).map((d: any) => ({ geometry: d.geometry, centroid: d.centroid }));
      setFeatures(mapped);
      toast.success(`Found ${mapped.length} potential breaches`);
    } catch (e:any) {
      toast.error('Query failed', { description: String(e?.message||e) });
    } finally { setBusy(false); }
  }, [boundary]);

  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">Boundary Breach Detection</h1>
        <p className="text-muted-foreground mb-4">Draw a boundary polygon on the map. The system will highlight detections outside this boundary.</p>
        <div className="mb-3">
          <Button onClick={runQuery} disabled={busy}>{busy ? 'Checking…' : 'Check Boundary Breaches'}</Button>
        </div>
        <MapView ref={mapRef} boundary={boundary} features={features} onDraw_change={onDrawChange} />
      </main>
    </div>
  );
};

export default BoundaryBreach;
