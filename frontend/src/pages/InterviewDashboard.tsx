/**
 * Interview Dashboard - Premium Full-Screen Experience
 * A sophisticated interview preparation and practice platform
 * with glassmorphism UI, smooth animations, and real-time features
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Play,
  History,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Mic,
  Video,
  Brain,
  Target,
  Trophy,
  Clock,
  TrendingUp,
  Star,
  Zap,
  ArrowRight,
  Calendar,
  Users,
  BookOpen,
  MessageSquare,
  Volume2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Import dashboard components
import DashboardSidebar from '@/components/interview/dashboard/DashboardSidebar';
import StatsOverview from '@/components/interview/dashboard/StatsOverview';
import SessionHistory from '@/components/interview/dashboard/SessionHistory';
import QuickStartPanel from '@/components/interview/dashboard/QuickStartPanel';
import ActiveSession from '@/components/interview/dashboard/ActiveSession';

// View types for the dashboard
type DashboardView = 'overview' | 'practice' | 'history' | 'analytics' | 'settings';

const InterviewDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  // Start a new interview session
  const handleStartInterview = (config: any) => {
    // Navigate to interview room with config
    const params = new URLSearchParams({
      type: config.type,
      difficulty: config.difficulty,
      persona: config.persona,
      questions: config.numQuestions.toString(),
      ...(config.jobRole && { jobRole: config.jobRole }),
      ...(config.resumeId && { resumeId: config.resumeId.toString() }),
    });
    navigate(`/interview/room?${params.toString()}`);
  };

  // Resume an existing session
  const handleResumeSession = (sessionId: number) => {
    setActiveSessionId(sessionId);
    setCurrentView('practice');
  };

  // Handle logout
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0a0a0f] flex">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#c7ff6b]/15 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-purple-500/10 blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Sidebar */}
      <DashboardSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout}
        userName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {currentView === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="h-full overflow-y-auto custom-scrollbar"
            >
              <div className="p-8 space-y-8">
                {/* Header */}
                <header className="flex items-center justify-between">
                  <div>
                    <motion.h1 
                      className="text-3xl font-bold text-white"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}
                      <span className="inline-block ml-2 animate-bounce">👋</span>
                    </motion.h1>
                    <motion.p 
                      className="text-gray-400 mt-1"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      Ready to ace your next interview? Let's practice!
                    </motion.p>
                  </div>
                  
                  <motion.div 
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="px-4 py-2 rounded-full bg-[#c7ff6b]/10 border border-[#c7ff6b]/20">
                      <span className="text-[#c7ff6b] text-sm font-medium flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Pro Member
                      </span>
                    </div>
                  </motion.div>
                </header>

                {/* Stats Overview */}
                <StatsOverview />

                {/* Quick Start Panel */}
                <QuickStartPanel onStartInterview={handleStartInterview} />

                {/* Recent Sessions */}
                <SessionHistory 
                  limit={5} 
                  onViewAll={() => setCurrentView('history')}
                  onResumeSession={handleResumeSession}
                />
              </div>
            </motion.div>
          )}

          {currentView === 'practice' && (
            <motion.div
              key="practice"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="h-full"
            >
              {activeSessionId ? (
                <ActiveSession 
                  sessionId={activeSessionId}
                  onEnd={() => {
                    setActiveSessionId(null);
                    setCurrentView('overview');
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <QuickStartPanel 
                      onStartInterview={handleStartInterview} 
                      fullWidth 
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {currentView === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="h-full overflow-y-auto custom-scrollbar"
            >
              <div className="p-8">
                <header className="mb-8">
                  <h1 className="text-3xl font-bold text-white">Interview History</h1>
                  <p className="text-gray-400 mt-1">Review your past sessions and track your progress</p>
                </header>
                <SessionHistory showAll onResumeSession={handleResumeSession} />
              </div>
            </motion.div>
          )}

          {currentView === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="h-full overflow-y-auto custom-scrollbar"
            >
              <div className="p-8">
                <header className="mb-8">
                  <h1 className="text-3xl font-bold text-white">Performance Analytics</h1>
                  <p className="text-gray-400 mt-1">Deep insights into your interview skills</p>
                </header>
                <StatsOverview detailed />
              </div>
            </motion.div>
          )}

          {currentView === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="h-full overflow-y-auto custom-scrollbar p-8"
            >
              <header className="mb-8">
                <h1 className="text-3xl font-bold text-white">Settings</h1>
                <p className="text-gray-400 mt-1">Customize your interview experience</p>
              </header>
              
              {/* Settings Content - Placeholder */}
              <div className="grid gap-6 max-w-2xl">
                <GlassCard>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Mic className="w-5 h-5 text-[#c7ff6b]" />
                    Audio Settings
                  </h3>
                  <p className="text-gray-400 text-sm">Configure microphone and speaker settings for interviews.</p>
                </GlassCard>
                
                <GlassCard>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Video className="w-5 h-5 text-[#c7ff6b]" />
                    Video Settings
                  </h3>
                  <p className="text-gray-400 text-sm">Adjust camera and video quality preferences.</p>
                </GlassCard>
                
                <GlassCard>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-[#c7ff6b]" />
                    Voice Preferences
                  </h3>
                  <p className="text-gray-400 text-sm">Choose AI interviewer voice and speaking pace.</p>
                </GlassCard>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

// Reusable Glass Card Component
const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`
    relative p-6 rounded-2xl
    bg-white/[0.03] backdrop-blur-xl
    border border-white/[0.08]
    hover:border-white/[0.15] hover:bg-white/[0.05]
    transition-all duration-300
    ${className}
  `}>
    {children}
  </div>
);

export default InterviewDashboard;
