import { motion } from 'framer-motion';
import { FiTrendingUp, FiTarget, FiAlertCircle, FiBarChart2 } from 'react-icons/fi';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import RiskTile from '@/components/RiskTile';

const PredictiveAnalytics = () => {
  const [jobs, setJobs] = useState<Array<{ id: string; status: string; area_illegal?: number; volume_cubic_m?: number; created_at?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.listDetectionJobs();
        setJobs(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load jobs');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const expansionForecasts = [
    { site: 'Site Alpha', current: '12.5 ha', predicted: '18.2 ha', growth: '+45%', timeline: '6 months' },
    { site: 'Site Beta', current: '8.3 ha', predicted: '11.7 ha', growth: '+41%', timeline: '4 months' },
    { site: 'Site Gamma', current: '15.1 ha', predicted: '22.8 ha', growth: '+51%', timeline: '8 months' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />

      <main className="flex-1 container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <FiTrendingUp className="text-primary" />
            Predictive Analytics & Decision Support
          </h1>
          <p className="text-muted-foreground">
            AI-powered predictions for illegal mining risk and mining expansion forecasting
          </p>
        </motion.div>

        {/* Risk Prediction Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <FiAlertCircle className="text-destructive" />
              Recent Detection Jobs (from DB)
            </h2>
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {error && <p className="text-destructive">{error}</p>}
            {!loading && jobs.length === 0 && <p className="text-sm text-muted-foreground">No jobs found.</p>}
            {!loading && jobs.length > 0 && (
              <div className="space-y-4">
                {jobs.slice(0, 10).map((j) => (
                  <div key={j.id} className="border border-border rounded-lg p-5 hover:bg-accent/5 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">Job {j.id}</h3>
                        <p className="text-xs text-muted-foreground">{j.created_at ? new Date(j.created_at).toLocaleString() : ''}</p>
                      </div>
                      <Badge className={j.status === 'completed' ? 'bg-primary' : 'bg-accent'}>{j.status}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>Illegal area: <span className="font-medium">{j.area_illegal ?? '—'}</span></div>
                      <div>Volume (m³): <span className="font-medium">{j.volume_cubic_m ?? '—'}</span></div>
                      <div>Depth stats: <span className="text-muted-foreground">see report</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Expansion Forecasting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <FiBarChart2 className="text-primary" />
              Mining Expansion Forecasts
            </h2>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <RiskTile />
            </div>
            <div className="space-y-4">
              {expansionForecasts.map((forecast, idx) => (
                <div key={idx} className="border border-border rounded-lg p-5">
                  <div className="grid md:grid-cols-5 gap-4 items-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Site Name</p>
                      <p className="font-semibold">{forecast.site}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current Area</p>
                      <p className="font-medium">{forecast.current}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Predicted Area</p>
                      <p className="font-medium">{forecast.predicted}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Growth Rate</p>
                      <Badge className="bg-destructive">{forecast.growth}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Timeline</p>
                      <p className="font-medium">{forecast.timeline}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Priority Enforcement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <Card className="p-6 bg-accent/10 border-accent">
            <h3 className="text-xl font-semibold mb-4">Priority-Based Enforcement Recommendations</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-background/60 rounded-lg p-4">
                <h4 className="font-semibold mb-2 text-destructive">Critical Priority</h4>
                <p className="text-2xl font-bold mb-1">8 sites</p>
                <p className="text-sm text-muted-foreground">Immediate action required</p>
              </div>
              <div className="bg-background/60 rounded-lg p-4">
                <h4 className="font-semibold mb-2 text-accent">High Priority</h4>
                <p className="text-2xl font-bold mb-1">15 sites</p>
                <p className="text-sm text-muted-foreground">Action within 7 days</p>
              </div>
              <div className="bg-background/60 rounded-lg p-4">
                <h4 className="font-semibold mb-2 text-primary">Medium Priority</h4>
                <p className="text-2xl font-bold mb-1">24 sites</p>
                <p className="text-sm text-muted-foreground">Monitor closely</p>
              </div>
            </div>
          </Card>
        </motion.div>

        
      </main>

      <Footer />
    </div>
  );
};

export default PredictiveAnalytics;
