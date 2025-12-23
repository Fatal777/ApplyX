import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SmoothScrollProvider } from "@/components/effects";
import { SentryErrorBoundary, setUser, clearUser } from "@/lib/sentry";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResumeBuilder from "./pages/ResumeBuilder";
import ResumeAnalysis from "./pages/ResumeAnalysis";
import NotFound from "./pages/NotFound";
import MockInterview from "./pages/MockInterview";
import InterviewSetup from "./pages/InterviewSetup";
import InterviewRoomPage from "./pages/InterviewRoomPage";
import InterviewDashboard from "./pages/InterviewDashboard";
import JobsPage from "./pages/JobsPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import JobApplicationBoard from "./pages/JobApplicationBoard";
import Certifications from "./pages/Certifications";
import CollegeSolutions from "./pages/CollegeSolutions";
import Assessments from "./pages/Assessments";
import Employers from "./pages/Employers";
import Settings from "./pages/Settings";
import ATSTemplates from "./pages/ATSTemplates";
import Dashboard from "./pages/Dashboard";
import LivePdfEditor from "./pages/LivePdfEditor";
import Pricing from "./pages/Pricing";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPanel from "./pages/AdminPanel";
import ScrollToTop from "./components/ScrollToTop";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Update Sentry user context when auth changes
  useEffect(() => {
    if (user) {
      setUser({
        id: user.id,
        email: user.email || undefined,
      });
    } else {
      clearUser();
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Error fallback component for Sentry error boundary
const ErrorFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
    <div className="max-w-md w-full text-center space-y-6">
      <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Something went wrong
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          We've been notified and are working on a fix.
        </p>
        {import.meta.env.DEV && (
          <p className="text-sm text-red-600 dark:text-red-400 font-mono mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-left overflow-auto max-h-32">
            {error.message}
          </p>
        )}
      </div>

      <div className="flex gap-3 justify-center">
        <button
          onClick={() => window.location.href = "/"}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Go Home
        </button>
        <button
          onClick={resetError}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  </div>
);

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/signup" element={<Auth />} />
      <Route path="/login" element={<Auth />} />

      {/* Protected Routes */}
      <Route path="/resume-builder" element={
        <ProtectedRoute>
          <ResumeBuilder />
        </ProtectedRoute>
      } />

      <Route path="/resume/:id" element={
        <ProtectedRoute>
          <ResumeAnalysis />
        </ProtectedRoute>
      } />

      <Route path="/mock-interview" element={
        <ProtectedRoute>
          <MockInterview />
        </ProtectedRoute>
      } />

      <Route path="/interview/setup" element={
        <ProtectedRoute>
          <InterviewSetup />
        </ProtectedRoute>
      } />

      <Route path="/interview/room" element={
        <ProtectedRoute>
          <InterviewRoomPage />
        </ProtectedRoute>
      } />

      {/* Interview Dashboard - Full-screen premium experience */}
      <Route path="/interview/dashboard" element={
        <ProtectedRoute>
          <InterviewDashboard />
        </ProtectedRoute>
      } />

      <Route path="/jobs" element={
        <ProtectedRoute>
          <JobsPage />
        </ProtectedRoute>
      } />

      {/* Public Job Search - accessible without login */}
      <Route path="/job-search" element={<JobsPage />} />

      {/* Applications Dashboard - Track saved/applied jobs */}
      <Route path="/applications" element={
        <ProtectedRoute>
          <ApplicationsPage />
        </ProtectedRoute>
      } />

      {/* Job Application Board - Kanban-style job tracking */}
      <Route path="/job-board" element={
        <ProtectedRoute>
          <JobApplicationBoard />
        </ProtectedRoute>
      } />

      <Route path="/certifications" element={
        <ProtectedRoute>
          <Certifications />
        </ProtectedRoute>
      } />

      <Route path="/college-solutions" element={
        <ProtectedRoute>
          <CollegeSolutions />
        </ProtectedRoute>
      } />

      <Route path="/assessments" element={
        <ProtectedRoute>
          <Assessments />
        </ProtectedRoute>
      } />

      <Route path="/employers" element={
        <ProtectedRoute>
          <Employers />
        </ProtectedRoute>
      } />

      <Route path="/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />

      <Route path="/ats-templates" element={
        <ProtectedRoute>
          <ATSTemplates />
        </ProtectedRoute>
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />

      {/* PDF Editor - Redirect to Live Editor (deprecated) */}
      <Route path="/pdf-editor/:id" element={
        <ProtectedRoute>
          <LivePdfEditor />
        </ProtectedRoute>
      } />

      {/* Live PDF Editor - WYSIWYG resume editing */}
      <Route path="/live-editor" element={
        <ProtectedRoute>
          <LivePdfEditor />
        </ProtectedRoute>
      } />
      <Route path="/live-editor/:id" element={
        <ProtectedRoute>
          <LivePdfEditor />
        </ProtectedRoute>
      } />

      {/* Demo Editor - No authentication required */}
      <Route path="/demo/pdf-editor" element={<LivePdfEditor />} />
      <Route path="/demo/live-editor" element={<LivePdfEditor />} />

      <Route path="/pricing" element={<Pricing />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

      {/* Hidden Admin Dashboard - Not linked anywhere */}
      <Route path="/nexus-control" element={<AdminDashboard />} />

      {/* Admin Panel - HTTPBasic Auth protected */}
      <Route path="/admin" element={<AdminPanel />} />

      {/* Catch-all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <SentryErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorFallback error={error} resetError={resetError} />
      )}
      showDialog={false}
    >
      <QueryClientProvider client={queryClient}>
        <Router>
          <ScrollToTop />
          <SmoothScrollProvider>
            <AuthProvider>
              <TooltipProvider>
                <AppRoutes />
                <Toaster />
                <Sonner />
              </TooltipProvider>
            </AuthProvider>
          </SmoothScrollProvider>
        </Router>
      </QueryClientProvider>
    </SentryErrorBoundary>
  );
}

export default App;
