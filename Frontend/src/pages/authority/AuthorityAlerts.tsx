import { motion } from 'framer-motion';
import { FiAlertTriangle, FiCheckCircle, FiBell } from 'react-icons/fi';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import FloatingChatbot from '@/components/FloatingChatbot';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL, withAuth } from '@/lib/config';
import { toast } from 'sonner';

const AuthorityAlerts = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/alerts/`, { headers: withAuth() });
      if (!res.ok) throw new Error(await res.text());
      setAlerts(await res.json());
    } catch (e:any) {
      setError(String(e?.message||e));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // WebSocket live updates
  useEffect(() => {
    const base = (new URL(API_BASE_URL)).origin.replace(/\/$/, '');
    const wsUrl = base.replace('http', 'ws') + '/alerts/ws';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg?.type === 'alert.created' && msg?.payload) {
          setAlerts((prev) => [msg.payload, ...prev]);
        } else if (msg?.type === 'alerts.batch' && Array.isArray(msg.items)) {
          // items may include both single alert events and other shapes; extract payloads when present
          const payloads = msg.items.map((it:any)=> it?.payload ?? it).filter(Boolean);
          if (payloads.length) setAlerts((prev) => [...payloads, ...prev]);
        }
      } catch {}
    };
    ws.onerror = () => { /* ignore */ };
    ws.onclose = () => { /* ignore */ };
    return () => { try { ws.close(); } catch {} };
  }, []);

  const getAlertStyle = (type: string) => {
    switch (type) {
      case 'critical':
        return { badge: 'destructive', icon: FiAlertTriangle };
      case 'warning':
        return { badge: 'secondary', icon: FiBell };
      case 'info':
        return { badge: 'outline', icon: FiBell };
      default:
        return { badge: 'default', icon: FiBell };
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />

      <main className="flex-1 container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">Alerts & Notifications</h1>
          <p className="text-muted-foreground">Real-time monitoring alerts and AI detection notifications</p>
        </motion.div>

        <div className="space-y-4">
          {loading && <div className="text-sm text-muted-foreground">Loading alerts5</div>}
          {error && <div className="text-sm text-destructive">{error}</div>}
          {alerts.map((alert, index) => {
            const style = getAlertStyle(alert.type);
            const Icon = style.icon;

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card border border-border rounded-xl p-6 hover:border-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4 flex-1">
                    <div className={`p-3 rounded-lg ${alert.type === 'critical' ? 'bg-destructive/10' : 'bg-accent/10'}`}>
                      <Icon className={`w-6 h-6 ${alert.type === 'critical' ? 'text-destructive' : 'text-accent'}`} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{alert.title}</h3>
                        <Badge variant={style.badge as any}>{alert.type}</Badge>
                      </div>

                      <div className="space-y-2 text-sm text-muted-foreground mb-3">
                        <p><strong className="text-foreground">Location:</strong> {alert.location}</p>
                        <p><strong className="text-foreground">Area:</strong> {alert.area}</p>
                        <p>{alert.description}</p>
                      </div>

                      <p className="text-xs text-muted-foreground">{alert.created_at}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={()=>toast.info(alert.title)}>
                      View Details
                    </Button>
                    <Button size="sm" onClick={async()=>{
                      try {
                        const res = await fetch(`${API_BASE_URL}/alerts/${alert.id}/ack`, { method: 'POST', headers: withAuth() });
                        if (!res.ok) throw new Error(await res.text());
                        toast.success('Acknowledged');
                        load();
                      } catch(e:any) {
                        toast.error('Failed', { description: String(e?.message||e) });
                      }
                    }}>
                      <FiCheckCircle className="mr-1 w-4 h-4" />
                      Acknowledge
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 p-6 bg-accent/10 border border-accent/20 rounded-xl"
        >
          <h3 className="text-lg font-semibold mb-2">Real-Time Updates</h3>
          <p className="text-sm text-muted-foreground">
            Alerts are pushed in real-time via WebSocket connection. SMS and email notifications are sent for critical alerts requiring immediate attention.
          </p>
        </motion.div>
      </main>

      <FloatingChatbot type="authority" />
    </div>
  );
};

export default AuthorityAlerts;
