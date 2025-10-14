import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/config';

export default function DemoModeBanner() {
  const [demo, setDemo] = useState<boolean>(false);
  useEffect(() => {
    // Heuristic: check a light AI health endpoint and a protected call to infer DB status
    (async () => {
      try {
        // Optionally, the backend could expose a /health/details; for now, we check ai/health
        const r = await fetch(`${API_BASE_URL}/ai/health`);
        if (!r.ok) throw new Error('ai not ok');
      } catch {
        setDemo(true); return;
      }
      // Also check if a dev/demo flag exists on token storage
      try {
        const raw = localStorage.getItem('auth:login:last');
        if (raw && /demo_fallback|dev_fallback/i.test(raw)) setDemo(true);
      } catch {}
    })();
  }, []);
  if (!demo) return null;
  return (
    <div className="w-full bg-amber-100 text-amber-900 text-xs py-1 px-3 text-center border-b border-amber-300">
      Demo mode: limited data features while database is unavailable.
    </div>
  );
}
