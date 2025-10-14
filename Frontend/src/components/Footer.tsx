import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, FileText, Shield, Database, Globe } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div className="space-y-4 md:col-span-1">
            <h3 className="text-lg font-semibold text-foreground">TrishulVision</h3>
            <div className="flex gap-4 mt-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-muted hover:bg-primary text-muted-foreground hover:text-primary-foreground flex items-center justify-center transition-all duration-300"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-muted hover:bg-primary text-muted-foreground hover:text-primary-foreground flex items-center justify-center transition-all duration-300"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-muted hover:bg-primary text-muted-foreground hover:text-primary-foreground flex items-center justify-center transition-all duration-300"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Authority Portal */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Authority Portal</h3>
            <ul className="space-y-2">
              <li>
                <a href="/authority/home" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="/authority/ai-detection" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Detection
                </a>
              </li>
              <li>
                <a href="/authority/reports" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Reports
                </a>
              </li>
              <li>
                <a href="/authority/visualization" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Visualization
                </a>
              </li>
              <li>
                <a href="/authority/alerts" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Alerts
                </a>
              </li>
              <li>
                <a href="/authority/analytics" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Analytics
                </a>
              </li>
            </ul>
          </div>

          {/* User Portal */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">User Portal</h3>
            <ul className="space-y-2">
              <li>
                <a href="/user/home" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="/user/upload" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Upload Imagery
                </a>
              </li>
              <li>
                <a href="/user/reports" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  My Reports
                </a>
              </li>
              <li>
                <a href="/user/3d-visualization" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Visualization
                </a>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Contact & Support</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 text-primary mt-0.5" />
                <span>info@trishulvision.gov.in</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 text-primary mt-0.5" />
                <span>+91 1800-XXX-XXXX</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />
                <span>New Delhi, India</span>
              </li>
            </ul>
            <div className="pt-4 space-y-2">
              <a href="/docs" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Documentation
              </a>
              <a href="/support" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Support Center
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm text-muted-foreground mb-2">
                © {new Date().getFullYear()} TrishulVision. All rights reserved.
              </p>
              <p className="text-sm font-semibold text-foreground">
                Designed and Developed By Sudarshan System
              </p>
            </div>
            <div className="flex gap-6">
              <a href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Terms of Service
              </a>
              <a href="/accessibility" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Accessibility
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
