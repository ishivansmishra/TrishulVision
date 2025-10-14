import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL, withAuth } from '@/lib/config';
import { Card } from './ui/card';
import { useVisualizationWs } from '@/hooks/useVisualizationWs';

type HeatPoint = { lat: number; lng: number; intensity: number };

export default function VisualizationWidgets() {
  const [points, setPoints] = useState<HeatPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { connected, events } = useVisualizationWs();

  useEffect(() => {
    let cancelled = false;
    const fetchPoints = async () => {
      try {
        const url = new URL(`${API_BASE_URL}/visualization/heatmap`);
        url.searchParams.set('limit', '500');
        const res = await fetch(url.toString(), { headers: withAuth() });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as HeatPoint[];
        if (!cancelled) {
          setPoints(data);
          setLastUpdated(new Date().toLocaleTimeString());
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load heatmap');
      }
    };
    fetchPoints();
    const iv = setInterval(fetchPoints, 15000); // refresh every 15s for live view
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  // Apply WS events on top of current points for near-real-time updates
  useEffect(() => {
    if (!events.length) return;
    setPoints((prev) => {
      let next = [...prev];
      for (const e of events) {
        if (e.type === 'heatmap.add' && e.point) {
          next.push({ lat: e.point.lat, lng: e.point.lng, intensity: e.point.intensity });
        } else if (e.type === 'heatmap.remove' && e.point) {
          // naive remove by proximity match
          const idx = next.findIndex(p => Math.abs(p.lat - e.point.lat) < 1e-4 && Math.abs(p.lng - e.point.lng) < 1e-4);
          if (idx >= 0) next.splice(idx, 1);
        }
      }
      return next;
    });
  }, [events]);

  const bounds = useMemo(() => {
    if (points.length === 0) return null;
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    for (const p of points) {
      minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
      minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng);
    }
    return { minLat, maxLat, minLng, maxLng };
  }, [points]);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">Activity Heatmap (live)</h4>
          <div className="flex items-center gap-2">
            {connected && <span className="text-[10px] px-2 py-0.5 rounded bg-green-600/15 text-green-600">WS</span>}
            {lastUpdated && <span className="text-xs text-muted-foreground">Updated {lastUpdated}</span>}
          </div>
        </div>
        {error && <p className="text-destructive">{error}</p>}
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data available.</p>
        ) : (
          <div className="w-full h-[300px] relative">
            <svg width="100%" height="100%" viewBox="0 0 600 300" preserveAspectRatio="none">
              {/* naive projection into viewbox based on bounds */}
              {points.map((p, i) => {
                if (!bounds) return null;
                const x = ((p.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1)) * 600;
                const y = (1 - (p.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat || 1)) * 300;
                const r = Math.max(2, Math.min(8, p.intensity * 6));
                const alpha = Math.min(0.9, 0.2 + p.intensity * 0.7);
                return <circle key={i} cx={x} cy={y} r={r} fill={`rgba(220,38,38,${alpha})`} />;
              })}
            </svg>
          </div>
        )}
      </Card>
      <Card className="p-4">
        <h4 className="font-semibold mb-2">Summary</h4>
        <p className="text-sm">Points: {points.length}</p>
        {bounds && (
          <p className="text-xs text-muted-foreground mt-2">Bounds: [{bounds.minLat.toFixed(3)},{bounds.minLng.toFixed(3)}] - [{bounds.maxLat.toFixed(3)},{bounds.maxLng.toFixed(3)}]</p>
        )}
      </Card>
    </div>
  );
}
