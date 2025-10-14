import { motion } from 'framer-motion';
import { FiUser, FiMail, FiShield } from 'react-icons/fi';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import Footer from '@/components/Footer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

function decodeJwtPayload(token: string): any | null {
  try {
    const part = token.split('.')[1] || '';
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

const AuthoritySettings = () => {
  const [targetRole, setTargetRole] = useState<'authority'|'user'>('user');
  const [email, setEmail] = useState<string>('');
  const [profile, setProfile] = useState<Record<string, any>>({ fullName: '', contactEmail: '', roleTitle: '' });
  const [me, setMe] = useState<{ email: string; role: 'user'|'authority'}|null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.me();
        setMe({ email: res.email, role: res.role });
        setProfile({
          fullName: res.profile?.fullName || '',
          contactEmail: res.profile?.contactEmail || res.email || '',
          roleTitle: res.profile?.roleTitle || 'Authority',
        });
      } catch (e:any) {
        console.error(e);
      }
    })();
  }, []);

  const onSwitchRole = async () => {
    try {
      const token = localStorage.getItem('auth_token') || '';
      const payload = token ? decodeJwtPayload(token) : {};
      const currentEmail = email || payload?.sub || '';
      if (!currentEmail) { toast.error('Could not determine email to update'); return; }
      const res = await api.adminUpdateUserRole(currentEmail, targetRole);
      toast.success('Role updated', { description: `${res.email} -> ${res.role}` });
    } catch (e:any) {
      toast.error('Failed to update role', { description: String(e?.message || e) });
    }
  };
  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </motion.div>

        <div className="space-y-6">
          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-xl border border-border p-6"
          >
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <FiUser className="mr-2" />
              Profile Information
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={profile.fullName} onChange={(e)=>setProfile(v=>({ ...v, fullName: e.target.value }))} className="mt-2" />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative mt-2">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" value={profile.contactEmail} onChange={(e)=>setProfile(v=>({ ...v, contactEmail: e.target.value }))} className="pl-10" />
                </div>
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <div className="relative mt-2">
                  <FiShield className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="role" value={profile.roleTitle} onChange={(e)=>setProfile(v=>({ ...v, roleTitle: e.target.value }))} className="pl-10" />
                </div>
              </div>

              <Button type="button" onClick={async ()=>{
                try { await api.updateMe(profile); toast.success('Profile saved'); }
                catch(e:any){ toast.error('Failed to save', { description: String(e?.message||e) }); }
              }}>Save Changes</Button>
            </div>
          </motion.div>

          {/* Appearance Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-xl border border-border p-6"
          >
            <h2 className="text-2xl font-semibold mb-6">Appearance</h2>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-sm text-muted-foreground">Switch between light and dark mode</p>
              </div>
              <ThemeToggle />
            </div>
          </motion.div>

          {/* Security Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-xl border border-border p-6"
          >
            <h2 className="text-2xl font-semibold mb-6">Security</h2>
            
            <div className="space-y-4">
              <Button variant="outline">Change Password</Button>
              <Button variant="outline">Enable Two-Factor Authentication</Button>
            </div>
          </motion.div>

          {/* Automation / n8n Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.42 }}
            className="bg-card rounded-xl border border-border p-6"
          >
            <h2 className="text-2xl font-semibold mb-6">Automation (n8n)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button type="button" variant="default" onClick={async()=>{
                try { await api.automationEmit('satellite.sync', { provider: 'sentinel-hub' }); toast.success('Triggered satellite sync'); }
                catch(e:any){ toast.error('Failed to trigger', { description: String(e?.message||e) }); }
              }}>Sync Satellite Data</Button>
              <Button type="button" variant="outline" onClick={async()=>{
                try { await api.automationEmit('compliance.check', {}); toast.success('Triggered compliance check'); }
                catch(e:any){ toast.error('Failed to trigger', { description: String(e?.message||e) }); }
              }}>Run Compliance Check</Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">These buttons call backend /automation/emit which posts to your configured n8n webhook.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="bg-card rounded-xl border border-border p-6"
          >
            <h2 className="text-2xl font-semibold mb-6">Account Role</h2>
            <div className="space-y-3">
              <div>
                <Label htmlFor="role_email">Email (optional)</Label>
                <Input id="role_email" placeholder="user@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} />
              </div>
              <div>
                <Label>Switch to</Label>
                <div className="flex gap-2 mt-2">
                  <Button type="button" variant={targetRole==='user'?'default':'outline'} onClick={()=>setTargetRole('user')}>User</Button>
                  <Button type="button" variant={targetRole==='authority'?'default':'outline'} onClick={()=>setTargetRole('authority')}>Authority</Button>
                </div>
              </div>
              <Button type="button" onClick={onSwitchRole}>Update Role (Admin)</Button>
              <p className="text-sm text-muted-foreground">This action requires your token to have authority role.</p>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AuthoritySettings;
