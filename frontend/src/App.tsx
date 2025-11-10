import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ResumeBuilder from "./pages/ResumeBuilder";
import ResumeAnalysis from "./pages/ResumeAnalysis";
import NotFound from "./pages/NotFound";
import MockInterview from "./pages/MockInterview";
import Jobs from "./pages/Jobs";
import Certifications from "./pages/Certifications";
import CollegeSolutions from "./pages/CollegeSolutions";
import Assessments from "./pages/Assessments";
import Employers from "./pages/Employers";
import Settings from "./pages/Settings";
import ATSTemplates from "./pages/ATSTemplates";
import Dashboard from "./pages/Dashboard";
import PDFEditor from "./pages/PDFEditor";
import Pricing from "./pages/Pricing";
import ScrollToTop from "./components/ScrollToTop";

const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

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

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      
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
      
      <Route path="/jobs" element={
        <ProtectedRoute>
          <Jobs />
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
      
      <Route path="/pdf-editor/:id" element={
        <ProtectedRoute>
          <PDFEditor />
        </ProtectedRoute>
      } />
      
      {/* Demo PDF Editor - No authentication required */}
      <Route path="/demo/pdf-editor" element={<PDFEditor />} />
      
      <Route path="/pricing" element={<Pricing />} />
      
      {/* Catch-all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ScrollToTop />
        <AuthProvider>
          <TooltipProvider>
            <AppRoutes />
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
