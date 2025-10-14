import { motion } from 'framer-motion';
import UnifiedNavbar from '@/components/UnifiedNavbar';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';

export default function Features2025(){
  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedNavbar />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-5xl">
        <motion.h1 initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="text-4xl font-bold mb-6">Features 2025</motion.h1>
        <p className="text-muted-foreground mb-8">Explore core capabilities. All links below are active and wired to live pages.</p>
        <ul className="grid md:grid-cols-2 gap-4">
          <li><Link to="/authority/ai-detection" className="underline">AI Mining Detection</Link></li>
          <li><Link to="/authority/terrain3d" className="underline">3D Terrain & Depth</Link></li>
          <li><Link to="/authority/map2d" className="underline">2D Map & Heatmap</Link></li>
          <li><Link to="/authority/illegal-reports" className="underline">Illegal Mining Highlights</Link></li>
          <li><Link to="/authority/iot-monitor" className="underline">IoT Monitoring</Link></li>
          <li><Link to="/user/3d-visualization" className="underline">User 3D Visualization</Link></li>
        </ul>
      </main>
      <Footer />
    </div>
  );
}
