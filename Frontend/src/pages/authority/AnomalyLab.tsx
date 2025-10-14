import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

const AnomalyLab = () => {
  const [url, setUrl] = useState('https://example.com/scene.png');
  const [label, setLabel] = useState('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [caption, setCaption] = useState('');

  async function classify() {
    const r = await api.anomalyClassify(url); setLabel(r.label); setConfidence(r.confidence);
  }
  async function doCaption() {
    const r = await api.captionImage(url); setCaption(r.caption);
  }
  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">AI-Powered Anomaly & Captioning</h1>
        <div className="flex gap-2 mb-3">
          <input className="flex-1 border rounded px-3 py-2" value={url} onChange={e=>setUrl(e.target.value)} />
          <Button onClick={classify}>Classify</Button>
          <Button variant="secondary" onClick={doCaption}>Caption</Button>
        </div>
        {(label || caption) && (
          <div className="grid md:grid-cols-2 gap-3">
            <div className="p-3 border rounded">
              <div className="text-muted-foreground text-sm">Classifier</div>
              <div className="text-lg">{label} {confidence!==null && <span className="text-muted-foreground">({confidence})</span>}</div>
            </div>
            <div className="p-3 border rounded">
              <div className="text-muted-foreground text-sm">Caption</div>
              <div>{caption}</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
export default AnomalyLab;
