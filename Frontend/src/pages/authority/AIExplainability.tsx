import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function AIExplainability() {
  const [detectionId, setDetectionId] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function runExplain() {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/ai/xai/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detection_id: detectionId || undefined, context }),
      });
      const j = await r.json();
      setResult(j);
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">AI Explainability Dashboard</h1>
      <p className="text-sm text-muted-foreground">
        Enter a detection ID to generate an interpretable explanation (factors + attributions).
      </p>
      <div className="space-y-2">
        <label className="text-sm">Detection ID</label>
        <Input placeholder="detection _id from /mining/detections" value={detectionId} onChange={(e)=>setDetectionId(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm">Operator Notes (optional)</label>
        <Textarea placeholder="Any notes or context that may help justify the decision" value={context} onChange={(e)=>setContext(e.target.value)} />
      </div>
      <Button disabled={loading} onClick={runExplain}>{loading ? 'Explaining…' : 'Explain'}</Button>
      {result && (
        <pre className="bg-muted p-3 rounded overflow-auto text-xs">
{JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
