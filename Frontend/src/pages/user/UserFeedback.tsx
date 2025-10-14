import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiUpload, FiMapPin, FiSend } from 'react-icons/fi';
import { UserNavbar } from '@/components/UserNavbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

const UserFeedback = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <UserNavbar />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">Submit Feedback & Evidence</h1>
          <p className="text-muted-foreground">Provide field evidence and GPS data for verification</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-xl border border-border p-6"
          >
            <h2 className="text-2xl font-semibold mb-6">Field Evidence</h2>

            <div className="space-y-6">
              <div>
                <Label htmlFor="gps">GPS Coordinates</Label>
                <div className="relative mt-2">
                  <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="gps"
                    placeholder="e.g., 23.8103° N, 86.4350° E"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Enter coordinates from field visit</p>
              </div>

              <div>
                <Label htmlFor="photos">Upload Field Photos</Label>
                <div className="mt-2 border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent transition-colors cursor-pointer">
                  <input type="file" id="photos" multiple accept="image/*" className="hidden" />
                  <label htmlFor="photos" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 rounded-lg bg-accent/10">
                        <FiUpload className="w-8 h-8 text-accent" />
                      </div>
                      <p className="font-medium">Click to upload photos</p>
                      <p className="text-sm text-muted-foreground">Support JPG, PNG (Max 10 files)</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Describe field observations, measurements, or concerns..."
                  className="mt-2 min-h-[150px]"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-accent/10 border border-accent/20 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold mb-2">Submission Guidelines</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Provide accurate GPS coordinates from the site</li>
              <li>• Upload clear photos showing the mining area</li>
              <li>• Include detailed notes about field conditions</li>
              <li>• Authority will review within 48 hours</li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Button type="submit" size="lg" className="w-full md:w-auto">
              <FiSend className="mr-2" />
              Submit Feedback
            </Button>
          </motion.div>

          {submitted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-success/10 border border-success/20 rounded-xl p-4 text-success"
            >
              ✓ Feedback submitted successfully! Authority will review your submission.
            </motion.div>
          )}
        </form>
      </main>

      <Footer />
    </div>
  );
};

export default UserFeedback;
