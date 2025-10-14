import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Footer from "@/components/Footer";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AuthorityHome from "./pages/authority/AuthorityHome";
import Dashboard from "./pages/authority/Dashboard";
import AuthorityReports from "./pages/authority/AuthorityReports";
import Reports from "./pages/authority/Reports";
import AuthorityVisualization from "./pages/authority/AuthorityVisualization";
import AuthorityAlerts from "./pages/authority/AuthorityAlerts";
import AuthoritySettings from "./pages/authority/AuthoritySettings";
import Heatmap from "./pages/authority/Heatmap";
import Map2D from "./pages/authority/Map2D";
import Terrain3D from "./pages/authority/Terrain3D";
import AIDetection from "./pages/authority/AIDetection";
import PredictiveAnalytics from "./pages/authority/PredictiveAnalytics";
import Collaboration from "./pages/authority/Collaboration";
import IoTDrone from "./pages/authority/IoTDrone";
import Analytics from "./pages/authority/Analytics";
import BoundaryBreach from "./pages/authority/BoundaryBreach";
import ComplianceChecker from "./pages/authority/ComplianceChecker";
import IntegrityLedger from "./pages/authority/IntegrityLedger";
import PolicyAssistant from "./pages/authority/PolicyAssistant";
import AnomalyLab from "./pages/authority/AnomalyLab";
import AIExplainability from "./pages/authority/AIExplainability";
import DepthVolume from "./pages/authority/DepthVolume";
import PredictiveZones from "./pages/authority/PredictiveZones";
import BlockchainLogs from "./pages/authority/BlockchainLogs";
import ReportHistory from "./pages/authority/ReportHistory";
import VerificationWorkflow from "./pages/authority/VerificationWorkflow";
import TimeLapse from "./pages/authority/TimeLapse";
import LayerControls from "./pages/authority/LayerControls";
import AutoEscalation from "./pages/authority/AutoEscalation";
import EnvironmentalMetrics from "./pages/authority/EnvironmentalMetrics";
import IoTSensorAnalytics from "./pages/authority/IoTSensorAnalytics";
import AlertHistory from "./pages/authority/AlertHistory";
import GISPanel from "./pages/authority/GISPanel";
import SatelliteSearch from "./pages/authority/SatelliteSearch";
import BoundaryUploader from "./pages/authority/BoundaryUploader";
import DetectionWizard from "./pages/authority/DetectionWizard";
import UserHome from "./pages/user/UserHome";
import UserUpload from "./pages/user/UserUpload";
import UserReports from "./pages/user/UserReports";
import UserJobs from "./pages/user/UserJobs";
import UserFeedback from "./pages/user/UserFeedback";
import UserSettings from "./pages/user/UserSettings";
import UserAIAnalysis from "./pages/user/UserAIAnalysis";
import User3DVisualization from "./pages/user/User3DVisualization";
import UserChatbot from "./pages/user/UserChatbot";
import UserHistoricalComparison from "./pages/user/UserHistoricalComparison";
import ActivitySummary from "./pages/user/ActivitySummary";
import NotFound from "./pages/NotFound";
import OTPVerification from "./pages/OTPVerification";
import { ProtectedRoute } from "./components/ProtectedRoute";
import RoleBanner from "./components/RoleBanner";
import ErrorBoundary from "./components/ErrorBoundary";
// import Features2025 from "./pages/Features2025";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <RoleBanner />
          <main className="flex-1">
            <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-otp" element={<OTPVerification />} />
              {/* Features page hidden per request; centralize features in main UX */}
              {/* <Route path="/features" element={<Features2025 />} /> */}
              
              {/* Authority Portal Routes (Protected) */}
              <Route path="/authority/home" element={<ProtectedRoute role="authority"><AuthorityHome /></ProtectedRoute>} />
              <Route path="/authority/dashboard" element={<ProtectedRoute role="authority"><Dashboard /></ProtectedRoute>} />
              <Route path="/authority/reports" element={<ProtectedRoute role="authority"><Reports /></ProtectedRoute>} />
              <Route path="/authority/reports-old" element={<ProtectedRoute role="authority"><AuthorityReports /></ProtectedRoute>} />
              <Route path="/authority/visualization" element={<ProtectedRoute role="authority"><AuthorityVisualization /></ProtectedRoute>} />
              <Route path="/authority/heatmap" element={<ProtectedRoute role="authority"><Heatmap /></ProtectedRoute>} />
              <Route path="/authority/satellite-search" element={<ProtectedRoute role="authority"><SatelliteSearch /></ProtectedRoute>} />
              <Route path="/authority/boundary-uploader" element={<ProtectedRoute role="authority"><BoundaryUploader /></ProtectedRoute>} />
              <Route path="/authority/detection-wizard" element={<ProtectedRoute role="authority"><DetectionWizard /></ProtectedRoute>} />
              <Route path="/authority/map2d" element={<ProtectedRoute role="authority"><Map2D /></ProtectedRoute>} />
              {/* Map2D now uses Leaflet; this is the canonical 2D map route */}
