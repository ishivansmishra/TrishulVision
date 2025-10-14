import { UserNavbar } from '@/components/UserNavbar';
import FloatingChatbot from '@/components/FloatingChatbot';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Calendar, History, TrendingUp, Download, Play, Pause } from 'lucide-react';
import { useState } from 'react';

export default function UserHistoricalComparison() {
  const [timelineValue, setTimelineValue] = useState([50]);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleCompare = () => {
    console.log('Comparing historical data...');
  };

  const handleDownload = () => {
    console.log('Downloading comparison report...');
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <UserNavbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 mt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              Historical Comparison
            </h1>
            <p className="text-muted-foreground">
              Compare past vs current mining activity over time
            </p>
          </div>

          {/* Timeline Control */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Timeline Controls
              </CardTitle>
              <CardDescription>
                Select time periods to compare mining activities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">January 2024</span>
                  <span className="text-sm font-medium">December 2024</span>
                </div>
                <Slider
                  value={timelineValue}
                  onValueChange={setTimelineValue}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={togglePlayback}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Play Timeline
                      </>
                    )}
                  </Button>
                  <Button variant="default" size="sm" onClick={handleCompare}>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Compare Periods
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comparison View */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Previous Period</CardTitle>
                <CardDescription>January - June 2024</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Historical Mining Site View</p>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Area Mined:</span>
                    <span className="font-semibold">2,450 m²</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Mining Depth:</span>
                    <span className="font-semibold">15.2 m</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Volume Extracted:</span>
                    <span className="font-semibold">37,240 m³</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Period</CardTitle>
                <CardDescription>July - December 2024</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Current Mining Site View</p>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Area Mined:</span>
                    <span className="font-semibold text-primary">3,180 m²</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Mining Depth:</span>
                    <span className="font-semibold text-primary">18.7 m</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Volume Extracted:</span>
                    <span className="font-semibold text-primary">59,466 m³</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Change Analysis */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Change Analysis
              </CardTitle>
              <CardDescription>
                Summary of changes between compared periods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Area Change</p>
                  <p className="text-2xl font-bold text-primary">+29.8%</p>
                  <p className="text-xs text-muted-foreground mt-1">+730 m² increase</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Depth Change</p>
                  <p className="text-2xl font-bold text-primary">+23.0%</p>
                  <p className="text-xs text-muted-foreground mt-1">+3.5 m deeper</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Volume Change</p>
                  <p className="text-2xl font-bold text-primary">+59.7%</p>
                  <p className="text-xs text-muted-foreground mt-1">+22,226 m³ extracted</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button onClick={handleDownload} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download Comparison Report
            </Button>
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Select Custom Dates
            </Button>
          </div>
        </motion.div>
      </main>

      <FloatingChatbot type="user" />
    </div>
  );
}
