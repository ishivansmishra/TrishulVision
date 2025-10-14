import { motion } from 'framer-motion';
import { FiCpu, FiLayers, FiTrendingUp, FiAlertCircle } from 'react-icons/fi';
import { UserNavbar } from '@/components/UserNavbar';
import FloatingChatbot from '@/components/FloatingChatbot';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const UserAIAnalysis = () => {
  const analyses = [
    { 
      id: 'ANA-001', 
      date: '2024-01-15', 
      area: '12.5 ha', 
      depth: '8.2 m avg', 
      volume: '102,500 m³',
      status: 'completed',
      compliance: 'compliant'
    },
    { 
      id: 'ANA-002', 
      date: '2024-01-10', 
      area: '11.8 ha', 
      depth: '7.5 m avg', 
      volume: '88,500 m³',
      status: 'completed',
      compliance: 'compliant'
    },
  ];

  const changeDetection = [
    { period: 'Dec 2023 → Jan 2024', areaChange: '+0.7 ha', depthChange: '+0.7 m', volumeChange: '+14,000 m³' },
    { period: 'Nov 2023 → Dec 2023', areaChange: '+0.5 ha', depthChange: '+0.5 m', volumeChange: '+9,200 m³' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <UserNavbar />

      <main className="flex-1 container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <FiCpu className="text-primary" />
            AI Mining Analysis
          </h1>
          <p className="text-muted-foreground">
            View AI-powered analysis of your mining activities
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-4 gap-6 mb-8"
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Current Area</h3>
              <FiLayers className="text-primary" />
            </div>
            <p className="text-3xl font-bold">12.5 ha</p>
            <p className="text-xs text-muted-foreground mt-1">+5.6% from last month</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Average Depth</h3>
              <FiTrendingUp className="text-accent" />
            </div>
            <p className="text-3xl font-bold">8.2 m</p>
            <p className="text-xs text-muted-foreground mt-1">AI-estimated</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Total Volume</h3>
              <FiCpu className="text-primary" />
            </div>
            <p className="text-3xl font-bold">102.5K m³</p>
            <p className="text-xs text-muted-foreground mt-1">Excavated</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Compliance</h3>
              <FiAlertCircle className="text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-500">100%</p>
            <p className="text-xs text-muted-foreground mt-1">Within boundaries</p>
          </Card>
        </motion.div>

        {/* Analysis Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-6">AI Analysis Results</h2>
            <div className="space-y-4">
              {analyses.map((analysis) => (
                <div key={analysis.id} className="border border-border rounded-lg p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{analysis.id}</h3>
                      <p className="text-sm text-muted-foreground">Analysis Date: {analysis.date}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className="bg-green-500">{analysis.status}</Badge>
                      <Badge variant="outline" className="border-green-500 text-green-500">
                        {analysis.compliance}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Mining Area</p>
                      <p className="font-semibold text-lg">{analysis.area}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Average Depth</p>
                      <p className="font-semibold text-lg">{analysis.depth}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Excavated Volume</p>
                      <p className="font-semibold text-lg">{analysis.volume}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm">View 3D Model</Button>
                    <Button size="sm" variant="outline">Download Report</Button>
                    <Button size="sm" variant="outline">View Images</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Change Detection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-6">Change Detection Analysis</h2>
            <p className="text-sm text-muted-foreground mb-6">
              AI-powered comparison of historical mining data to track growth and changes
            </p>
            <div className="space-y-4">
              {changeDetection.map((change, idx) => (
                <div key={idx} className="border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">{change.period}</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Area Change</p>
                      <p className="font-semibold text-primary">{change.areaChange}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Depth Change</p>
                      <p className="font-semibold text-accent">{change.depthChange}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Volume Change</p>
                      <p className="font-semibold">{change.volumeChange}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </main>

      <FloatingChatbot type="user" />
    </div>
  );
};

export default UserAIAnalysis;
