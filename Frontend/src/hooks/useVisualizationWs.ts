import { useEffect, useMemo, useRef, useState } from 'react';
import { getWsBaseUrl } from '@/lib/ws';

export type HeatmapEvent =
  | { type: 'heatmap.add'; point: { lat: number; lng: number; intensity: number } }
  | { type: 'heatmap.remove'; point: { lat: number; lng: number } }
  | { type: string; [k: string]: any };

export function useVisualizationWs() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<HeatmapEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const base = getWsBaseUrl();
    const url = new URL(`${base}/visualization/ws`);
    const ws = new WebSocket(url.toString());
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as HeatmapEvent | { type: 'alerts.batch'; items: HeatmapEvent[] };
        if (data && (data as any).type === 'alerts.batch' && Array.isArray((data as any).items)) {
          setEvents((prev) => [ ...(data as any).items, ...prev ].slice(0, 1000));
        } else if (data) {
          setEvents((prev) => [ data as HeatmapEvent, ...prev ].slice(0, 1000));
        }
      } catch {}
    };

    const pingIv = setInterval(() => { try { ws.readyState === WebSocket.OPEN && ws.send('ping'); } catch {} }, 30000);
    return () => { clearInterval(pingIv); try { ws.close(); } catch {} };
  }, []);

  return useMemo(() => ({ connected, events }), [connected, events]);
}
