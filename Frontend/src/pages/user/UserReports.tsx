import { motion } from 'framer-motion';
import { FiDownload, FiEye, FiCheckCircle, FiShield } from 'react-icons/fi';
import { UserNavbar } from '@/components/UserNavbar';
import FloatingChatbot from '@/components/FloatingChatbot';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useRecentReports } from '@/hooks/useReports';
import { format } from 'date-fns';

function decodeJwtPayload(token: string): any | null {
  try {
    const part = token.split('.')[1] || '';
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    return JSON.parse(atob(base64));
  } catch { return null; }
}

const UserReports = () => {
  const token = localStorage.getItem('auth_token') || '';
  const email = (token && decodeJwtPayload(token)?.sub) || undefined;
  const { data, isLoading, isError } = useRecentReports(email);
  const reports = (data ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    date: r.created_at ? format(new Date(r.created_at), 'yyyy-MM-dd') : '-',
    area: (r.result && (r.result.area || r.result.area_ha)) ? `${r.result.area || r.result.area_ha} ha` : '—',
    hash: r.result?.tx_hash || '—',
  }));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'compliant':
        return (
          <Badge className="bg-success text-success-foreground">
            <FiCheckCircle className="mr-1 w-3 h-3" /> {status}
          </Badge>
        );
      case 'illegal':
      case 'failed':
        return <Badge className="bg-destructive text-destructive-foreground">{status}</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary">{status || 'pending'}</Badge>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <UserNavbar />

      <main className="flex-1 container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">My Reports</h1>
          <p className="text-muted-foreground">AI-generated compliance reports for your mining operations</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border overflow-hidden"
        >
          <div className="overflow-x-auto">
            {isLoading && (
              <div className="p-6 text-sm text-muted-foreground">Loading reports…</div>
            )}
            {isError && (
              <div className="p-6 text-sm text-destructive">Failed to load reports.</div>
            )}
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Report ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Area Analyzed</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report, index) => (
                  <motion.tr
                    key={report.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-t border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-sm">{report.id}</td>
                    <td className="px-6 py-4 font-semibold">{report.area}</td>
                    <td className="px-6 py-4">{getStatusBadge(report.status)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{report.date}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <FiEye className="mr-1 w-4 h-4" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const blob = await api.downloadReportPdf(String(report.id));
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${report.id}.pdf`;
                              a.click();
                              URL.revokeObjectURL(url);
                            } catch (err: any) {
                              toast.error('Download failed', { description: String(err?.message || err) });
                            }
                          }}
                        >
                          <FiDownload className="mr-1 w-4 h-4" />
                          PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const res = await api.blockchainVerify(String(report.hash));
                              toast.success('Verified on-chain', { description: `Valid: ${String(res.valid)} (${res.tx_hash})` });
                            } catch (err: any) {
                              toast.error('Verification failed', { description: String(err?.message || err) });
                            }
                          }}
                        >
                          <FiShield className="mr-1 w-4 h-4" />
                          Verify
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Removed dummy blockchain hash card; verification is available per-report via actions */}
      </main>

      <FloatingChatbot type="user" />
    </div>
  );
};

export default UserReports;
