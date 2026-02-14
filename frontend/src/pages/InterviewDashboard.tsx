/**
 * Interview Dashboard - Notion/Wellfound-inspired Clean Design
 * Aligned with ApplyX design system - light theme, minimal aesthetic
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Mic,
  Video,
  Volume2,
  Play,
  Clock,
  TrendingUp,
  Target,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';

// Import dashboard components
import InterviewSidebar from '@/components/interview/dashboard/InterviewSidebar';
import StatsOverview from '@/components/interview/dashboard/StatsOverview';
import SessionHistory from '@/components/interview/dashboard/SessionHistory';
import QuickStartPanel from '@/components/interview/dashboard/QuickStartPanel';
import ActiveSession from '@/components/interview/dashboard/ActiveSession';
import { ServiceStatusIndicator } from '@/components/interview';
import interviewService, { type InterviewSession } from '@/services/interviewService';

// View types for the dashboard
type DashboardView = 'overview' | 'practice' | 'history' | 'analytics' | 'settings';

const InterviewDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  // Scroll fix — native wheel handler with { passive: false } for each scroll panel
  const overviewRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const analyticsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refs = [overviewRef, historyRef, analyticsRef, settingsRef];
    const cleanups: (() => void)[] = [];
    for (const ref of refs) {
      const el = ref.current;
      if (!el) continue;
      const handler = (e: WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        el.scrollTop += e.deltaY;
        el.scrollLeft += e.deltaX;
      };
      el.addEventListener('wheel', handler, { passive: false });
      cleanups.push(() => el.removeEventListener('wheel', handler));
    }
    return () => cleanups.forEach(fn => fn());
  });

  // Real stats state
  const [stats, setStats] = useState({
    totalSessions: 0,
    practiceHours: 0,
    avgScore: 0,
    improvement: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Start a new interview session
  const handleStartInterview = (config: any) => {
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

  // Load real stats from API
  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoadingStats(true);
        const sessions = await interviewService.listSessions(100, 0);

        // Calculate real stats
        const completedSessions = sessions.filter(s => s.status === 'completed');
        const totalSessions = sessions.length;

        // Calculate practice hours from session durations
        let totalMinutes = 0;
        let totalScore = 0;
        let scoreCount = 0;

        for (const session of completedSessions) {
          // Estimate ~5 min per question
          const questionCount = session.config?.num_questions || 5;
          totalMinutes += questionCount * 5;

          // Try to get feedback scores
          try {
            const feedback = await interviewService.getFeedback(session.id);
            totalScore += feedback.overall_score;
            scoreCount++;
          } catch {
            // Feedback not available for this session
          }
        }

        const practiceHours = totalMinutes / 60;
        const avgScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

        // Calculate improvement (compare last 5 vs previous 5)
        let improvement = 0;
        if (completedSessions.length >= 10) {
          const recent = completedSessions.slice(0, 5);
          const previous = completedSessions.slice(5, 10);

          let recentAvg = 0;
          let previousAvg = 0;
          let recentCount = 0;
          let previousCount = 0;

          for (const session of recent) {
            try {
              const feedback = await interviewService.getFeedback(session.id);
              recentAvg += feedback.overall_score;
              recentCount++;
            } catch { }
          }

          for (const session of previous) {
            try {
              const feedback = await interviewService.getFeedback(session.id);
              previousAvg += feedback.overall_score;
              previousCount++;
            } catch { }
          }

          if (recentCount > 0 && previousCount > 0) {
            const recentScore = recentAvg / recentCount;
            const previousScore = previousAvg / previousCount;
            improvement = Math.round(((recentScore - previousScore) / previousScore) * 100);
          }
        }

        setStats({
          totalSessions,
          practiceHours: Math.round(practiceHours * 10) / 10,
          avgScore,
          improvement
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    if (user) {
      loadStats();
    }
  }, [user]);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email;

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50 flex">
      {/* Sidebar */}
      <InterviewSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout}
        userName={userName}
        userEmail={userEmail}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden bg-white">
        <AnimatePresence mode="wait">
          {currentView === 'overview' && (
            <motion.div
              ref={overviewRef}
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full overflow-y-auto"
            >
              <div className="max-w-5xl mx-auto px-8 py-8">
                {/* Header */}
                <header className="mb-8">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start justify-between"
                  >
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">
                        Good {getGreeting()}, {userName.split(' ')[0]}
                      </h1>
                      <p className="text-gray-500 mt-1">
                        Ready to ace your next interview? Let's practice.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lime-100 border border-lime-200">
                        <Sparkles className="w-4 h-4 text-lime-600" />
                        <span className="text-sm font-medium text-lime-700">Pro Member</span>
                      </span>
                    </div>
                  </motion.div>
                </header>

                {/* Service Status */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="mb-6"
                >
                  <ServiceStatusIndicator className="w-full" />
                </motion.div>

                {/* Quick Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }}
                  className="grid grid-cols-4 gap-4 mb-8"
                >
                  <StatCard
                    label="Total Sessions"
                    value={loadingStats ? "-" : stats.totalSessions.toString()}
                    icon={Play}
                    iconBg="bg-blue-100"
                    iconColor="text-blue-600"
                  />
                  <StatCard
                    label="Practice Hours"
                    value={loadingStats ? "-" : stats.practiceHours.toString()}
                    icon={Clock}
                    iconBg="bg-purple-100"
                    iconColor="text-purple-600"
                  />
                  <StatCard
                    label="Avg. Score"
                    value={loadingStats ? "-" : stats.avgScore.toString()}
                    suffix={loadingStats ? "" : "/100"}
                    icon={Target}
                    iconBg="bg-lime-100"
                    iconColor="text-lime-600"
                  />
                  <StatCard
                    label="Improvement"
                    value={loadingStats ? "-" : `${stats.improvement > 0 ? '+' : ''}${stats.improvement}%`}
                    icon={TrendingUp}
                    iconBg="bg-green-100"
                    iconColor="text-green-600"
                  />
                </motion.div>

                {/* Quick Start Section */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-8"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Start Interview</h2>
                  </div>
                  <QuickStartPanel onStartInterview={handleStartInterview} />
                </motion.div>

                {/* Recent Sessions */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Sessions</h2>
                    <button
                      onClick={() => setCurrentView('history')}
                      className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"
                    >
                      View all
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <SessionHistory
                    limit={5}
                    onViewAll={() => setCurrentView('history')}
                    onResumeSession={handleResumeSession}
                  />
                </motion.div>
              </div>
            </motion.div>
          )}

          {currentView === 'practice' && (
            <motion.div
              key="practice"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
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
                <div className="h-full flex items-center justify-center bg-gray-50">
                  <div className="max-w-3xl w-full px-8">
                    <div className="text-center mb-8">
                      <h1 className="text-2xl font-bold text-gray-900 mb-2">Start a New Interview</h1>
                      <p className="text-gray-500">Choose your interview type and customize your practice session</p>
                    </div>
                    <QuickStartPanel onStartInterview={handleStartInterview} fullWidth />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {currentView === 'history' && (
            <motion.div
              ref={historyRef}
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full overflow-y-auto"
            >
              <div className="max-w-5xl mx-auto px-8 py-8">
                <header className="mb-8">
                  <h1 className="text-2xl font-bold text-gray-900">Interview History</h1>
                  <p className="text-gray-500 mt-1">Review your past sessions and track your progress</p>
                </header>
                <SessionHistory showAll onResumeSession={handleResumeSession} />
              </div>
            </motion.div>
          )}

          {currentView === 'analytics' && (
            <motion.div
              ref={analyticsRef}
              key="analytics"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full overflow-y-auto"
            >
              <div className="max-w-5xl mx-auto px-8 py-8">
                <header className="mb-8">
                  <h1 className="text-2xl font-bold text-gray-900">Performance Analytics</h1>
                  <p className="text-gray-500 mt-1">Deep insights into your interview skills</p>
                </header>
                <StatsOverview detailed />
              </div>
            </motion.div>
          )}

          {currentView === 'settings' && (
            <motion.div
              ref={settingsRef}
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full overflow-y-auto"
            >
              <div className="max-w-3xl mx-auto px-8 py-8">
                <header className="mb-8">
                  <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                  <p className="text-gray-500 mt-1">Customize your interview experience</p>
                </header>

                <div className="space-y-4">
                  <SettingsCard
                    icon={Mic}
                    iconBg="bg-blue-100"
                    iconColor="text-blue-600"
                    title="Audio Settings"
                    description="Configure microphone and speaker settings for interviews"
                  />

                  <SettingsCard
                    icon={Video}
                    iconBg="bg-purple-100"
                    iconColor="text-purple-600"
                    title="Video Settings"
                    description="Adjust camera and video quality preferences"
                  />

                  <SettingsCard
                    icon={Volume2}
                    iconBg="bg-lime-100"
                    iconColor="text-lime-600"
                    title="Voice Preferences"
                    description="Choose AI interviewer voice and speaking pace"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

// Helper function for greeting
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

// Stat Card Component
const StatCard = ({
  label,
  value,
  suffix,
  icon: Icon,
  iconBg,
  iconColor
}: {
  label: string;
  value: string;
  suffix?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}) => (
  <Card className="border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">
            {value}
            {suffix && <span className="text-sm font-normal text-gray-400">{suffix}</span>}
          </p>
        </div>
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Settings Card Component
const SettingsCard = ({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}) => (
  <Card className="border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group">
    <CardContent className="p-5">
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
      </div>
    </CardContent>
  </Card>
);

export default InterviewDashboard;
