import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const BlockchainLogs = () => {
  const [logs, setLogs] = useState<Array<{ id: string; report_id?: string; tx_hash: string; verified?: boolean }>>([]);
  const [error, setError] = useState<string>('');
  useEffect(() => {
    (async () => {
      try { const res = await api.blockchainList(); setLogs(res); }
      catch(e:any){ setError(String(e?.message||e)); }
    })();
  }, []);
  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">Blockchain Verified Logs</h1>
        <p className="text-muted-foreground">Immutable logs of reports and verifications stored on-chain for auditability.</p>
        <div className="mt-6 bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">TX Hash</th>
                <th className="px-4 py-3 text-left">Report ID</th>
                <th className="px-4 py-3 text-left">Verified</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">{l.tx_hash}</td>
                  <td className="px-4 py-3">{l.report_id || ''}</td>
                  <td className="px-4 py-3">{String(l.verified ?? true)}</td>
                </tr>
              ))}
              {!logs.length && (
                <tr>
                  <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={3}>{error || 'No logs yet.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default BlockchainLogs;
