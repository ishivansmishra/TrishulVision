import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function IllegalReports(){
  const [items, setItems] = useState<Array<{ id: string; status: string; created_at?: string }>>([]);
  useEffect(()=>{ (async()=>{ try{ const reps = await api.listReports(); setItems(reps.map(r=>({ id: r.id, status: r.status, created_at: r.created_at })))} catch{} })(); },[]);
  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Illegal Mining Highlights</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(it=> (
            <Card key={it.id} className="p-4">
              <div className="font-mono text-sm">{it.id}</div>
              <div className="text-sm text-muted-foreground">{it.status} — {it.created_at ? new Date(it.created_at).toLocaleString() : ''}</div>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
