import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Settings,
  PhoneOff,
  Loader2,
  AlertCircle,
  LogIn,
  Crown,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

import useLiveKitInterview, {
  type InterviewResult,
  type QuestionProgress,
} from '@/hooks/useLiveKitInterview';
import liveKitService, {
  type StartInterviewResult,
} from '@/services/livekitService';
import type { InterviewFeedback, InterviewPersona, DifficultyLevel, InterviewType } from '@/services/interviewService';

import WebcamDisplay from './WebcamDisplay';
import VoiceAgent from './VoiceAgent';
import FeedbackView from './FeedbackView';
import SubscriptionModal from './SubscriptionModal';
import TranscriptionDisplay from './TranscriptionDisplay';

// ── Types ────────────────────────────────────────────────────────────────────

type InterviewPhase =
  | 'setup'
  | 'in-progress'
  | 'analyzing'
  | 'feedback'
  | 'error'
  | 'auth-required'
  | 'subscription-required';

interface InterviewConfig {
  interviewType: InterviewType;
  difficulty: DifficultyLevel;
  persona: InterviewPersona;
  numQuestions: number;
  resumeId?: number;
  jobRole?: string;
  jobDescription?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export function InterviewRoom() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  // Interview lifecycle
  const [phase, setPhase] = useState<InterviewPhase>('setup');
  const [sessionData, setSessionData] = useState<StartInterviewResult | null>(null);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  // UI
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [webcamActive, setWebcamActive] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Config from URL params
  const [config] = useState<InterviewConfig>(() => ({
    interviewType: (searchParams.get('type') as InterviewType) || 'mixed',
    difficulty: (searchParams.get('difficulty') as DifficultyLevel) || 'intermediate',
    persona: (searchParams.get('persona') as InterviewPersona) || 'professional',
    numQuestions: parseInt(searchParams.get('questions') || '5'),
    resumeId: searchParams.get('resumeId') ? parseInt(searchParams.get('resumeId')!) : undefined,
    jobRole: searchParams.get('jobRole') || undefined,
    jobDescription: searchParams.get('jobDesc') || undefined,
  }));

  // ── LiveKit hook ──────────────────────────────────────────────────────────

  const {
    isConnected,
    isConnecting,
    isMicEnabled,
    agentIsSpeaking,
    questionProgress,
    transcripts,
    disconnect,
    toggleMic,
    error: livekitError,
  } = useLiveKitInterview({
    serverUrl: sessionData?.url ?? '',
    token: sessionData?.token ?? '',
    autoConnect: true,
    onQuestionProgress: (p: QuestionProgress) => {
      console.log('[Interview] question progress:', p);
    },
    onInterviewComplete: async (result: InterviewResult) => {
      console.log('[Interview] complete:', result);
      setPhase('analyzing');

      try {
        // Notify backend — triggers background feedback generation
        if (sessionData) {
          await liveKitService.endInterview(sessionData.room_name, sessionData.session_id);

          toast({ title: 'Interview complete!', description: 'Generating feedback…' });

          // Poll until feedback is ready (2s intervals, max 60s)
          const poll = await liveKitService.waitForFeedback(sessionData.session_id, 2000, 30);

          if (poll.status === 'ready' && poll.feedback) {
            const fb = poll.feedback;
            setFeedback({
              id: 0,
              session_id: 0,
              overall_score: fb.overall_score ?? 0,
              category_scores: fb.category_scores ?? {},
              strengths: fb.strengths ?? [],
              improvements: fb.improvements ?? [],
              detailed_feedback:
                typeof fb.detailed_feedback === 'string'
                  ? { summary: fb.detailed_feedback }
                  : fb.detailed_feedback ?? {},
              recommendations: fb.recommendations ?? [],
              generated_at: fb.generated_at ?? new Date().toISOString(),
            } as InterviewFeedback);
            setPhase('feedback');
            return;
          }
        }

        // Fallback: use agent-side scores if backend feedback failed / timed out
        const avgScore =
          result.response_scores.length > 0
            ? Math.round(
                (result.response_scores.reduce((s, r) => s + r.score, 0) /
                  result.response_scores.length) *
                  10,
              )
            : 50;

        setFeedback({
          id: 0,
          session_id: 0,
          overall_score: avgScore,
          category_scores: { overall: avgScore },
          strengths: ['Completed the interview'],
          improvements: ['Detailed feedback generation timed out — try again'],
          detailed_feedback: {
            summary: `You answered ${result.questions_asked} questions in ${Math.round(result.duration_seconds / 60)} minutes.`,
          },
          recommendations: ['Practice again for more detailed feedback'],
          generated_at: new Date().toISOString(),
        } as InterviewFeedback);
        setPhase('feedback');
      } catch (err) {
        console.error('Error processing interview results:', err);
        setError('Failed to generate feedback');
        setPhase('error');
      }
    },
    onError: (err) => {
      console.error('[LiveKit] error:', err);
      setError(err.message);
    },
  });

  // Derive agent state for VoiceAgent visualization
  const agentState = (() => {
    if (!isConnected) return 'idle' as const;
    if (agentIsSpeaking) return 'speaking' as const;
    if (isMicEnabled) return 'listening' as const;
    return 'idle' as const;
  })();

  // ── Interview lifecycle ───────────────────────────────────────────────────

