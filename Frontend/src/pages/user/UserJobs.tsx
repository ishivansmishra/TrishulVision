import { useEffect, useState } from 'react';
import { UserNavbar } from '@/components/UserNavbar';
import FloatingChatbot from '@/components/FloatingChatbot';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Job = { id: string; status: string; created_at?: string; area_illegal?: number; volume_cubic_m?: number };

export default function UserJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const j = await api.listDetectionJobs();
      setJobs(j);
    } catch (e: any) {
      toast.error('Failed to load jobs', { description: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    const id = setInterval(() => { refresh(); }, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <UserNavbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">My Detection Jobs</h1>
          <Button onClick={refresh} variant="outline">Refresh</Button>
        </div>
        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : jobs.length === 0 ? (
          <div className="text-muted-foreground">No jobs yet. Submit data from the Upload page.</div>
        ) : (
          <div className="space-y-2">
            {jobs.map((j) => (
              <div key={j.id} className="flex items-center justify-between border border-border rounded-lg p-4 bg-card">
                <div>
                  <div className="font-mono text-sm">{j.id}</div>
                  <div className="text-sm text-muted-foreground">Status: {j.status} {j.area_illegal != null && `— Illegal: ${j.area_illegal} ha`}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={async()=>{
                    try {
                      const d = await api.getDetectionJob(j.id);
                      toast.info('Job', { description: `Status: ${d.status}${d.area_illegal!=null?`, Illegal: ${d.area_illegal} ha`:''}` });
                    } catch (e:any) { toast.error('Failed', { description: String(e?.message||e) }); }
                  }}>Status</Button>
                  <Button size="sm" variant="secondary" onClick={()=>{
                    window.open(`/user/3d-visualization?job=${encodeURIComponent(j.id)}`, '_blank');
                  }}>Open Map</Button>
                  <Button size="sm" variant="outline" onClick={async()=>{
                    try {
                      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/ai/models/jobs/${j.id}/export`, { headers: { ...(localStorage.getItem('auth_token') ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } : {}) } });
                      if (!r.ok) throw new Error(await r.text());
                      const blob = await r.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = `${j.id}.geojson`; a.click(); URL.revokeObjectURL(url);
                    } catch (e:any) { toast.error('Export failed', { description: String(e?.message||e) }); }
                  }}>Export GeoJSON</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <FloatingChatbot type="user" />
    </div>
  );
}
