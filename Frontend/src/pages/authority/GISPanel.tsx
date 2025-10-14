import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import * as turf from '@turf/turf';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import { Button } from '@/components/ui/button';
import FloatingChatbot from '@/components/FloatingChatbot';
import { MapView, MapViewHandle } from '@/components/MapView';

export default function GISPanel() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'within' | 'intersects'>('within');
  const [reportId, setReportId] = useState<string>('');
  const [results, setResults] = useState<Array<{ id: string; report_id: string; geometry: any; properties: any }>>([]);
  const [loading, setLoading] = useState(false);
  const [onlyPolygons, setOnlyPolygons] = useState(false);
  const [geomTypes, setGeomTypes] = useState<string[]>([]);
  const [withCentroid, setWithCentroid] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [browsed, setBrowsed] = useState<Array<{ id: string; report_id: string; geometry: any; properties: any }>>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const resultsMapRef = useRef<MapViewHandle | null>(null);
  const browseMapRef = useRef<MapViewHandle | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      let body = JSON.parse(text);
      // If FeatureCollection with multiple polygons, union them on frontend
      if (body?.type === 'FeatureCollection') {
        try {
          const polys = (body.features || []).filter((f: any) => ['Polygon','MultiPolygon'].includes(f?.geometry?.type));
          if (polys.length > 1) {
            let acc = polys[0];
            for (let i = 1; i < polys.length; i++) acc = turf.union(acc, polys[i]);
            body = acc?.geometry ? acc : acc;
            if (body?.type === 'Feature') body = body.geometry;
          }
        } catch {}
      }
      const url = new URL(window.location.origin);
      if (reportId) {
        // backend expects report_id as query param
      }
  const res = await api.queryIllegalByBoundary(body, mode, { reportId: reportId || undefined, geometryTypes: geomTypes, withCentroid });
      const filtered = onlyPolygons ? res.filter(r => r.geometry?.type && r.geometry.type !== 'Point') : res;
      setResults(filtered);
      // Fit to results
      try {
        if (filtered.length) {
          const fc = { type: 'FeatureCollection', features: filtered.filter(f=>f.geometry).map(f=>({ type:'Feature', geometry: f.geometry, properties: {} })) } as any;
          const bbox = turf.bbox(fc);
          resultsMapRef.current?.fitBounds(bbox as any);
        }
      } catch {}
      toast.success('Query complete', { description: `${res.length} detections outside boundary` });
    } catch (err: any) {
      toast.error('Invalid GeoJSON or request failed', { description: String(err?.message || err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold mb-2">GIS Boundary Check</h1>
          <p className="text-muted-foreground">Paste a GeoJSON Polygon/MultiPolygon and find detections outside it.</p>
        </motion.div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">GeoJSON Boundary</label>
            <textarea
              className="w-full h-48 rounded-md border border-border bg-background p-3 font-mono text-sm"
              placeholder='{"type":"Polygon","coordinates":[[[77.1,28.6],[77.2,28.6],[77.2,28.7],[77.1,28.7],[77.1,28.6]]]}'
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm">Mode:</label>
            <select
              className="border border-border rounded-md bg-background px-2 py-1 text-sm"
              value={mode}
              onChange={(e) => setMode(e.target.value as 'within' | 'intersects')}
            >
              <option value="within">Outside of boundary ($nor $geoWithin)</option>
              <option value="intersects">Not intersecting boundary ($nor $geoIntersects)</option>
            </select>
            <input
              type="text"
              placeholder="Optional report ID"
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              className="border border-border rounded-md bg-background px-2 py-1 text-sm w-64"
            />
            <div className="flex items-center gap-2 text-sm">
              <span>Geometry types:</span>
              {['Point','LineString','Polygon','MultiPolygon'].map(gt => (
                <label key={gt} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={geomTypes.includes(gt)}
                    onChange={(e) => {
                      setGeomTypes((prev) => e.target.checked ? Array.from(new Set([...prev, gt])) : prev.filter(x => x !== gt));
                    }}
                  /> {gt}
                </label>
              ))}
            </div>
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={onlyPolygons} onChange={(e) => setOnlyPolygons(e.target.checked)} /> Only polygons
            </label>
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={withCentroid} onChange={(e) => setWithCentroid(e.target.checked)} /> With centroid
            </label>
            <Button type="submit" disabled={loading}>{loading ? 'Querying…' : 'Run Query'}</Button>
          </div>
        </form>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <MapView
            ref={resultsMapRef}
            boundary={(() => { try { return JSON.parse(text); } catch { return undefined; } })()}
            features={results as any}
            onDraw_change={(gj) => setText(JSON.stringify(gj))}
          />
          {results.length === 0 && (
            <div className="text-sm text-muted-foreground">No results</div>
          )}
          <div className="space-y-3">
            {results.map((r) => (
              <div key={r.id} className="border border-border rounded-md p-3">
                <div className="text-xs text-muted-foreground">Report: {r.report_id} • Type: {r.geometry?.type || '—'}</div>
                <pre className="text-xs overflow-auto whitespace-pre-wrap">{JSON.stringify(r.properties || {}, null, 2)}</pre>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-semibold mb-4">Fetch Detections</h2>
          <div className="flex items-center gap-3 mb-3">
            <input
              type="text"
              placeholder="Report ID"
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              className="border border-border rounded-md bg-background px-2 py-1 text-sm w-64"
            />
            <label className="text-sm">Page size:</label>
            <input type="number" className="w-20 border border-border rounded-md bg-background px-2 py-1 text-sm" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value || 0))} />
            <label className="text-sm">Page:</label>
            <input type="number" className="w-20 border border-border rounded-md bg-background px-2 py-1 text-sm" value={page} onChange={(e) => setPage(Number(e.target.value || 0))} />
            <Button
              variant="outline"
              disabled={!reportId || browseLoading}
              onClick={async () => {
                try {
                  setBrowseLoading(true);
                  const res = await api.listDetections(reportId, pageSize, page * pageSize, { geometryType: geomTypes, withCentroid });
                  const filtered = onlyPolygons ? res.filter(r => r.geometry?.type && r.geometry.type !== 'Point') : res;
                  setBrowsed(filtered);
                } catch (err: any) {
                  toast.error('Fetch failed', { description: String(err?.message || err) });
                } finally {
                  setBrowseLoading(false);
                }
              }}
            >{browseLoading ? 'Loading…' : 'Fetch'}</Button>
            <Button
              variant="secondary"
              onClick={() => {
                // center on browsed results by composing a FeatureCollection bbox
                try {
                  const feats = browsed.filter(f => f.geometry && f.geometry.type).map(f => ({ type: 'Feature', geometry: f.geometry, properties: {} }));
                  if (feats.length) {
                    const fc = { type: 'FeatureCollection', features: feats } as any;
                    const bbox = turf.bbox(fc);
                    browseMapRef.current?.fitBounds(bbox as any);
                  }
                } catch {}
              }}
            >Center on results</Button>
          </div>
          <MapView
            ref={browseMapRef}
            boundary={undefined}
            features={browsed as any}
          />
          <div className="space-y-3 mt-3">
            {browsed.map((r) => (
              <div key={r.id} className="border border-border rounded-md p-3">
                <div className="text-xs text-muted-foreground">{r.id} • {r.geometry?.type || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <FloatingChatbot type="authority" />
    </div>
  );
}
