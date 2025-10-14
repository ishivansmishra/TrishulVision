import { motion } from 'framer-motion';
import { FiUpload, FiFileText, FiMessageSquare, FiMapPin } from 'react-icons/fi';
import { UserNavbar } from '@/components/UserNavbar';
import FloatingChatbot from '@/components/FloatingChatbot';
import ImageSlider from '@/components/ImageSlider';
import { FeatureCard } from '@/components/FeatureCard';
import miningSatellite from '@/assets/mining-satellite.jpg';
import terrainDem from '@/assets/terrain-dem.jpg';
import blockchainVerify from '@/assets/blockchain-verify.jpg';
import aiDashboard from '@/assets/ai-dashboard.jpg';

const UserHome = () => {
  const sliderImages = [miningSatellite, terrainDem, blockchainVerify, aiDashboard];

  return (
    <div className="min-h-screen flex flex-col">
      <UserNavbar />

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
              Your Mining Dashboard, Powered by AI
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Upload lease boundaries, request AI detection, and verify compliance with blockchain-secured reports
            </p>
          </motion.div>

          <ImageSlider />
        </section>

        {/* Quick Stats */}
        <section className="bg-muted/50 py-12">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { label: 'Lease Areas', value: '3', icon: <FiMapPin className="w-6 h-6" /> },
                { label: 'Detection Requests', value: '12', icon: <FiUpload className="w-6 h-6" /> },
                { label: 'Reports Received', value: '11', icon: <FiFileText className="w-6 h-6" /> },
                { label: 'Compliance Rate', value: '91%', icon: <FiMessageSquare className="w-6 h-6" /> },
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

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">User Portal Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<FiUpload className="w-8 h-8" />}
              title="Upload Lease Area"
              description="Submit KML/Shapefile of authorized mining boundaries for verification"
              delay={0}
            />
            <FeatureCard
              icon={<FiMapPin className="w-8 h-8" />}
              title="AI Detection Request"
              description="Upload drone imagery or DEM data for automated mining analysis"
              delay={0.1}
            />
            <FeatureCard
              icon={<FiFileText className="w-8 h-8" />}
              title="View Reports"
              description="Access AI-generated compliance reports with blockchain verification"
              delay={0.2}
            />
            <FeatureCard
              icon={<FiMessageSquare className="w-8 h-8" />}
              title="Send Field Feedback"
              description="Upload GPS coordinates and field evidence for verification"
              delay={0.3}
            />
          </div>
        </section>
      </main>

      <FloatingChatbot type="user" />
    </div>
  );
};

export default UserHome;
