import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import { useAlerts } from '@/hooks/useAlerts';
import { Card } from '@/components/ui/card';

const AutoEscalation = () => {
  const { alerts } = useAlerts();
  const critical = alerts.filter(a => (a.type || '').toLowerCase() === 'critical');
  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">Auto-Escalation</h1>
        <p className="text-muted-foreground">Real-time view; escalation rules will be managed via backend collection in future.</p>
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Recent Critical Alerts</h3>
            {critical.length === 0 ? (
              <p className="text-sm text-muted-foreground">No critical alerts.</p>
            ) : (
              <ul className="space-y-2">
                {critical.slice(0, 10).map(a => (
                  <li key={a.id} className="text-sm">
                    <span className="font-medium">{a.title}</span> — {a.location} • {a.created_at ? new Date(a.created_at).toLocaleString() : ''}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Escalation Rules</h3>
            <p className="text-sm text-muted-foreground">No rules configured in database.</p>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AutoEscalation;
