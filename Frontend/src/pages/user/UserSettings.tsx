import { motion } from 'framer-motion';
import { FiUser, FiMail, FiBriefcase } from 'react-icons/fi';
import { UserNavbar } from '@/components/UserNavbar';
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

const UserSettings = () => {
  const [targetRole, setTargetRole] = useState<'authority'|'user'>('authority');
  const [email, setEmail] = useState<string>('');
  const [profile, setProfile] = useState<Record<string, any>>({ companyName: '', companyId: '', contactEmail: '' });
  const [me, setMe] = useState<{ email: string; role: 'user'|'authority'}|null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.me();
        setMe({ email: res.email, role: res.role });
        setProfile({
          companyName: res.profile?.companyName || '',
          companyId: res.profile?.companyId || '',
          contactEmail: res.profile?.contactEmail || res.email || '',
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
  const onSave = async () => {
    try {
      const updated = await api.updateMe(profile);
      toast.success('Profile saved');
      setMe({ email: updated.email, role: updated.role });
    } catch (e:any) {
      toast.error('Failed to save', { description: String(e?.message || e) });
    }
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
          <h1 className="text-4xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </motion.div>

        <div className="space-y-6">
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
                <Label htmlFor="name">Company Name</Label>
                <Input id="name" value={profile.companyName} onChange={(e)=>setProfile(v=>({ ...v, companyName: e.target.value }))} className="mt-2" />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative mt-2">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" value={profile.contactEmail} onChange={(e)=>setProfile(v=>({ ...v, contactEmail: e.target.value }))} className="pl-10" />
                </div>
              </div>

              <div>
                <Label htmlFor="company">Company ID</Label>
                <div className="relative mt-2">
                  <FiBriefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="company" value={profile.companyId} onChange={(e)=>setProfile(v=>({ ...v, companyId: e.target.value }))} className="pl-10" />
                </div>
              </div>

              <Button type="button" onClick={onSave}>Save Changes</Button>
            </div>
          </motion.div>

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

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
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
              <Button type="button" onClick={onSwitchRole}>Request Role Change</Button>
              <p className="text-sm text-muted-foreground">Requires admin (authority) privileges. This will fail if your token does not have authority role.</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-xl border border-border p-6"
          >
            <h2 className="text-2xl font-semibold mb-6">Notifications</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive report updates via email</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">SMS Alerts</p>
                  <p className="text-sm text-muted-foreground">Get SMS for critical updates</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4" />
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default UserSettings;