  const startInterview = useCallback(async () => {
    try {
      setPhase('setup');
      setError(null);

      // Request mic permission upfront
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        toast({
          title: 'Microphone access needed',
          description: 'Please allow microphone access to respond during the interview',
          variant: 'destructive',
        });
      }

      // Create room + get token via the new start-interview endpoint
      const result = await liveKitService.startInterview({
        job_role: config.jobRole || 'Software Engineer',
        difficulty: config.difficulty,
        persona: config.persona,
        interview_type: config.interviewType,
        num_questions: config.numQuestions,
        job_description: config.jobDescription,
      });

      setSessionData(result);
      // useLiveKitInterview auto-connects once sessionData is set
      setPhase('in-progress');

      toast({
        title: 'Interview started',
        description: 'The AI interviewer will begin shortly. Speak naturally!',
      });
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('402') || msg.includes('subscription') || msg.includes('payment')) {
        setPhase('subscription-required');
        setShowSubscriptionModal(true);
        return;
      }
      setError(msg || 'Failed to start interview');
      setPhase('error');
      toast({ title: 'Failed to start interview', description: 'Please try again', variant: 'destructive' });
    }
  }, [config, toast]);

  // Kick off on mount (once auth resolves)
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPhase('auth-required');
      return;
    }
    startInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const handleEndInterview = async () => {
    disconnect();
    if (sessionData && phase === 'in-progress') {
      try {
        await liveKitService.endInterview(sessionData.room_name, sessionData.session_id);
      } catch {
        // best-effort
      }
    }
    navigate('/dashboard');
  };

  const handleRetry = () => {
    disconnect();
    setSessionData(null);
    setFeedback(null);
    setError(null);
    startInterview();
  };

  // Progress bar
  const progress = questionProgress
    ? (questionProgress.current / questionProgress.total) * 100
    : 0;
  const questionLabel = questionProgress
    ? `Question ${questionProgress.current} of ${questionProgress.total}`
    : 'Starting…';

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === 'feedback' && feedback) {
    return (
      <FeedbackView
        feedback={feedback}
        onRetry={handleRetry}
        onBack={() => navigate('/dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={() => setShowExitDialog(true)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Exit Interview
          </Button>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{questionLabel}</span>
            <div className="w-32">
              <Progress value={progress} className="h-2" />
            </div>
          </div>

          <Button variant="outline" size="icon" onClick={() => setWebcamActive((p) => !p)}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {/* Setup/Loading */}
          {phase === 'setup' && (
            <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-[60vh]">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Setting up your interview…</h2>
              <p className="text-gray-600">Creating room & connecting to the AI interviewer</p>
            </motion.div>
          )}

          {/* Analyzing */}
          {phase === 'analyzing' && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-[60vh]">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Analyzing your interview…</h2>
              <p className="text-gray-600">Generating comprehensive feedback</p>
            </motion.div>
          )}

          {/* Auth Required */}
          {phase === 'auth-required' && (
            <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <LogIn className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Sign In Required</h2>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                Please sign in to start a mock interview session.
              </p>
              <div className="flex gap-4">
                <Button onClick={() => navigate('/auth')} className="gap-2">
                  <LogIn className="w-4 h-4" /> Sign In
                </Button>
                <Button variant="outline" onClick={() => navigate('/')}>Back to Home</Button>
              </div>
            </motion.div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-[60vh]">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
              <p className="text-gray-600 mb-6">{error || livekitError}</p>
              <div className="flex gap-4">
                <Button onClick={handleRetry}>Try Again</Button>
                <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
              </div>
            </motion.div>
          )}

          {/* Subscription Required */}
          {phase === 'subscription-required' && (
            <motion.div key="sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#c7ff6b] to-[#a8e063] flex items-center justify-center mb-6 shadow-lg">
                <Crown className="w-12 h-12 text-black" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Subscription Required</h2>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                Unlock AI-powered mock interviews with personalized feedback.
              </p>
              <div className="flex gap-4">
                <Button onClick={() => setShowSubscriptionModal(true)} className="gap-2 bg-gradient-to-r from-[#c7ff6b] to-[#a8e063] hover:from-[#b8f55a] hover:to-[#98d052] text-black font-bold">
                  <Sparkles className="w-4 h-4" /> View Plans
                </Button>
                <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
              </div>
            </motion.div>
          )}

          {/* In Progress — the actual interview */}
          {phase === 'in-progress' && (
            <motion.div key="in-progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid lg:grid-cols-3 gap-6">
              {/* Voice Agent + Transcript — main area */}
              <div className="lg:col-span-2">
                <Card className="p-8">
                  <VoiceAgent
                    agentState={agentState}
                    isMicEnabled={isMicEnabled}
                    onToggleMic={toggleMic}
                    persona={config.persona}
                  />

                  <TranscriptionDisplay
                    transcripts={transcripts}
                    agentIsSpeaking={agentIsSpeaking}
                    isMicEnabled={isMicEnabled}
                    className="mt-6"
                  />
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                <WebcamDisplay isActive={webcamActive} className="aspect-video w-full" />

                <Card className="p-4">
                  <h3 className="font-medium mb-2">Interview Details</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Type: <span className="capitalize">{config.interviewType.replace('_', ' ')}</span></p>
                    <p>Difficulty: <span className="capitalize">{config.difficulty}</span></p>
                    {config.jobRole && <p>Role: {config.jobRole}</p>}
                    {isConnecting && <p className="text-yellow-600">Connecting…</p>}
                    {isConnected && <p className="text-green-600">Connected</p>}
                  </div>
                </Card>

                <Button variant="destructive" className="w-full gap-2" onClick={() => setShowExitDialog(true)}>
                  <PhoneOff className="w-4 h-4" />
                  End Interview
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Exit Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Interview?</DialogTitle>
            <DialogDescription>
              Are you sure you want to exit? Your progress will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExitDialog(false)}>
              Continue Interview
            </Button>
            <Button variant="destructive" onClick={handleEndInterview}>
              Exit Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        feature="Mock Interview"
      />
    </div>
  );
}

export default InterviewRoom;
