import { motion } from 'framer-motion';
import { FiRadio, FiCamera, FiCalendar, FiMapPin, FiBattery, FiWifi } from 'react-icons/fi';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const IoTDrone = () => {
  const iotSensors = [
    { id: 'IOT-001', location: 'Site Alpha - Zone 1', type: 'Vibration Sensor', status: 'active', battery: 87, lastUpdate: '5 min ago' },
    { id: 'IOT-002', location: 'Site Beta - Zone 3', type: 'Equipment Tracker', status: 'active', battery: 92, lastUpdate: '2 min ago' },
    { id: 'IOT-003', location: 'Site Gamma - Zone 2', type: 'Environmental Monitor', status: 'warning', battery: 34, lastUpdate: '1 hour ago' },
    { id: 'IOT-004', location: 'Site Delta - Zone 1', type: 'Water Quality Sensor', status: 'active', battery: 78, lastUpdate: '10 min ago' },
  ];

  const droneMissions = [
    { id: 'DRN-001', area: 'District A - Blocks 5-8', status: 'completed', date: '2024-01-15', coverage: '45 km²', images: 1247 },
    { id: 'DRN-002', area: 'District B - Block 12', status: 'in-progress', date: '2024-01-18', coverage: '23 km²', images: 687 },
    { id: 'DRN-003', area: 'District C - Blocks 1-3', status: 'scheduled', date: '2024-01-20', coverage: '38 km²', images: 0 },
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
            <FiRadio className="text-primary" />
            IoT Sensors & Drone Integration
          </h1>
          <p className="text-muted-foreground">
            Monitor field sensors and manage drone surveillance missions
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
              <h3 className="text-sm font-semibold text-muted-foreground">Active Sensors</h3>
              <FiRadio className="text-primary" />
            </div>
            <p className="text-3xl font-bold">47</p>
            <p className="text-xs text-muted-foreground mt-1">3 need attention</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Drone Missions</h3>
              <FiCamera className="text-accent" />
            </div>
            <p className="text-3xl font-bold">124</p>
            <p className="text-xs text-muted-foreground mt-1">18 this month</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Images Captured</h3>
              <FiCamera className="text-primary" />
            </div>
            <p className="text-3xl font-bold">45.2K</p>
            <p className="text-xs text-muted-foreground mt-1">High resolution</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Coverage Area</h3>
              <FiMapPin className="text-accent" />
            </div>
            <p className="text-3xl font-bold">847 km²</p>
            <p className="text-xs text-muted-foreground mt-1">Total surveyed</p>
          </Card>
        </motion.div>

        {/* IoT Sensors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <FiRadio />
                IoT Sensors Status
              </h2>
              <Button>
                <FiRadio className="mr-2" />
                Add New Sensor
              </Button>
            </div>
            <div className="space-y-3">
              {iotSensors.map((sensor) => (
                <div key={sensor.id} className="border border-border rounded-lg p-4 hover:bg-accent/5 transition-colors">
                  <div className="grid md:grid-cols-6 gap-4 items-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Sensor ID</p>
                      <p className="font-semibold">{sensor.id}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Location</p>
                      <p className="font-medium">{sensor.location}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Type</p>
                      <p className="text-sm">{sensor.type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Battery</p>
                      <div className="flex items-center gap-2">
                        <Progress value={sensor.battery} className="h-2" />
                        <span className="text-sm font-medium">{sensor.battery}%</span>
                        <FiBattery className={sensor.battery < 40 ? 'text-destructive' : 'text-primary'} />
                      </div>
                    </div>
                    <div>
                      <Badge className={sensor.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}>
                        <FiWifi className="mr-1" />
                        {sensor.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Drone Missions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <FiCamera />
                Drone Survey Missions
              </h2>
              <Button>
                <FiCalendar className="mr-2" />
                Schedule Mission
              </Button>
            </div>
            <div className="space-y-4">
              {droneMissions.map((mission) => (
                <div key={mission.id} className="border border-border rounded-lg p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{mission.id}</h3>
                      <p className="text-sm text-muted-foreground">{mission.area}</p>
                    </div>
                    <Badge className={
                      mission.status === 'completed' ? 'bg-green-500' :
                      mission.status === 'in-progress' ? 'bg-blue-500' :
                      'bg-gray-500'
                    }>
                      {mission.status}
                    </Badge>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Survey Date</p>
                      <p className="font-medium">{mission.date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Coverage Area</p>
                      <p className="font-medium">{mission.coverage}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Images Captured</p>
                      <p className="font-medium">{mission.images.toLocaleString()}</p>
                    </div>
                  </div>

                  {mission.status === 'completed' && (
                    <div className="flex gap-2 mt-4">
                      <Button size="sm">View Images</Button>
                      <Button size="sm" variant="outline">AI Analysis</Button>
                      <Button size="sm" variant="outline">Download Dataset</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default IoTDrone;
