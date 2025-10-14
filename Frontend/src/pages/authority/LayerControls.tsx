import { useEffect, useState } from 'react';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';

const LayerControls = () => {
  const [layers, setLayers] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const data = await api.listShapefiles();
        setLayers(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load shapefiles');
      }
    })();
  }, []);
  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">Layer Controls</h1>
        <p className="text-muted-foreground">Shapefiles from database; enable/disable in map modules.</p>
        <Card className="p-4 mt-4">
          {error && <p className="text-destructive">{error}</p>}
          {layers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shapefiles uploaded.</p>
          ) : (
            <ul className="text-sm list-disc pl-6">
              {layers.map(l => <li key={l.id}>{l.name}</li>)}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
};

export default LayerControls;
