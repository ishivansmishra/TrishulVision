import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL, withAuth } from '@/lib/config';

const IoTSensorAnalytics = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/iot?limit=50`, { headers: withAuth() });
        if (!res.ok) throw new Error(await res.text());
        setRows(await res.json());
      } catch (e:any) {
        setErr(String(e?.message||e));
      }
    })();
  }, []);

  // Live updates via WebSocket
  useEffect(() => {
    try {
      const base = (new URL(API_BASE_URL)).origin.replace(/\/$/, '');
      const wsUrl = base.replace('http', 'ws') + '/iot/ws';
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.type === 'iot' && msg?.data) {
            setRows((prev) => [{...msg.data, timestamp: msg.data.timestamp}, ...prev].slice(0, 200));
          }
        } catch {}
      };
      ws.onerror = () => {};
      ws.onclose = () => {};
      return () => { try { ws.close(); } catch {} };
    } catch {}
  }, []);
  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">IoT Sensor Analytics</h1>
        <p className="text-muted-foreground">Time-series charts and anomaly detection for vibration, air quality, noise, and temperature sensors.</p>
        <div className="mt-6 bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">Timestamp</th>
                <th className="px-4 py-3 text-left">Sensor</th>
                <th className="px-4 py-3 text-left">Value</th>
                <th className="px-4 py-3 text-left">Meta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3 text-sm">{r.timestamp}</td>
                  <td className="px-4 py-3">{r.sensor || '—'}</td>
                  <td className="px-4 py-3">{r.value ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{JSON.stringify(r.meta || {})}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={4}>{err || 'No data yet.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default IoTSensorAnalytics;
