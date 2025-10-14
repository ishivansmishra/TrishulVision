import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import { useRecentReports } from '@/hooks/useReports';
import { api } from '@/lib/api';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const ReportHistory = () => {
  const { data, isLoading, isError } = useRecentReports();
  const [summary, setSummary] = useState<string>('');
  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">Report History</h1>
        <p className="text-muted-foreground">List of previously generated reports with verification status and downloads.</p>
        <div className="mt-6 bg-card border border-border rounded-lg overflow-hidden">
          {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
          {isError && <div className="p-4 text-sm text-destructive">Failed to load reports.</div>}
          {!isLoading && !isError && (
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">Report ID</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map(r => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3">{r.id}</td>
                    <td className="px-4 py-3">{r.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={async()=>{
                          try {
                            const blob = await api.downloadReportPdf(String(r.id));
                            const url = URL.createObjectURL(blob);
                            const a=document.createElement('a'); a.href=url; a.download=`${r.id}.pdf`; a.click(); URL.revokeObjectURL(url);
                          } catch(e:any){ toast.error('Download failed', { description: String(e?.message||e) }); }
                        }}>PDF</Button>
                        <Button size="sm" variant="outline" onClick={async()=>{
                          try { const s = await api.getReportSummary(String(r.id)); setSummary(s.summary); }
                          catch(e:any){ toast.error('Summary failed', { description: String(e?.message||e) }); }
                        }}>Summary</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!!summary && (
          <div className="mt-6 p-4 border border-border rounded bg-muted/30">
            <h3 className="font-semibold mb-2">AI Summary</h3>
            <p className="text-sm">{summary}</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ReportHistory;
