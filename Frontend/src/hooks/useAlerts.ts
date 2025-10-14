import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL, withAuth } from '@/lib/config';
import { getWsBaseUrl } from '@/lib/ws';

export type AlertItem = {
  id: string;
  type: 'info' | 'warning' | 'critical' | string;
  title?: string;
  location?: string;
  area?: number;
  description?: string;
  created_at?: string;
  acknowledged?: boolean;
};

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch initial alerts
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/alerts/`, { headers: withAuth() });
        if (!res.ok) return;
        const data = (await res.json()) as AlertItem[];
        if (!aborted) setAlerts(data);
      } catch {}
    })();
    return () => { aborted = true; };
  }, []);

  // Connect WS for live updates
  useEffect(() => {
    const base = getWsBaseUrl();
    const token = localStorage.getItem('auth_token');
    const url = `${base}/alerts/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg?.type === 'alerts.batch' && Array.isArray(msg.items)) {
          // Flatten possible batch into list of AlertItem payloads
          const items: AlertItem[] = msg.items.map((i: any) => i?.payload ?? i).filter(Boolean);
          if (items.length) setAlerts((prev) => [...items, ...prev].slice(0, 500));
        } else if (msg?.type === 'alert.created' && msg.payload) {
          setAlerts((prev) => [msg.payload as AlertItem, ...prev].slice(0, 500));
        }
      } catch {}
    };

    // keep-alive ping every 30s
    const pingIv = setInterval(() => {
      try { ws.readyState === WebSocket.OPEN && ws.send('ping'); } catch {}
    }, 30000);

    return () => {
      clearInterval(pingIv);
      try { ws.close(); } catch {}
    };
  }, []);

  return useMemo(() => ({ alerts, connected }), [alerts, connected]);
}
