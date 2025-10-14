import { Link, useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { motion } from 'framer-motion';
import { FiLogOut, FiGlobe, FiMenu } from 'react-icons/fi';
import { Bell, Zap, FileText, Upload, AlertTriangle } from 'lucide-react';
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
import { useI18n } from '@/context/I18nContext';
import DemoModeBanner from '@/components/DemoModeBanner';

export const UserNavbar = () => {
  const navigate = useNavigate();
  const { locale, setLocale, t } = useI18n();

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/login');
  };

  const notifications = [
    { id: 1, title: 'AI Analysis Complete', location: 'Your lease area', time: '1h ago', type: 'success' },
    { id: 2, title: 'Report Ready', location: 'Mining Site A', time: '3h ago', type: 'info' },
    { id: 3, title: 'Compliance Check', location: 'All sites', time: '1d ago', type: 'warning' },
  ];

  const NavLinks = () => (
    <>
      <Link to="/user/home" className="text-foreground hover:text-primary transition-colors font-medium">
        {t('home')}
      </Link>
      <Link to="/user/upload" className="text-foreground hover:text-primary transition-colors font-medium">
        Upload Imagery
      </Link>
      <Link to="/user/reports" className="text-foreground hover:text-primary transition-colors font-medium">
        My Reports
      </Link>
      <Link to="/user/jobs" className="text-foreground hover:text-primary transition-colors font-medium">
        Jobs
      </Link>
      <Link to="/user/3d-visualization" className="text-foreground hover:text-primary transition-colors font-medium">
        {t('visualization')}
      </Link>
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
          <Link to="/user/home" className="flex items-center gap-3">
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
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-primary text-primary-foreground">
                    {notifications.length}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-card z-[100]">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.map((notif) => (
                  <DropdownMenuItem key={notif.id} className="flex flex-col items-start p-3">
                    <div className="flex items-start gap-2 w-full">
                      <AlertTriangle className={`w-4 h-4 mt-1 ${notif.type === 'success' ? 'text-green-500' : 'text-accent'}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{notif.title}</p>
                        <p className="text-xs text-muted-foreground">{notif.location}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/user/home')}>
                  View All Notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
                <DropdownMenuItem onClick={() => navigate('/user/settings')}>
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
                  <Button variant="outline" onClick={() => navigate('/user/settings')}>
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
