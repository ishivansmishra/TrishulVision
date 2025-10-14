import { motion } from 'framer-motion';
import { FiDownload, FiEye, FiCheckCircle, FiClock, FiAlertTriangle, FiShield } from 'react-icons/fi';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import FloatingChatbot from '@/components/FloatingChatbot';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRecentReports } from '@/hooks/useReports';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const AuthorityReports = () => {
  const { data, isLoading, isError } = useRecentReports();
  const reports = (data ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    date: r.created_at ? format(new Date(r.created_at), 'yyyy-MM-dd') : '-',
    area: (r.result && (r.result.area || r.result.area_ha)) ? `${r.result.area || r.result.area_ha} ha` : '—',
    hash: r.result?.tx_hash || '—',
    location: r.result?.location || '—',
  }));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-success text-success-foreground"><FiCheckCircle className="mr-1 w-3 h-3" /> Verified</Badge>;
      case 'pending':
        return <Badge variant="secondary"><FiClock className="mr-1 w-3 h-3" /> Pending</Badge>;
      case 'illegal':
        return <Badge variant="destructive"><FiAlertTriangle className="mr-1 w-3 h-3" /> Illegal Zone</Badge>;
      default:
        return <Badge>{status}</Badge>;
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
          <h1 className="text-4xl font-bold mb-2">Detection Reports</h1>
          <p className="text-muted-foreground">AI-generated mining detection reports with blockchain verification</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border overflow-hidden"
        >
          <div className="overflow-x-auto">
            {isLoading && (<div className="p-6 text-sm text-muted-foreground">Loading reports…</div>)}
            {isError && (<div className="p-6 text-sm text-destructive">Failed to load reports.</div>)}
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Report ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Area Detected</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Location</th>
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
                    <td className="px-6 py-4">{report.location}</td>
                    <td className="px-6 py-4">{getStatusBadge(report.status)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{report.date}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <FiEye className="mr-1 w-4 h-4" />
                          View
                        </Button>
                        <Button size="sm" variant="outline" onClick={async ()=>{
                          try {
                            const blob = await api.downloadReportPdf(String(report.id));
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = `${report.id}.pdf`; a.click(); URL.revokeObjectURL(url);
                          } catch (e:any) {
                            toast.error('Download failed', { description: String(e?.message||e) });
                          }
                        }}>
                          <FiDownload className="mr-1 w-4 h-4" />
                          PDF
                        </Button>
                        <Button size="sm" variant="outline" onClick={async()=>{
                          try { const res = await api.blockchainVerify(String(report.hash)); toast.success('Verified on-chain', { description: `Valid: ${String(res.valid)} (${res.tx_hash})` }); }
                          catch(e:any){ toast.error('Verification failed', { description: String(e?.message||e) }); }
                        }}>
                          <FiShield className="mr-1 w-4 h-4" /> Verify
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 p-6 bg-accent/10 border border-accent/20 rounded-xl"
        >
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <FiShield className="mr-2 text-accent" />
            Blockchain Verification
          </h3>
          <p className="text-sm text-muted-foreground">
            All reports are cryptographically hashed and stored on the blockchain for immutable verification. Click on any report to view its blockchain hash and verification details.
          </p>
        </motion.div>
      </main>

      <FloatingChatbot type="authority" />
    </div>
  );
};

export default AuthorityReports;
