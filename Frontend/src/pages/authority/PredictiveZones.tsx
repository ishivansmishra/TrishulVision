import { useEffect, useState } from 'react';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';

const PredictiveZones = () => {
  const [zones, setZones] = useState<Array<{ id: string; properties: any }>>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const items = await api.listRecentDetections(50);
        setZones(items);
      } catch (e: any) {
        setError(e?.message || 'Failed to load detections');
      }
    })();
  }, []);
  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">Predictive Mining Zones</h1>
        <p className="text-muted-foreground">Recent detections from database (proxy for risk zones when prediction model unavailable).</p>
        <Card className="p-4 mt-4">
          {error && <p className="text-destructive">{error}</p>}
          {zones.length === 0 ? (
            <p className="text-sm text-muted-foreground">No detections available.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {zones.map(z => (
                <li key={z.id} className="border border-border rounded p-2">
                  <span className="font-medium">Detection {z.id}</span>
                  {z.properties?.confidence && <span className="ml-2">Confidence: {z.properties.confidence}</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
};

export default PredictiveZones;
