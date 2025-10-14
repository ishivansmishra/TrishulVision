import { UserNavbar } from '@/components/UserNavbar';
import Footer from '@/components/Footer';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function ActivitySummary(){
  const [metrics, setMetrics] = useState<any>(null);
  useEffect(()=>{ (async()=>{ try{ const m = await api.getOverviewMetrics(); setMetrics(m);} catch{} })(); },[]);
  return (
    <div className="min-h-screen flex flex-col">
      <UserNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Activity Summary</h1>
        <div className="text-sm text-muted-foreground">{metrics ? JSON.stringify(metrics) : 'Loading…'}</div>
      </main>
      <Footer />
    </div>
  );
}
