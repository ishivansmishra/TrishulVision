import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiUpload, FiFile, FiCheck } from 'react-icons/fi';
import { UserNavbar } from '@/components/UserNavbar';
import FloatingChatbot from '@/components/FloatingChatbot';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';

const UserUpload = () => {
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    lease: null,
    imagery: null,
    dem: null,
  });

  const handleFileChange = (type: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [type]: file }));
  };

  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = files.imagery || files.lease || files.dem;
    if (!file) {
      toast.error('Please upload at least one file');
      return;
    }
    try {
      const res = await api.createDetectionJob({ imagery: files.imagery || undefined, shapefile: files.lease || undefined, dem: files.dem || undefined });
      setJobId(res.job_id);
      setStatus(res.status);
      toast.success('Detection job created', { description: `Job ${res.job_id} queued` });
    } catch (err: any) {
      toast.error('Upload failed', { description: String(err?.message || err) });
    }
  };

  const FileUploadBox = ({ 
    type, 
    label, 
    accept, 
    description 
  }: { 
    type: string; 
    label: string; 
    accept: string; 
    description: string;
  }) => (
    <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent transition-colors">
      <input
        type="file"
        id={type}
        accept={accept}
        onChange={(e) => handleFileChange(type, e.target.files?.[0] || null)}
        className="hidden"
      />
      <label htmlFor={type} className="cursor-pointer">
        {files[type] ? (
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-lg bg-success/10">
              <FiCheck className="w-8 h-8 text-success" />
            </div>
            <p className="font-medium">{files[type]?.name}</p>
            <p className="text-sm text-muted-foreground">Click to change file</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-lg bg-accent/10">
              <FiUpload className="w-8 h-8 text-accent" />
            </div>
            <p className="font-medium">{label}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        )}
      </label>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <UserNavbar />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">Upload Data for AI Detection</h1>
          <p className="text-muted-foreground">Submit lease boundaries and imagery for automated mining analysis</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-xl border border-border p-6"
          >
            <h2 className="text-2xl font-semibold mb-6">Required Documents</h2>

            <div className="space-y-6">
              <div>
                <Label className="text-base mb-3 block">Lease Boundary (KML/Shapefile)</Label>
                <FileUploadBox
                  type="lease"
                  label="Upload Lease Boundary"
                  accept=".kml,.shp,.zip"
                  description="Authorized mining area boundaries in KML or Shapefile format"
                />
              </div>

              <div>
                <Label className="text-base mb-3 block">Satellite/Drone Imagery</Label>
                <FileUploadBox
                  type="imagery"
                  label="Upload Imagery"
                  accept=".tif,.tiff,.jpg,.jpeg,.png"
                  description="EO/SAR satellite or drone imagery of mining site"
                />
              </div>

              <div>
                <Label className="text-base mb-3 block">DEM Data (Optional)</Label>
                <FileUploadBox
                  type="dem"
                  label="Upload DEM"
                  accept=".tif,.tiff"
                  description="Digital Elevation Model for depth analysis"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-accent/10 border border-accent/20 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <FiFile className="mr-2 text-accent" />
              Processing Information
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• AI detection typically completes within 10-15 minutes</li>
              <li>• You'll receive email and SMS notifications when ready</li>
              <li>• Reports include depth estimation and boundary compliance</li>
              <li>• All results are blockchain-verified for authenticity</li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button type="submit" size="lg" className="w-full md:w-auto">
              <FiUpload className="mr-2" />
              Submit for AI Detection
            </Button>
            {jobId && (
              <div className="mt-4 text-sm text-muted-foreground">
                Job: <span className="font-mono">{jobId}</span> — Status: {status}. <button className="underline" onClick={async()=>{
                  try {
                    const v = await api.getVisualization(jobId);
                    toast.info('Visualization', { description: `Illegal: ${v.metrics?.area_illegal ?? '—'} ha, Volume: ${v.metrics?.volume_cubic_m ?? '—'} m³` });
                    window.open('/user/3d-visualization', '_blank');
                  } catch (e:any) { toast.error('Visualization not ready', { description: String(e?.message||e) }); }
                }}>Open Visualization</button>
              </div>
            )}
          </motion.div>
        </form>
      </main>

      <FloatingChatbot type="user" />
    </div>
  );
};

export default UserUpload;
