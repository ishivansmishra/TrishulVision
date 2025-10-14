import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL, withAuth } from '@/lib/config';
import { getWsBaseUrl } from '@/lib/ws';

export type IotEvent = {
  id: string;
  sensor?: string;
  value?: number | string;
  unit?: string;
  timestamp?: string | Date;
  [key: string]: any;
};

export function useIot(sensor?: string) {
  const [events, setEvents] = useState<IotEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Initial fetch
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const url = new URL(`${API_BASE_URL}/iot/`);
        if (sensor) url.searchParams.set('sensor', sensor);
        const res = await fetch(url.toString(), { headers: withAuth() });
        if (!res.ok) return;
        const data = (await res.json()) as IotEvent[];
        if (!aborted) setEvents(data);
      } catch {}
    })();
    return () => { aborted = true; };
  }, [sensor]);

  // WS stream
  useEffect(() => {
    const base = getWsBaseUrl();
    const token = localStorage.getItem('auth_token');
    const url = new URL(`${base}/iot/ws`);
    if (token) url.searchParams.set('token', token);
    if (sensor) url.searchParams.set('sensor', sensor);
    const ws = new WebSocket(url.toString());
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg?.type === 'iot' && msg.data) {
          setEvents((prev) => [msg.data as IotEvent, ...prev].slice(0, 500));
        }
      } catch {}
    };

    const pingIv = setInterval(() => { try { ws.readyState === WebSocket.OPEN && ws.send('ping'); } catch {} }, 30000);
    return () => { clearInterval(pingIv); try { ws.close(); } catch {} };
  }, [sensor]);

  return useMemo(() => ({ events, connected }), [events, connected]);
}
