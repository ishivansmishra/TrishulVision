import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiShield, FiUsers, FiMapPin, FiDatabase } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-tech-1.jpg';
import miningDetection from '@/assets/mining-detection.jpg';
import aiSolution from '@/assets/ai-solution.jpg';

import ImageSlider from '@/components/ImageSlider';
import Animation3D from '@/components/Animation3D';
import { useI18n } from '@/context/I18nContext';

const Landing = () => {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0" style={{ background: 'var(--gradient-hero)' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-4 max-w-5xl mx-auto"
        >
          <motion.h1
            className="text-5xl md:text-7xl font-bold mb-6 text-primary-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {t('app_title')}
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl mb-12 text-primary-foreground/90"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            AI-Powered Mining Detection for India
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-6 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Link to="/login?role=authority">
              <Button size="lg" className="min-w-[200px]">
                <FiShield className="mr-2" />
                {t('authority_portal')}
              </Button>
            </Link>
            <Link to="/login?role=user">
              <Button size="lg" variant="secondary" className="min-w-[200px]">
                <FiUsers className="mr-2" />
                {t('user_portal')}
              </Button>
            </Link>
            {/* Features page entry hidden; keep portals as primary CTAs */}
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-6 h-10 border-2 border-primary-foreground/50 rounded-full flex justify-center p-2">
            <div className="w-1 h-3 bg-primary-foreground/50 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-center mb-16"
          >
            {t('features_heading')}
          </motion.h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <FiMapPin className="w-8 h-8" />,
                title: t('feature_satellite_title'),
                description: t('feature_satellite_desc'),
              },
              {
                icon: <FiDatabase className="w-8 h-8" />,
                title: t('feature_3d_title'),
                description: t('feature_3d_desc'),
              },
              {
                icon: <FiShield className="w-8 h-8" />,
                title: t('feature_blockchain_title'),
                description: t('feature_blockchain_desc'),
              },
              {
                icon: <FiUsers className="w-8 h-8" />,
                title: t('feature_dual_title'),
                description: t('feature_dual_desc'),
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-card p-6 rounded-xl border border-border hover:border-accent transition-colors"
              >
                <div className="text-accent mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Technology in Action */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-center mb-16"
          >
            {t('tech_in_action')}
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative rounded-xl overflow-hidden shadow-xl"
            >
              <img 
                src={miningDetection} 
                alt="Mining Detection Technology" 
                className="w-full h-[400px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent flex items-end p-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2 text-foreground">{t('feature_satellite_title')}</h3>
                  <p className="text-muted-foreground">{t('feature_satellite_desc')}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative rounded-xl overflow-hidden shadow-xl"
            >
              <img 
                src={aiSolution} 
                alt="AI-Powered Solution" 
                className="w-full h-[400px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent flex items-end p-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2 text-foreground">{t('ai_powered_analysis')}</h3>
                  <p className="text-muted-foreground">{t('feature_3d_desc')}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Image Slider */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <ImageSlider />
          </motion.div>

          {/* 3D Animation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Animation3D />
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-6"
        style={{ background: 'var(--gradient-primary)' }}
      >
        <div className="container mx-auto px-4 text-center">
          <p className="text-primary-foreground text-sm">
            © 2025 TrishulVision | Design & Developed by <span className="font-semibold">Sudarshan Systems</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
