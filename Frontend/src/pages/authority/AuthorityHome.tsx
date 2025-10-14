import { motion } from 'framer-motion';
import { FiMapPin, FiAlertTriangle, FiFileText, FiShield } from 'react-icons/fi';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import FloatingChatbot from '@/components/FloatingChatbot';
import ImageSlider from '@/components/ImageSlider';
import { useRecentReports } from '@/hooks/useReports';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { MapView } from '@/components/MapView';
import { FeatureCard } from '@/components/FeatureCard';
import miningSatellite from '@/assets/mining-satellite.jpg';
import aiDashboard from '@/assets/ai-dashboard.jpg';
import terrainDem from '@/assets/terrain-dem.jpg';
import blockchainVerify from '@/assets/blockchain-verify.jpg';
import authorityTeam from '@/assets/authority-team.jpg';

const AuthorityHome = () => {
  const sliderImages = [miningSatellite, aiDashboard, terrainDem, blockchainVerify, authorityTeam];
  const { data: reports } = useRecentReports();
  const illegalCount = reports?.filter(r => r.status === 'illegal').length ?? 0;
  const totalReports = reports?.length ?? 0;
  const [overview, setOverview] = useState<{reports_total:number;alerts_total:number;blockchain_verified:number;detection_jobs:number;active_sites:number}>();
  const [recentDetections, setRecentDetections] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try { setOverview(await api.getOverviewMetrics()); } catch {}
      try { setRecentDetections(await api.listRecentDetections(100)); } catch {}
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              AI-Powered Mining Detection for India
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Monitor, detect, and verify illegal mining activities using advanced AI and satellite imagery analysis
            </p>
          </motion.div>

          <ImageSlider />
        </section>

        {/* Stats Section */}
        <section className="bg-muted/50 py-12">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { label: 'Active Sites Monitored', value: String(overview?.active_sites ?? '—'), icon: <FiMapPin className="w-6 h-6" /> },
                { label: 'Illegal Detections', value: String(illegalCount), icon: <FiAlertTriangle className="w-6 h-6" /> },
                { label: 'Reports Generated', value: String(overview?.reports_total ?? totalReports), icon: <FiFileText className="w-6 h-6" /> },
                { label: 'Blockchain Verified', value: String(overview?.blockchain_verified ?? '—'), icon: <FiShield className="w-6 h-6" /> },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card p-6 rounded-xl border border-border text-center"
                >
                  <div className="flex justify-center mb-3 text-accent">
                    {stat.icon}
                  </div>
                  <div className="text-3xl font-bold mb-2">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Mini Map Section */}
        <section className="container mx-auto px-4 py-8">
          <h2 className="text-2xl font-semibold mb-4">Recent Detections</h2>
          <MapView features={recentDetections.map(d => ({ geometry: d.geometry }))} />
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Authority Dashboard Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<FiMapPin className="w-8 h-8" />}
              title="Run AI Detection"
              description="Execute automated mining detection on satellite imagery with advanced segmentation models"
              delay={0}
            />
            <FeatureCard
              icon={<FiAlertTriangle className="w-8 h-8" />}
              title="Illegal Mining Alerts"
              description="Real-time notifications for unauthorized mining activities beyond lease boundaries"
              delay={0.1}
            />
            <FeatureCard
              icon={<FiFileText className="w-8 h-8" />}
              title="Generate Report"
              description="AI-powered NLP reports with depth estimation and blockchain verification"
              delay={0.2}
            />
            <FeatureCard
              icon={<FiShield className="w-8 h-8" />}
              title="Blockchain Verification"
              description="Immutable report validation with cryptographic hash storage"
              delay={0.3}
            />
          </div>
        </section>
      </main>

      <FloatingChatbot type="authority" />
    </div>
  );
};

export default AuthorityHome;
