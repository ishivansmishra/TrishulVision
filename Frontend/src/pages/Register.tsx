import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiUser, FiHome } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }
    try {
      await api.register({ email: formData.email, password: formData.password, role: formData.role });
      toast.success('Registered successfully');
      // Trigger OTP send; in dev, backend may return the OTP to unblock testing
      try {
        const r = await api.sendOtp({ email: formData.email });
        if ((r as any)?.otp) {
          toast.success('Dev OTP', { description: String((r as any).otp) });
        }
      } catch {}
      navigate('/verify-otp', { state: { email: formData.email, isRegistration: true } });
    } catch (err: any) {
      toast.error('Registration failed', { description: String(err?.message || err) });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--gradient-primary)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-2xl shadow-2xl p-8 border border-border">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              TrishulVision
            </h1>
            <p className="text-muted-foreground">Create your account</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => navigate('/')}> 
                <FiHome className="mr-2" /> Back to Home
              </Button>
            </div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Label htmlFor="name">Full Name</Label>
              <div className="relative mt-2">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  className="pl-10"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-2">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-2">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative mt-2">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Label htmlFor="role">Account Type</Label>
              <div className="relative mt-2">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger className="pl-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="authority">Authority</SelectItem>
                    <SelectItem value="user">User / Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button type="submit" className="w-full" size="lg">
                Create Account
              </Button>
            </motion.div>

            <div className="grid grid-cols-1 gap-2">
              <Button type="button" variant="secondary" onClick={async () => {
                try {
                  const r = await api.googleRedirect('authority', '/login');
                  if (r.url) window.location.href = r.url;
                  else toast.error('Google register not configured', { description: r.note || 'Missing GOOGLE_CLIENT_ID/SECRET' });
                } catch (e:any) { toast.error('Google redirect failed', { description: String(e?.message || e) }); }
              }}>Register with Google (Authority)</Button>
              <Button type="button" variant="secondary" onClick={async () => {
                try {
                  const r = await api.googleRedirect('user', '/login');
                  if (r.url) window.location.href = r.url;
                  else toast.error('Google register not configured', { description: r.note || 'Missing GOOGLE_CLIENT_ID/SECRET' });
                } catch (e:any) { toast.error('Google redirect failed', { description: String(e?.message || e) }); }
              }}>Register with Google (User)</Button>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-center text-sm text-muted-foreground"
            >
              Already have an account?{' '}
              <Link to="/login" className="text-accent hover:underline font-medium">
                Sign in
              </Link>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
