import { useEffect, useState } from 'react';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';

const VerificationWorkflow = () => {
  const [logs, setLogs] = useState<Array<{ id: string; report_id?: string; tx_hash: string; verified?: boolean }>>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const data = await api.blockchainList();
        setLogs(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load logs');
      }
    })();
  }, []);
  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">Verification Workflow</h1>
        <p className="text-muted-foreground">On-chain integrity logs from database only.</p>
        <Card className="p-4 mt-4">
          {error && <p className="text-destructive">{error}</p>}
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No blockchain logs found.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {logs.map(l => (
                <li key={l.id} className="border border-border rounded p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p>Tx: <span className="font-mono">{l.tx_hash}</span></p>
                      {l.report_id && <p className="text-xs text-muted-foreground">Report: {l.report_id}</p>}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${l.verified ? 'bg-green-600/20 text-green-600' : 'bg-amber-600/20 text-amber-600'}`}>{l.verified ? 'Verified' : 'Unverified'}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
};

export default VerificationWorkflow;
