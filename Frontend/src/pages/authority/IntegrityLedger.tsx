import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const IntegrityLedger = () => {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => { (async () => { try { setLogs(await api.listIntegrityLogs()); } catch {} })(); }, []);
  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Data Integrity Ledger</h1>
        <div className="space-y-2">
          {logs.map((l, i) => (
            <div key={i} className="p-3 border rounded">
              <div className="font-mono text-xs break-all">sha256: {l.sha256}</div>
              {l.tx_hash && <div className="font-mono text-xs break-all">tx: {l.tx_hash} {l.verified ? '✅' : '❔'}</div>}
              {l.ipfs_cid && <div className="font-mono text-xs break-all">ipfs: {l.ipfs_cid}</div>}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
export default IntegrityLedger;
