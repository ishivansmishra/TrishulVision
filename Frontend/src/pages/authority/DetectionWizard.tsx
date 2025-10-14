import { useState } from 'react';
import { api } from '@/lib/api';

export default function DetectionWizard() {
  const [imagery, setImagery] = useState<File | null>(null);
  const [shapefile, setShapefile] = useState<File | null>(null);
  const [dem, setDem] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      const res = await api.createDetectionJob({ imagery: imagery || undefined, shapefile: shapefile || undefined, dem: dem || undefined, notes });
      setResult(res);
    } catch (e) {
      setResult({ error: (e as any)?.message || 'Failed to create job' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Detection Wizard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm">Imagery</label>
          <input type="file" onChange={e=>setImagery(e.target.files?.[0] || null)} />
        </div>
        <div>
          <label className="block text-sm">Shapefile (.zip) or KML</label>
          <input type="file" onChange={e=>setShapefile(e.target.files?.[0] || null)} />
        </div>
        <div>
          <label className="block text-sm">DEM (GeoTIFF)</label>
          <input type="file" onChange={e=>setDem(e.target.files?.[0] || null)} />
        </div>
      </div>
      <div>
        <label className="block text-sm">Notes</label>
        <textarea className="textarea textarea-bordered w-full" value={notes} onChange={e=>setNotes(e.target.value)} />
      </div>
      <button className="btn btn-primary" onClick={onSubmit} disabled={loading}>{loading ? 'Submitting...' : 'Start Detection'}</button>
      {result && (
        <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
