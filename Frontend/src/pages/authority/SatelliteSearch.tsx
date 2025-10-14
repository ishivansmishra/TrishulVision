import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { MapView } from '@/components/MapView';

export default function SatelliteSearch() {
  const [shortName, setShortName] = useState('SENTINEL-2');
  const [bbox, setBbox] = useState('77.1,28.55,77.35,28.75');
  const [temporal, setTemporal] = useState('2025-01-01T00:00:00Z,2025-10-10T00:00:00Z');
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [jobResp, setJobResp] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|undefined>();
  const [olderDate, setOlderDate] = useState('');

  const onSearch = async () => {
    setLoading(true); setError(undefined);
    try {
      const res = await api.nasaCmrSearch({ short_name: shortName, bbox, temporal, page_size: 20 });
      const items = res?.feed?.entry || [];
      setResults(items);
    } catch (e: any) {
      setError(e?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const onCreateJob = async () => {
    if (!selected) return;
    setLoading(true); setJobResp(null);
    try {
      // Best-effort: pull a downloadable link from links or id; in production, resolve authenticated download
  const url = selected?.links?.[0]?.href || selected?.id || '';
  const res = await api.createDetectionJobFromUrl(url, `CMR scene ${selected?.id}`, 'earthdata');
      setJobResp(res);
    } catch (e: any) {
      setJobResp({ error: e?.message || 'Failed to create job' });
    } finally {
      setLoading(false);
    }
  };

  const bboxText = useMemo(() => {
    const boxes = selected?.boxes;
    if (!boxes || !boxes[0]) return '';
    // boxes is array of strings 'minLon minLat maxLon maxLat'
    return String(boxes[0]);
  }, [selected]);

  const bboxGeoJSON = useMemo(() => {
    if (!selected?.boxes || !selected.boxes[0]) return null as any;
    const parts = String(selected.boxes[0]).split(/[ ,]+/).map(Number);
    if (parts.length < 4) return null as any;
    const [minLon, minLat, maxLon, maxLat] = parts as [number,number,number,number];
    return {
      type: 'Polygon',
      coordinates: [[[minLon, minLat],[maxLon, minLat],[maxLon, maxLat],[minLon, maxLat],[minLon, minLat]]]
    };
  }, [selected]);

  const onCreateJobFromBbox = async () => {
    if (!selected?.boxes || !selected?.boxes[0]) return;
    setLoading(true); setJobResp(null);
    try {
      const parts = String(selected.boxes[0]).split(/[ ,]+/).map(Number);
      const bbox: [number,number,number,number] = [parts[0], parts[1], parts[2], parts[3]];
        const res = await api.createDetectionJobFromBbox(bbox, `CMR bbox ${selected?.id}`, olderDate || undefined);
      setJobResp(res);
    } catch (e: any) {
      setJobResp({ error: e?.message || 'Failed to create job from bbox' });
    } finally { setLoading(false); }
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Satellite Search (NASA CMR)</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm">Short Name</label>
          <input className="input input-bordered w-full" value={shortName} onChange={e=>setShortName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">BBox (minLon,minLat,maxLon,maxLat)</label>
          <input className="input input-bordered w-full" value={bbox} onChange={e=>setBbox(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Temporal (start,end)</label>
          <input className="input input-bordered w-full" value={temporal} onChange={e=>setTemporal(e.target.value)} />
        </div>
          <div>
            <label className="block text-sm">Older Date (YYYY-MM-DD)</label>
            <input className="input input-bordered w-full" placeholder="optional" value={olderDate} onChange={e=>setOlderDate(e.target.value)} />
          </div>
        <div className="flex items-end">
          <button className="btn btn-primary" onClick={onSearch} disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
        </div>
      </div>
      {error && <div className="text-red-600">{error}</div>}
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Select</th>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Title</th>
              <th className="p-2 text-left">Time</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r: any) => (
              <tr key={r.id} className="border-t">
                <td className="p-2"><input type="radio" name="cmrSel" onChange={()=>setSelected(r)} /></td>
                <td className="p-2">{r.id}</td>
                <td className="p-2">{r.title}</td>
                <td className="p-2">{(r.time_start || '') + ' → ' + (r.time_end || '')}</td>
              </tr>
            ))}
            {!loading && results.length === 0 && (
              <tr><td colSpan={3} className="p-3 text-gray-500">No results</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {selected && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">Selected bbox: {bboxText || 'N/A'}</div>
          {bboxGeoJSON && (
            <div className="border rounded p-2">
              <MapView boundary={bboxGeoJSON} features={[]} />
            </div>
          )}
          <button className="btn btn-success" onClick={onCreateJob} disabled={loading}>Create Detection Job from Scene</button>
          <button className="btn btn-outline" onClick={onCreateJobFromBbox} disabled={loading}>Create Job from BBOX</button>
          {jobResp && <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto">{JSON.stringify(jobResp, null, 2)}</pre>}
        </div>
      )}
    </div>
  );
}
