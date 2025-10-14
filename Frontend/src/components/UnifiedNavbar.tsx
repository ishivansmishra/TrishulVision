import React, { useEffect, useState } from "react";
import { useRole } from "@/context/RoleContext";
// lightweight inline icons instead of external icon dependency
const IconChevron = ({ className = "" }: { className?: string }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconUser = ({ className = "" }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconSun = ({ className = "" }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
import { Link } from "react-router-dom";

const NavItem = ({ children, to }: { children: React.ReactNode; to?: string }) => (
  <Link
    to={to || "#"}
    className="px-3 py-2 rounded-md text-sm font-medium hover:bg-white/5 transition-colors"
  >
    {children}
  </Link>
);

const UnifiedNavbar: React.FC = () => {
  const { role, setRole } = useRole();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(
    (localStorage.getItem("trishul_theme") as "dark" | "light") || "dark"
  );

  useEffect(() => {
    try {
      localStorage.setItem("trishul_theme", theme);
    } catch (e) {}
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  return (
    <header className="w-full backdrop-blur-sm bg-gradient-to-r from-sky-900/60 to-cyan-800/40 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-4">
            <div className="flex flex-col">
              <Link to="/" className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold tracking-tight text-white">TrishulVision</span>
              </Link>
              <span className="text-xs text-white/70 -mt-1">AI-Powered Mining Intelligence</span>
            </div>

            <nav className="hidden md:flex items-center space-x-1 ml-6">
              <div className="relative focus-within:z-10">
                <button className="flex items-center gap-2 text-sm px-2 py-1 rounded-md hover:bg-white/5 transition focus:outline-none">
                  Dashboard <IconChevron />
                </button>
                <div className="absolute left-0 mt-2 w-64 bg-white/5 backdrop-blur rounded-md p-3 shadow-lg opacity-0 focus-within:opacity-100 scale-95 focus-within:scale-100 transition-all">
                  <NavItem to="/">Mining Overview</NavItem>
                  <NavItem to="/authority/map2d">Map View</NavItem>
                  <NavItem to="/authority/terrain3d">Depth & Volume Analytics</NavItem>
                  <NavItem to="/authority/ai-detection">Satellite Imagery Insights</NavItem>
                  <NavItem to="/features">Features 2025</NavItem>
                  {role === "authority" && <NavItem to="/authority/illegal-reports">Illegal Mining Highlights</NavItem>}
                </div>
              </div>

              <div className="relative focus-within:z-10">
                <button className="flex items-center gap-2 text-sm px-2 py-1 rounded-md hover:bg-white/5 transition focus:outline-none">
                  Reports <IconChevron />
                </button>
                <div className="absolute left-0 mt-2 w-56 bg-white/5 backdrop-blur rounded-md p-3 shadow-lg opacity-0 focus-within:opacity-100 transform scale-95 focus-within:scale-100 transition-all">
                  <NavItem to="/authority/reports">Generate AI-based Report</NavItem>
                  {role === "authority" && <NavItem to="/authority/reports-old">Blockchain Verified Logs</NavItem>}
                  <NavItem to="/user/reports">Report History</NavItem>
                  {role === "user" && <NavItem to="/user/upload">Upload Imagery</NavItem>}
                </div>
              </div>

              <div className="relative focus-within:z-10">
                <button className="flex items-center gap-2 text-sm px-2 py-1 rounded-md hover:bg-white/5 transition focus:outline-none">
                  Monitoring <IconChevron />
                </button>
                <div className="absolute left-0 mt-2 w-56 bg-white/5 backdrop-blur rounded-md p-3 shadow-lg opacity-0 focus-within:opacity-100 transform scale-95 focus-within:scale-100 transition-all">
                  {role === "authority" ? (
                    <>
                      <NavItem to="/authority/iot-drone">Live IoT Feed</NavItem>
                      <NavItem to="/authority/terrain3d">DEM 2D/3D Visualization</NavItem>
                      <NavItem to="/authority/alerts">Boundary Breach Detection</NavItem>
                      <NavItem to="/authority/iot-monitor">IoT Monitoring</NavItem>
                    </>
                  ) : (
                    <>
                      <NavItem to="/user/upload">Upload Imagery</NavItem>
                      <NavItem to="/user/activity">Activity Summary</NavItem>
                    </>
                  )}
                </div>
              </div>

              <div className="relative focus-within:z-10">
                <button className="flex items-center gap-2 text-sm px-2 py-1 rounded-md hover:bg-white/5 transition focus:outline-none">
                  AI Tools <IconChevron />
                </button>
                <div className="absolute left-0 mt-2 w-64 bg-white/5 backdrop-blur rounded-md p-3 shadow-lg opacity-0 focus-within:opacity-100 transform scale-95 focus-within:scale-100 transition-all">
                  <NavItem to="/user/chatbot">AI Chat Assistant</NavItem>
                  <NavItem to="/authority/ai-detection">Mining Detection Model</NavItem>
                  <NavItem to="/authority/predictive">Predictive Alerts</NavItem>
                  {role === "authority" && <NavItem to="/authority/generative-reports">Generative AI Report Writer</NavItem>}
                </div>
              </div>
            </nav>
          </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center space-x-2">
              <button
                onClick={() => setRole(role === "user" ? "authority" : "user")}
                className="px-2 py-1 rounded-md bg-white/6 hover:bg-white/8 transition text-sm"
                aria-label="toggle role"
              >
                <IconUser className="inline-block" /> <span className="ml-2 text-xs">{role === "user" ? "User" : "Authority"}</span>
              </button>

              <button
                className="p-2 rounded-md hover:bg-white/5 transition"
                aria-label="toggle theme"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <IconSun className="text-white/90 inline-block" />
              </button>

              <div className="relative">
                <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5 transition">
                  Account <IconChevron />
                </button>
                <div className="absolute right-0 mt-2 w-44 bg-white/5 backdrop-blur rounded-md p-3 shadow-lg opacity-0 focus-within:opacity-100 transition-all">
                  <NavItem to="/user/settings">My Profile</NavItem>
                  <NavItem to="/user/settings">Subscription</NavItem>
                  <NavItem to="/">Logout</NavItem>
                </div>
              </div>
            </div>

            <div className="sm:hidden">
              <button
                onClick={() => setMobileOpen((s) => !s)}
                className="p-2 rounded-md hover:bg-white/5 transition"
                aria-label="open menu"
              >
                ☰
              </button>
            </div>
          </div>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden bg-white/5 backdrop-blur p-4">
          <div className="flex flex-col space-y-2">
            <NavItem to="/">Dashboard</NavItem>
            <NavItem to="/authority/reports">Reports</NavItem>
            <NavItem to="/authority/iot-drone">Monitoring</NavItem>
            <NavItem to="/user/chatbot">AI Tools</NavItem>
            <NavItem to="/features">Features 2025</NavItem>
            <NavItem to="/user/upload">Data Center</NavItem>
            <NavItem to="/user/settings">Settings</NavItem>
          </div>
        </div>
      )}
    </header>
  );
};

export default UnifiedNavbar;
