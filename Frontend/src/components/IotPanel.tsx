import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useIot } from '@/hooks/useIot';
import { useState } from 'react';

export default function IotPanel({ sensor: initialSensor }: { sensor?: string }) {
  const [sensor, setSensor] = useState(initialSensor || '');
  const { events, connected } = useIot(sensor || undefined);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h3 className="font-semibold">IoT Stream {sensor ? `(${sensor})` : ''}</h3>
        <div className="flex-1"></div>
        <Input placeholder="Filter by sensor id" value={sensor} onChange={(e)=>setSensor(e.target.value)} className="max-w-xs" />
        <span className={`text-xs px-2 py-1 rounded ${connected ? 'bg-green-600/20 text-green-600' : 'bg-amber-600/20 text-amber-600'}`}>{connected ? 'Live' : 'Offline'}</span>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No IoT events yet.</p>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-auto">
          {events.slice(0, 20).map((e) => (
            <li key={e.id} className="border border-border rounded p-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono">{e.sensor || 'sensor'}</span>
                <span className="text-muted-foreground text-xs">{e.timestamp ? new Date(e.timestamp as any).toLocaleString() : ''}</span>
              </div>
              <div className="text-xs">
                {typeof e.value !== 'undefined' ? <span className="font-semibold">{e.value} {e.unit || ''}</span> : <span className="text-muted-foreground">—</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
