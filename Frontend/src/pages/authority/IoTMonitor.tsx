import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import Footer from '@/components/Footer';
import { useEffect, useState } from 'react';
import { API_BASE_URL, withAuth } from '@/lib/config';
import { api } from '@/lib/api';

export default function IoTMonitor(){
  const [rows, setRows] = useState<any[]>([]);
  useEffect(()=>{ (async()=>{ try{ const r = await fetch(`${API_BASE_URL}/iot/`, { headers: withAuth() }); if(r.ok){
        const data = await r.json();
        // Try scoring anomaly per sensor row if values array exists
        const enriched = await Promise.all((data||[]).map(async (row:any)=>{
          try{
            if (Array.isArray(row.values) && row.values.length){
              const s = await api.scoreIoTAnomaly(row.values as number[]);
              return { ...row, anomaly: s.anomaly, score: s.score };
            }
          } catch {}
          return row;
        }));
        setRows(enriched);
      } } catch{} })(); },[]);
  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">IoT Monitoring</h1>
        <div className="space-y-2 text-sm">
          {rows.map((r)=> (
            <div key={r.id} className={`border rounded p-3 flex justify-between ${r.anomaly ? 'border-red-500 bg-red-50' : 'border-border'}`}>
              <div className="font-mono">{r.sensor || 'sensor'}</div>
              <div className="flex items-center gap-3 text-muted-foreground">
                {typeof r.score === 'number' && <span>Anomaly: {(r.score*100).toFixed(0)}%</span>}
                <span>{r.timestamp ? new Date(r.timestamp).toLocaleString() : ''}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
