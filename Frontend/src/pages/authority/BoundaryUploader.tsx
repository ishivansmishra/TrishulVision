import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import { MapView } from '@/components/MapView';

export default function BoundaryUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [geojson, setGeojson] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);

  const onUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.uploadConvertGeoJSON(file);
      setGeojson(res.geojson);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Boundary Uploader (Shapefile/KML → GeoJSON)</h1>
      <div className="flex items-center gap-3">
        <input type="file" onChange={e=>setFile(e.target.files?.[0] || null)} />
        <button className="btn btn-primary" onClick={onUpload} disabled={!file || uploading}>
          {uploading ? 'Uploading...' : 'Upload & Convert'}
        </button>
      </div>
      <div>
        {geojson ? (
          <MapView boundary={geojson} features={[]} />
        ) : (
          <div className="text-gray-500">Upload a .zip (shapefile) or .kml to preview the lease boundary on the map.</div>
        )}
      </div>
    </div>
  );
}
