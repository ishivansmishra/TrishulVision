import { useEffect, useState } from 'react';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import FloatingChatbot from '@/components/FloatingChatbot';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Activity, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import IotPanel from '@/components/IotPanel';

const Analytics = () => {
  const [metrics, setMetrics] = useState<{ reports_total: number; alerts_total: number; blockchain_verified: number; detection_jobs: number; active_sites: number } | null>(null);
  const [jobs, setJobs] = useState<Array<{ id: string; status: string; created_at?: string; area_illegal?: number; volume_cubic_m?: number }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [m, j] = await Promise.all([api.getOverviewMetrics(), api.listDetectionJobs()]);
        setMetrics(m);
        setJobs(j.slice(0, 8));
      } catch (e: any) {
        setError(e?.message || 'Failed to load analytics');
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Analytics Dashboard</h1>
              <p className="text-muted-foreground mt-2">Live analytics from database and AI jobs</p>
            </div>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>

          {/* Stats Grid - live */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {error && (
              <Card className="md:col-span-2 lg:col-span-5 border-destructive">
                <CardHeader><CardTitle>Error</CardTitle></CardHeader>
                <CardContent><p className="text-destructive text-sm">{error}</p></CardContent>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle className="text-sm">Reports Total</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{metrics?.reports_total ?? '—'}</div></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Active Alerts</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{metrics?.alerts_total ?? '—'}</div></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Blockchain Verified</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{metrics?.blockchain_verified ?? '—'}</div></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Detection Jobs</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{metrics?.detection_jobs ?? '—'}</div></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Active Sites</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{metrics?.active_sites ?? '—'}</div></CardContent>
            </Card>
          </div>

          {/* Recent Detection Jobs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Recent Detection Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                {jobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No jobs found.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {jobs.map(j => (
                      <li key={j.id} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{j.id}</p>
                          <p className="text-xs text-muted-foreground">{j.created_at ? new Date(j.created_at).toLocaleString() : ''}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded ${j.status === 'completed' ? 'bg-green-600/20 text-green-600' : 'bg-amber-600/20 text-amber-600'}`}>{j.status}</span>
                          <div className="text-xs mt-1 text-muted-foreground">{j.area_illegal ? `${j.area_illegal} m²` : ''} {j.volume_cubic_m ? `• ${j.volume_cubic_m} m³` : ''}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg p-4">
                  <div className="text-sm w-full">
                    <p>Reports: <span className="font-semibold">{metrics?.reports_total ?? 0}</span></p>
                    <p>Alerts: <span className="font-semibold">{metrics?.alerts_total ?? 0}</span></p>
                    <p>Verified on-chain: <span className="font-semibold">{metrics?.blockchain_verified ?? 0}</span></p>
                    <p>Detection jobs: <span className="font-semibold">{metrics?.detection_jobs ?? 0}</span></p>
                    <p>Active sites: <span className="font-semibold">{metrics?.active_sites ?? 0}</span></p>
                    <div className="mt-2 flex items-center text-muted-foreground">
                      <Activity className="w-4 h-4 mr-2" />
                      <span>Live numbers refresh automatically on page load</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Regional / Additional + IoT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Regional Mining Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Coming from visualization and detections APIs. For now, use map-based views for deeper insights.</p>
              </CardContent>
            </Card>
            <IotPanel />
          </div>
        </motion.div>
      </main>
      <FloatingChatbot type="authority" />
    </div>
  );
};

export default Analytics;
