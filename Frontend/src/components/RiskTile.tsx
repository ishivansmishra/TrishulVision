import React, { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { API_BASE_URL, withAuth } from '@/lib/config';

export default function RiskTile() {
  const [risk, setRisk] = useState<number | null>(null);
  const [surface, setSurface] = useState<number[][]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/ai/predict/risk`, {
          method: 'POST',
          headers: { ...withAuth({ 'Content-Type': 'application/json' }) },
          body: JSON.stringify({ resolution: 24 })
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json() as { risk: number; resolution: number; surface: number[][] };
        setRisk(data.risk);
        setSurface(data.surface || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to fetch risk');
      }
    })();
  }, []);

  const n = surface.length;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold">Risk Surface</h4>
        {risk !== null && <span className="text-sm text-muted-foreground">Risk: <span className="font-medium">{risk}</span></span>}
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {!error && n > 0 ? (
        <div className="w-full h-[240px]">
          <svg width="100%" height="100%" viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" preserveAspectRatio="none">
            {surface.map((row, i) => row.map((v, j) => {
              const c = Math.max(0, Math.min(1, v));
              const r = Math.floor(255 * c);
              const g = Math.floor(100 * (1 - c));
              const b = 50;
              return <rect key={`${i}-${j}`} x={j} y={i} width={1} height={1} fill={`rgb(${r},${g},${b})`} />
            }))}
          </svg>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No data</p>
      )}
    </Card>
  );
}
