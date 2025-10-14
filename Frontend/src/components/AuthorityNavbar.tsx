import { Link, useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { motion } from 'framer-motion';
import { FiLogOut, FiBell, FiGlobe, FiMenu, FiX } from 'react-icons/fi';
import { Bell, Zap, AlertTriangle, Map, Radio } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import logo from '@/assets/logo.jpeg';
import { useState } from 'react';
import { useI18n } from '@/context/I18nContext';
import DemoModeBanner from '@/components/DemoModeBanner';
import { useAlerts } from '@/hooks/useAlerts';

export const AuthorityNavbar = () => {
  const navigate = useNavigate();
  const { locale, setLocale, t } = useI18n();

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/login');
  };

  const { alerts } = useAlerts();

  const NavLinks = () => (
    <>
      <Link to="/authority/home" className="text-foreground hover:text-primary transition-colors font-medium">
        {t('home')}
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="text-foreground hover:text-primary transition-colors font-medium">{t('detection')}</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-card z-[100]">
          <DropdownMenuItem onClick={() => navigate('/authority/ai-detection')}>{t('mining_detection')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/authority/boundary-breach')}>Boundary Breach Detection</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/authority/depth-volume')}>Depth & Volume Estimation</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/authority/predictive-zones')}>Predictive Mining Zones</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="text-foreground hover:text-primary transition-colors font-medium">{t('reports')}</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-card z-[100]">
          <DropdownMenuItem onClick={() => navigate('/authority/reports')}>{t('reports')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/authority/blockchain-logs')}>Blockchain Verified Logs</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/authority/report-history')}>Report History</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/authority/verification-workflow')}>Verification Workflow</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="text-foreground hover:text-primary transition-colors font-medium">{t('visualization')}</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-card z-[100]">
          <DropdownMenuItem onClick={() => navigate('/authority/map2d')}>{t('map2d')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/authority/terrain3d')}>{t('terrain3d')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/authority/time-lapse')}>{t('time_lapse')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/authority/layer-controls')}>{t('layer_controls')}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="text-foreground hover:text-primary transition-colors font-medium">{t('alerts')}</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-card z-[100]">
          <DropdownMenuItem onClick={() => navigate('/authority/alerts')}>Real-time Alerts</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/authority/alert-history')}>Alert History & Acknowledgement</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/authority/auto-escalation')}>Auto-Escalation Rules</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="text-foreground hover:text-primary transition-colors font-medium">{t('analytics')}</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-card z-[100]">
          <DropdownMenuItem onClick={() => navigate('/authority/analytics')}>Trends Dashboard</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/authority/environmental-metrics')}>Environmental Metrics</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/authority/iot-analytics')}>IoT Sensor Analytics</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm"
    >
      <DemoModeBanner />
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/authority/home" className="flex items-center gap-3">
            <img src={logo} alt="TrishulVision" className="h-10 w-10 object-contain" />
            <motion.div whileHover={{ scale: 1.05 }}>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                TrishulVision
              </h1>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
        <NavLinks />
          </div>

          {/* Right Side Actions */}
      <div className="flex items-center gap-2">
            {/* Notifications */}
            <DropdownMenu>
              {/* @ts-ignore: Radix trigger typing mismatch in this wrapper — safe to ignore for now */}
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-destructive-foreground">
                    {alerts.length}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
            
              <DropdownMenuContent align="end" className="w-80 bg-card z-[100]">
             
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {alerts.slice(0, 10).map((notif) => (
                  // @ts-ignore: Radix item typing mismatch
                  <DropdownMenuItem key={notif.id} className="flex flex-col items-start p-3">
                    <div className="flex items-start gap-2 w-full">
                      <AlertTriangle className={`w-4 h-4 mt-1 ${notif.type === 'critical' ? 'text-destructive' : 'text-accent'}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{notif.title}</p>
                        <p className="text-xs text-muted-foreground">{notif.location}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notif.created_at ? new Date(notif.created_at).toLocaleString() : ''}</p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
             
                <DropdownMenuItem onClick={() => navigate('/authority/alerts')}>
                  View All Notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Quick Access Cards (visible on desktop) */}
            {/* Removed quick action buttons per request */}

            {/* Language Toggle */}
            <DropdownMenu>
           
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden md:flex">
                  <FiGlobe className="w-4 h-4 mr-2" />
                  {locale.toUpperCase()}
                </Button>
              </DropdownMenuTrigger>
         
              <DropdownMenuContent align="end" className="bg-card z-[100]">
              
                <DropdownMenuItem onClick={() => setLocale('en')}>English</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocale('hi')}>हिंदी (Hindi)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocale('mr')}>मराठी (Marathi)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Settings/Logout */}
            <DropdownMenu>
              
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden md:flex">
                  <FiLogOut className="mr-2" />
                  Account
                </Button>
              </DropdownMenuTrigger>
            
              <DropdownMenuContent align="end" className="bg-card z-[100]">
              
                <DropdownMenuItem onClick={() => navigate('/authority/settings')}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={handleLogout}>
                  <FiLogOut className="mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Sheet>
            
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <FiMenu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
             
              <SheetContent side="right" className="w-64 bg-card">
                <div className="flex flex-col gap-4 mt-8">
                  <NavLinks />
                  <Button variant="outline" onClick={() => navigate('/authority/settings')}>
                    Settings
                  </Button>
                  <Button variant="outline" onClick={handleLogout}>
                    <FiLogOut className="mr-2" />
                    Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};
