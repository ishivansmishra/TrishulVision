import { useEffect, useState } from 'react';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import { Card } from '@/components/ui/card';
import { API_BASE_URL, withAuth } from '@/lib/config';

const EnvironmentalMetrics = () => {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/metrics/overview`, { headers: withAuth() });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setMetrics(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load metrics');
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">Environmental Impact Metrics</h1>
        <p className="text-muted-foreground">Database-backed indicators only. No dummy content.</p>
        {error && <p className="text-destructive mt-4">{error}</p>}
        {metrics && (
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total Reports</p>
              <p className="text-3xl font-bold">{metrics.reports_total}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total Alerts</p>
              <p className="text-3xl font-bold">{metrics.alerts_total}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Blockchain Verified</p>
              <p className="text-3xl font-bold">{metrics.blockchain_verified}</p>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default EnvironmentalMetrics;
