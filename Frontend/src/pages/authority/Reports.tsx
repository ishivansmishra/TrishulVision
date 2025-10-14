import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Download, MapPin, Calendar as CalendarIcon, BarChart3, TrendingUp, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AuthorityNavbar } from "@/components/AuthorityNavbar";
import { useRecentReports } from "@/hooks/useReports";
import { api } from "@/lib/api";

const Reports = () => {
  const [reportType, setReportType] = useState("");
  const [dateRange, setDateRange] = useState<Date>();
  const [district, setDistrict] = useState("");
  const [miningType, setMiningType] = useState("");

  const handleGenerateReport = () => {
    if (!reportType || !district) {
      toast.error("Please fill all required fields");
      return;
    }

    toast.success("Report generation started", {
      description: "Your report will be ready in a few moments.",
    });

    // Simulate report generation
    setTimeout(() => {
      toast.success("Report generated successfully", {
        description: "Click the download button to save your report.",
      });
    }, 2000);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 },
    },
  };

  const { data: reportList } = useRecentReports();
  const quickStats = useMemo(() => {
    const total = reportList?.length ?? 0;
    const violations = (reportList ?? []).filter(r => r.status === 'illegal').length;
    return [
      { icon: MapPin, label: 'Reports (last 100)', value: String(total), color: 'text-primary', bgColor: 'bg-primary/10' },
      { icon: AlertTriangle, label: 'Illegal Flags', value: String(violations), color: 'text-destructive', bgColor: 'bg-destructive/10' },
      { icon: BarChart3, label: 'Completed', value: String((reportList ?? []).filter(r=>r.status==='completed'||r.status==='verified'||r.status==='compliant').length), color: 'text-secondary', bgColor: 'bg-secondary/10' },
      { icon: TrendingUp, label: 'Pending', value: String((reportList ?? []).filter(r=>!r.status || r.status==='pending').length), color: 'text-accent', bgColor: 'bg-accent/10' },
    ];
  }, [reportList]);

  return (
    <>
      <AuthorityNavbar />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Authority Reports Portal
          </h1>
          <p className="text-lg text-muted-foreground">
            Generate comprehensive mining activity reports and analytics
          </p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          {quickStats.map((stat, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="hover:shadow-lg transition-all duration-300 border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-lg", stat.bgColor)}>
                      <stat.icon className={cn("w-6 h-6", stat.color)} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Report Generation Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="shadow-xl border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <FileText className="w-5 h-5 text-primary" />
                  Generate New Report
                </CardTitle>
                <CardDescription>
                  Create detailed mining activity and compliance reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="report-type">Report Type *</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger id="report-type">
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comprehensive">Comprehensive Mining Report</SelectItem>
                      <SelectItem value="violation">Boundary Violation Report</SelectItem>
                      <SelectItem value="volume">Volume & Depth Analysis</SelectItem>
                      <SelectItem value="detection">AI Detection History</SelectItem>
                      <SelectItem value="heatmap">Mining Activity Heatmap</SelectItem>
                      <SelectItem value="comparative">Comparative Analysis</SelectItem>
                      <SelectItem value="predictive">Predictive Expansion Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="district">District/Region *</Label>
                  <Select value={district} onValueChange={setDistrict}>
                    <SelectTrigger id="district">
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jharkhand">Jharkhand</SelectItem>
                      <SelectItem value="odisha">Odisha</SelectItem>
                      <SelectItem value="chhattisgarh">Chhattisgarh</SelectItem>
                      <SelectItem value="madhya-pradesh">Madhya Pradesh</SelectItem>
                      <SelectItem value="karnataka">Karnataka</SelectItem>
                      <SelectItem value="rajasthan">Rajasthan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mining-type">Mining Type</Label>
                  <Select value={miningType} onValueChange={setMiningType}>
                    <SelectTrigger id="mining-type">
                      <SelectValue placeholder="Select mining type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coal">Coal Mining</SelectItem>
                      <SelectItem value="iron">Iron Ore</SelectItem>
                      <SelectItem value="limestone">Limestone</SelectItem>
                      <SelectItem value="bauxite">Bauxite</SelectItem>
                      <SelectItem value="all">All Types</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange ? format(dateRange, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange}
                        onSelect={setDateRange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any specific requirements or notes for this report..."
                    className="min-h-[100px]"
                  />
                </div>

                <Button
                  onClick={handleGenerateReport}
                  className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity"
                  size="lg"
                >
                  <FileText className="mr-2 h-5 w-5" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Reports */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="shadow-xl border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Recent Reports
                </CardTitle>
                <CardDescription>
                  Access and download previously generated reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(reportList ?? []).map((report) => (
                  <motion.div
                    key={report.id}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 rounded-lg border border-border bg-card hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground mb-1">Report {report.id}</h4>
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            {report.created_at ?? '—'}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {(report.result && (report.result.location || report.result.district)) || '—'}
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="ml-2" onClick={async()=>{
                        try { const blob = await api.downloadReportPdf(String(report.id)); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${report.id}.pdf`; a.click(); URL.revokeObjectURL(url);} catch(e:any){ toast.error('Download failed', { description: String(e?.message||e) }); }
                      }}>
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{report.result?.type || 'Report'}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-secondary/10 text-secondary">{report.status || 'pending'}</span>
                      {report.result?.tx_hash && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600">On-chain</span>
                      )}
                      <Button size="sm" variant="outline" onClick={async()=>{
                        try {
                          const r = await api.pinReport(String(report.id));
                          toast.success('Pinned to IPFS', { description: `CID: ${r.cid}` });
                        } catch(e:any) {
                          toast.error('Pin failed', { description: String(e?.message||e) });
                        }
                      }}>Pin & Verify</Button>
                      <Button size="sm" variant="outline" onClick={async()=>{
                        try {
                          const a = await api.getReportAuthenticity(String(report.id));
                          toast.info('Authenticity', { description: `Valid: ${a.valid ? 'Yes' : 'No'}${a.tx_hash ? `, tx: ${a.tx_hash}`:''}` });
                        } catch(e:any) { toast.error('Check failed', { description: String(e?.message||e) }); }
                      }}>Verify</Button>
                    </div>
                  </motion.div>
                ))}

                <Button variant="outline" className="w-full mt-4" onClick={()=>window.location.assign('/authority/reports')}>View All Reports</Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-xl border-border/50 mt-6">
              <CardHeader>
                <CardTitle className="text-foreground">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  View Active Alerts
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <MapPin className="mr-2 h-4 w-4" />
                  3D Visualization Dashboard
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  AI Detection Analytics
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Reports;
