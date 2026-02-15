import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  PhoneOff,
  Loader2,
  AlertCircle,
  LogIn,
  Crown,
  Sparkles,
  Mic,
  MicOff,
  Video,
  VideoOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  // Ref to always access latest transcripts inside callbacks
  const transcriptsRef = useRef<{ speaker: string; text: string; isFinal: boolean }[]>([]);

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
      // Immediately disconnect LiveKit + stop media tracks
      disconnect();
      setWebcamActive(false);
      setPhase('analyzing');

      try {
        // Notify backend — triggers background feedback generation
        if (sessionData) {
          const transcriptText = buildTranscriptText();
          await liveKitService.endInterview(sessionData.room_name, sessionData.session_id, transcriptText);

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
            : 0;

        setFeedback({
          id: 0,
          session_id: 0,
          overall_score: avgScore,
          category_scores: avgScore > 0 ? { overall: avgScore } : {},
          strengths: avgScore > 0 ? ['Completed the interview'] : [],
          improvements: ['Detailed feedback generation timed out — try again for accurate results'],
          detailed_feedback: {
            summary: avgScore > 0
              ? `You answered ${result.questions_asked} questions in ${Math.round(result.duration_seconds / 60)} minutes.`
              : 'Feedback generation timed out. Please retry the interview for accurate scoring.',
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

  // Build formatted transcript string from transcript entries for feedback generation
  const buildTranscriptText = useCallback(() => {
    // Use ref so this works inside stale closures (e.g. hook callbacks)
    const t = transcriptsRef.current;
    if (!t || t.length === 0) return '';
    return t
      .filter(e => e.isFinal)
      .map(e => `${e.speaker === 'ai' ? 'Interviewer' : 'Candidate'}: ${e.text}`)
      .join('\n');
  }, []);

  // Keep ref in sync with hook state
  useEffect(() => {
    transcriptsRef.current = transcripts;
  }, [transcripts]);

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
        job_role: config.jobRole || 'General',
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

  // Kick off on mount (once auth resolves) — guarded to prevent restarts
  const hasStartedRef = useRef(false);
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPhase('auth-required');
      return;
    }
    // Only start if not already started and in initial setup phase
    if (hasStartedRef.current || phase !== 'setup' || sessionData) return;
    hasStartedRef.current = true;
    startInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // Safety net: if all questions done but interview_complete never received, auto-end after 45s
  useEffect(() => {
    if (
      phase === 'in-progress' &&
      questionProgress &&
      questionProgress.current >= questionProgress.total
    ) {
      const timer = setTimeout(() => {
        console.warn('[Interview] Auto-ending — all questions done but no interview_complete received');
        handleEndInterview();
      }, 20_000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, questionProgress]);

  const handleEndInterview = async () => {
    setShowExitDialog(false);
    disconnect();
    setWebcamActive(false);

    if (sessionData && phase === 'in-progress') {
      setPhase('analyzing');

      try {
        const transcriptText = buildTranscriptText();
        await liveKitService.endInterview(sessionData.room_name, sessionData.session_id, transcriptText);
        toast({ title: 'Interview ended', description: 'Generating your feedback report…' });

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
      } catch (err) {
        console.error('Error generating feedback:', err);
      }

      // Fallback if polling failed or timed out
      setFeedback({
        id: 0,
        session_id: 0,
        overall_score: 0,
        category_scores: {},
        strengths: [],
        improvements: ['Feedback generation timed out — your transcript was sent but scoring failed'],
        detailed_feedback: { summary: 'Interview ended. Feedback generation timed out. Please try again.' },
        recommendations: ['Practice again for accurate feedback scoring'],
        generated_at: new Date().toISOString(),
      } as InterviewFeedback);
      setPhase('feedback');
    } else {
      navigate('/dashboard');
    }
  };

  const handleRetry = () => {
    disconnect();
    setWebcamActive(true);
    setSessionData(null);
    setFeedback(null);
    setError(null);
    setPhase('setup');
    hasStartedRef.current = false;
    startInterview();
  };

  // Progress bar — show contextual label based on phase/connection state
  const progress = (() => {
    if (phase === 'analyzing' || phase === 'feedback') return 100;
    if (questionProgress) return (questionProgress.current / questionProgress.total) * 100;
    return 0;
  })();
  const questionLabel = (() => {
    if (phase === 'analyzing') return 'Analyzing responses…';
    if (phase === 'feedback') return 'Complete';
    if (phase === 'setup') return 'Setting up…';
    if (questionProgress) return `Question ${questionProgress.current} of ${questionProgress.total}`;
    if (isConnecting) return 'Connecting…';
    if (isConnected) return 'Interview in Progress';
    return 'Starting…';
  })();

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
    <div className="h-screen flex flex-col bg-gray-950">
      {/* ── Header Bar ─────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-4 py-2.5 z-30">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Exit */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => phase === 'in-progress' ? setShowExitDialog(true) : navigate('/dashboard')}
              className="text-gray-400 hover:text-white hover:bg-gray-800 gap-1.5 flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Exit</span>
            </Button>
          </div>

          {/* Center: Progress */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs font-medium text-gray-400 whitespace-nowrap">{questionLabel}</span>
            <div className="w-28 sm:w-40">
              <Progress value={progress} className="h-1.5 bg-gray-700" />
            </div>
          </div>

          {/* Right: status indicator */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {phase === 'in-progress' && isConnected && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          {/* Setup/Loading */}
          {phase === 'setup' && (
            <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-white">Setting up your interview…</h2>
              <p className="text-gray-400">Creating room & connecting to the AI interviewer</p>
            </motion.div>
          )}

          {/* Analyzing */}
          {phase === 'analyzing' && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-white">Analyzing your interview…</h2>
              <p className="text-gray-400">Generating comprehensive feedback</p>
            </motion.div>
          )}

          {/* Auth Required */}
          {phase === 'auth-required' && (
            <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-6">
                <LogIn className="w-10 h-10 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-white">Sign In Required</h2>
              <p className="text-gray-400 mb-6 text-center max-w-md">
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
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-white">Something went wrong</h2>
              <p className="text-gray-400 mb-6">{error || livekitError}</p>
              <div className="flex gap-4">
                <Button onClick={handleRetry}>Try Again</Button>
                <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
              </div>
            </motion.div>
          )}

          {/* Subscription Required */}
          {phase === 'subscription-required' && (
            <motion.div key="sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#c7ff6b] to-[#a8e063] flex items-center justify-center mb-6 shadow-lg">
                <Crown className="w-12 h-12 text-black" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white">Subscription Required</h2>
              <p className="text-gray-400 mb-6 text-center max-w-md">
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

          {/* ── In Progress — the actual interview ─────────────────── */}
          {phase === 'in-progress' && (
            <motion.div
              key="in-progress"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-row"
            >
              {/* Left 3/4 — Chat / Transcript */}
              <div className="w-3/4 h-full min-h-0 border-r border-gray-800">
                <TranscriptionDisplay
                  transcripts={transcripts}
                  agentIsSpeaking={agentIsSpeaking}
                  isMicEnabled={isMicEnabled}
                  className="h-full rounded-none border-0 shadow-none bg-gray-950"
                />
              </div>

              {/* Right 1/4 — Sidebar: AI agent + Webcam + Controls */}
              <div className="w-1/4 h-full flex flex-col bg-gray-900 overflow-hidden">
                {/* AI Interviewer Card */}
                <div className="p-4 border-b border-gray-800">
                  <VoiceAgent
                    agentState={agentState}
                    isMicEnabled={isMicEnabled}
                    onToggleMic={toggleMic}
                    persona={config.persona}
                    className="[&_span]:text-gray-300 [&_span.text-gray-900]:text-gray-100 [&_span.text-gray-400]:text-gray-500"
                  />
                </div>

                {/* Question Progress */}
                <div className="px-4 py-3 border-b border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-400">Progress</span>
                    <span className="text-xs font-semibold text-gray-300">{questionLabel}</span>
                  </div>
                  <Progress value={progress} className="h-1.5 bg-gray-700" />
                </div>

                {/* Webcam */}
                <div className="flex-1 min-h-0 p-3">
                  {webcamActive ? (
                    <div className="w-full h-full max-h-[220px] rounded-xl overflow-hidden ring-1 ring-gray-700/50 bg-gray-950">
                      <WebcamDisplay isActive={webcamActive} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-32 rounded-xl bg-gray-800 flex items-center justify-center">
                      <VideoOff className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Sidebar Controls */}
                <div className="p-3 border-t border-gray-800 space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleMic}
                      className={`flex-1 gap-1.5 rounded-lg ${
                        isMicEnabled
                          ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                          : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                      }`}
                    >
                      {isMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                      <span className="text-xs">{isMicEnabled ? 'Mic On' : 'Mic Off'}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setWebcamActive(p => !p)}
                      className={`flex-1 gap-1.5 rounded-lg ${
                        webcamActive
                          ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10'
                          : 'text-gray-500 hover:text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {webcamActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                      <span className="text-xs">{webcamActive ? 'Cam On' : 'Cam Off'}</span>
                    </Button>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => setShowExitDialog(true)}
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                    End Interview
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
