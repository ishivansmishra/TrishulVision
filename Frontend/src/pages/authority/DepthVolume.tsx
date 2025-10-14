import { useState } from 'react';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';

const DepthVolume = () => {
  const [boundary, setBoundary] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ volume_cubic_m: number; dem_source: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null); setResult(null); setLoading(true);
    try {
      const geojson = JSON.parse(boundary);
      const out = await api.demEstimateVolume({ dem_source: 'SRTM', boundary: geojson });
      setResult(out);
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">Depth & Volume Estimation</h1>
        <p className="text-muted-foreground">DEM-based depth and volume estimation from your AOI boundary.</p>
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="text-sm mb-2">Paste AOI Polygon/MultiPolygon GeoJSON</p>
            <Textarea value={boundary} onChange={(e)=>setBoundary(e.target.value)} placeholder='{"type":"Polygon","coordinates":[[[77.1,28.6],[77.2,28.6],[77.2,28.7],[77.1,28.7],[77.1,28.6]]]}' rows={10} />
            <Button className="mt-3" onClick={run} disabled={loading}>Estimate Volume</Button>
            {error && <p className="text-destructive mt-2">{error}</p>}
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Result</h3>
            {!result ? (
              <p className="text-sm text-muted-foreground">No result yet.</p>
            ) : (
              <div className="space-y-1 text-sm">
                <p>Volume (m³): <span className="font-semibold">{Math.round(result.volume_cubic_m)}</span></p>
                <p>DEM Source: {result.dem_source}</p>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DepthVolume;