import Features2025 from "./pages/Features2025";
import IllegalReports from "./pages/authority/IllegalReports";
import IoTMonitor from "./pages/authority/IoTMonitor";
import GenerativeReports from "./pages/authority/GenerativeReports";
              <Route path="/authority/terrain3d" element={<ProtectedRoute role="authority"><Terrain3D /></ProtectedRoute>} />
              <Route path="/authority/ai-detection" element={<ProtectedRoute role="authority"><AIDetection /></ProtectedRoute>} />
              <Route path="/authority/predictive" element={<ProtectedRoute role="authority"><PredictiveAnalytics /></ProtectedRoute>} />
              <Route path="/authority/boundary-breach" element={<ProtectedRoute role="authority"><BoundaryBreach /></ProtectedRoute>} />
              <Route path="/authority/compliance" element={<ProtectedRoute role="authority"><ComplianceChecker /></ProtectedRoute>} />
              <Route path="/authority/integrity" element={<ProtectedRoute role="authority"><IntegrityLedger /></ProtectedRoute>} />
              <Route path="/authority/policy-assistant" element={<ProtectedRoute role="authority"><PolicyAssistant /></ProtectedRoute>} />
              <Route path="/authority/anomaly-lab" element={<ProtectedRoute role="authority"><AnomalyLab /></ProtectedRoute>} />
              <Route path="/authority/xai" element={<ProtectedRoute role="authority"><AIExplainability /></ProtectedRoute>} />
              <Route path="/authority/depth-volume" element={<ProtectedRoute role="authority"><DepthVolume /></ProtectedRoute>} />
              <Route path="/authority/predictive-zones" element={<ProtectedRoute role="authority"><PredictiveZones /></ProtectedRoute>} />
              <Route path="/authority/blockchain-logs" element={<ProtectedRoute role="authority"><BlockchainLogs /></ProtectedRoute>} />
              <Route path="/authority/report-history" element={<ProtectedRoute role="authority"><ReportHistory /></ProtectedRoute>} />
              <Route path="/authority/verification-workflow" element={<ProtectedRoute role="authority"><VerificationWorkflow /></ProtectedRoute>} />
              <Route path="/authority/time-lapse" element={<ProtectedRoute role="authority"><TimeLapse /></ProtectedRoute>} />
              <Route path="/authority/layer-controls" element={<ProtectedRoute role="authority"><LayerControls /></ProtectedRoute>} />
              <Route path="/authority/auto-escalation" element={<ProtectedRoute role="authority"><AutoEscalation /></ProtectedRoute>} />
              <Route path="/authority/environmental-metrics" element={<ProtectedRoute role="authority"><EnvironmentalMetrics /></ProtectedRoute>} />
              <Route path="/authority/gis" element={<ProtectedRoute role="authority"><GISPanel /></ProtectedRoute>} />
              <Route path="/authority/iot-analytics" element={<ProtectedRoute role="authority"><IoTSensorAnalytics /></ProtectedRoute>} />
              <Route path="/authority/alert-history" element={<ProtectedRoute role="authority"><AlertHistory /></ProtectedRoute>} />
              <Route path="/authority/collaboration" element={<ProtectedRoute role="authority"><Collaboration /></ProtectedRoute>} />
              <Route path="/authority/iot-drone" element={<ProtectedRoute role="authority"><IoTDrone /></ProtectedRoute>} />
              <Route path="/authority/alerts" element={<ProtectedRoute role="authority"><AuthorityAlerts /></ProtectedRoute>} />
              <Route path="/authority/analytics" element={<ProtectedRoute role="authority"><Analytics /></ProtectedRoute>} />
              <Route path="/authority/settings" element={<ProtectedRoute role="authority"><AuthoritySettings /></ProtectedRoute>} />
              
              {/* User Portal Routes (Protected) */}
              <Route path="/user/home" element={<ProtectedRoute role="user"><UserHome /></ProtectedRoute>} />
              <Route path="/user/upload" element={<ProtectedRoute role="user"><UserUpload /></ProtectedRoute>} />
              <Route path="/user/reports" element={<ProtectedRoute role="user"><UserReports /></ProtectedRoute>} />
              <Route path="/user/jobs" element={<ProtectedRoute role="user"><UserJobs /></ProtectedRoute>} />
              <Route path="/user/feedback" element={<ProtectedRoute role="user"><UserFeedback /></ProtectedRoute>} />
              <Route path="/user/ai-analysis" element={<ProtectedRoute role="user"><UserAIAnalysis /></ProtectedRoute>} />
              <Route path="/user/3d-visualization" element={<ProtectedRoute role="user"><User3DVisualization /></ProtectedRoute>} />
              <Route path="/user/history" element={<ProtectedRoute role="user"><UserHistoricalComparison /></ProtectedRoute>} />
              <Route path="/user/activity" element={<ProtectedRoute role="user"><ActivitySummary /></ProtectedRoute>} />
              <Route path="/user/chatbot" element={<ProtectedRoute role="user"><UserChatbot /></ProtectedRoute>} />
              <Route path="/user/settings" element={<ProtectedRoute role="user"><UserSettings /></ProtectedRoute>} />
              
              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </ErrorBoundary>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
