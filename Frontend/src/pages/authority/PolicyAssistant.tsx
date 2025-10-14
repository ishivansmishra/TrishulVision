import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

const PolicyAssistant = () => {
  const [q, setQ] = useState('What are compliance steps for riverbed sand mining?');
  const [a, setA] = useState('');
  const [busy, setBusy] = useState(false);
  async function ask() {
    setBusy(true);
    try { const r = await api.policyAsk(q); setA(r.reply); } finally { setBusy(false); }
  }
  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">AI Assistant for Mining Policy</h1>
        <div className="flex gap-2 mb-3">
          <input className="flex-1 border rounded px-3 py-2" value={q} onChange={e=>setQ(e.target.value)} />
          <Button onClick={ask} disabled={busy}>{busy?'Asking…':'Ask'}</Button>
        </div>
        {a && <div className="p-3 rounded border whitespace-pre-wrap">{a}</div>}
      </main>
    </div>
  );
};
export default PolicyAssistant;
