import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import Footer from '@/components/Footer';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { api } from '@/lib/api';

export default function GenerativeReports(){
  const [prompt, setPrompt] = useState('Summarize recent illegal mining activities and actions.');
  const [out, setOut] = useState<string>('');
  const run = async () => {
    try { const r = await api.policyAsk(prompt); setOut(r?.reply || JSON.stringify(r)); } catch(e:any){ setOut(String(e?.message||e)); }
  };
  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-4">Generative AI Report Writer</h1>
        <Textarea value={prompt} onChange={(e)=>setPrompt(e.target.value)} className="mb-3" />
        <Button onClick={run}>Generate</Button>
        <pre className="mt-4 p-3 bg-muted rounded text-sm whitespace-pre-wrap">{out}</pre>
      </main>
      <Footer />
    </div>
  );
}
