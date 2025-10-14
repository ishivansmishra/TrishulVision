import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import { useAlerts } from '@/hooks/useAlerts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_BASE_URL, withAuth } from '@/lib/config';
import { useState } from 'react';

const AlertHistory = () => {
  const { alerts } = useAlerts();
  const [ackLoading, setAckLoading] = useState<string | null>(null);

  const acknowledge = async (id: string) => {
    setAckLoading(id);
    try {
      const res = await fetch(`${API_BASE_URL}/alerts/${id}/ack`, { method: 'POST', headers: withAuth() });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      console.error('Failed to acknowledge alert', e);
    } finally {
      setAckLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">Alert History & Acknowledgement</h1>
        <p className="text-muted-foreground">Track alerts from database with real-time updates.</p>
        <div className="mt-6 grid gap-4">
          {alerts.length === 0 && (
            <p className="text-sm text-muted-foreground">No alerts yet.</p>
          )}
          {alerts.map((a) => (
            <Card key={a.id} className="p-4 flex items-start justify-between">
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="text-sm text-muted-foreground">{a.location} • {a.created_at ? new Date(a.created_at).toLocaleString() : ''}</p>
                {a.description && <p className="text-sm mt-1">{a.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${a.acknowledged ? 'bg-green-600/20 text-green-600' : 'bg-amber-600/20 text-amber-600'}`}>
                  {a.acknowledged ? 'Acknowledged' : 'Pending'}
                </span>
                {!a.acknowledged && (
                  <Button size="sm" onClick={() => acknowledge(a.id)} disabled={ackLoading === a.id}>Ack</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AlertHistory;
