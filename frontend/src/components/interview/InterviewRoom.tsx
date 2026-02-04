import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Settings,
  Phone,
  PhoneOff,
  Loader2,
  AlertCircle,
  CheckCircle,
  LogIn,
  Crown,
  Sparkles
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
import useLiveKitInterview from '@/hooks/useLiveKitInterview';

import WebcamDisplay from './WebcamDisplay';
import VoiceAgent from './VoiceAgent';
import FeedbackView from './FeedbackView';
import SubscriptionModal from './SubscriptionModal';
import { LatencyMonitor } from './LatencyMonitor';
import TranscriptionDisplay from './TranscriptionDisplay';
import interviewService, {
  type InterviewQuestion,
  type InterviewFeedback,
  type InterviewPersona,
  type DifficultyLevel,
  type InterviewType
} from '@/services/interviewService';

type InterviewPhase = 'setup' | 'in-progress' | 'analyzing' | 'feedback' | 'error' | 'auth-required' | 'subscription-required';

interface InterviewConfig {
  interviewType: InterviewType;
  difficulty: DifficultyLevel;
  persona: InterviewPersona;
  numQuestions: number;
  resumeId?: number;
  jobRole?: string;
  jobDescription?: string;
}

/**
 * InterviewRoom Component
 * Main interview experience - handles the full interview flow
 */
export function InterviewRoom() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  // Interview state
  const [phase, setPhase] = useState<InterviewPhase>('setup');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [interviewSession, setInterviewSession] = useState<any | null>(null); // LiveKit session data
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [webcamActive, setWebcamActive] = useState(true);
  const [currentAudio, setCurrentAudio] = useState<string | undefined>();
  const [transcript, setTranscript] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');  // Real-time transcription
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // LiveKit interview hook - connects audio properly to the room
  const {
    isConnected: isLiveKitConnected,
    isConnecting: isLiveKitConnecting,
    isMicEnabled,
    aiIsSpeaking,
    connect: connectLiveKit,
    disconnect: disconnectLiveKit,
    toggleMic,
    error: livekitError,
  } = useLiveKitInterview({
    roomName: interviewSession?.room_name || `interview-${Date.now()}`,
    participantName: 'candidate',
    onTranscript: (text, isFinal) => {
      // User's speech transcribed by Deepgram STT
      if (isFinal) {
        setLiveTranscript(prev => prev + (prev ? '\n\nYou: ' : 'You: ') + text);
      }
    },
    onAIResponse: (text) => {
      // Agent's text response (for transcript display)
      setLiveTranscript(prev => prev + (prev ? '\n\nAI: ' : 'AI: ') + text);
    },
    onError: (err) => {
      console.error('LiveKit error:', err);
      setError(err.message);
    },
  });

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Interview config from URL params or defaults
  const [config] = useState<InterviewConfig>(() => ({
    interviewType: (searchParams.get('type') as InterviewType) || 'mixed',
    difficulty: (searchParams.get('difficulty') as DifficultyLevel) || 'intermediate',
    persona: (searchParams.get('persona') as InterviewPersona) || 'professional',
    numQuestions: parseInt(searchParams.get('questions') || '5'),
    resumeId: searchParams.get('resumeId') ? parseInt(searchParams.get('resumeId')!) : undefined,
    jobRole: searchParams.get('jobRole') || undefined,
    jobDescription: searchParams.get('jobDesc') || undefined,
  }));

  // Cleanup function to stop all media
  const cleanupMedia = useCallback(() => {
    // Stop recording if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.log('MediaRecorder already stopped');
      }
    }
    mediaRecorderRef.current = null;
    setIsListening(false);

    // Stop audio stream tracks (mic)
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped audio track:', track.kind);
      });
      audioStreamRef.current = null;
    }

    // Turn off webcam
    setWebcamActive(false);

    // Clear audio
    setCurrentAudio(undefined);
    setIsSpeaking(false);
  }, []);

  // Tab visibility handler - pause/resume on tab switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden - pause media
        console.log('Tab hidden - pausing interview');
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.pause();
        }
        setCurrentAudio(undefined); // Stop TTS audio
        setIsSpeaking(false);
      } else {
        // Tab visible - resume
        console.log('Tab visible - resuming interview');
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
          mediaRecorderRef.current.resume();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanupMedia();
    };
  }, [cleanupMedia]);

  // Check auth and start interview on mount
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setPhase('auth-required');
      setError('Please sign in to start an interview');
      return;
    }

    startInterview();
  }, [user, authLoading]);

  const startInterview = async () => {
    try {
      setPhase('setup');
      setError(null);

      // Request mic permission upfront
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop immediately, just requesting permission
      } catch (micErr) {
        console.warn('Mic permission denied/unavailable:', micErr);
        toast({
          title: "Microphone access needed",
          description: "Please allow microphone access to respond during the interview",
          variant: "destructive",
        });
      }

      // Create interview session
      const response = await interviewService.startInterview({
        interview_type: config.interviewType,
        difficulty: config.difficulty,
        persona: config.persona,
        num_questions: config.numQuestions,
        resume_id: config.resumeId,
        job_role: config.jobRole,
        job_description: config.jobDescription,
      });

      setSessionId(response.session_id?.toString() || null);
      setInterviewSession(response);
      setQuestions(response.questions);

      // Connect to LiveKit room - this connects user audio to the agent
      await connectLiveKit();

      setPhase('in-progress');

      toast({
        title: "Interview started",
        description: "The AI interviewer will begin shortly. Speak naturally!",
      });

    } catch (err: any) {
      console.error('Failed to start interview:', err);

      // Check if it's a 402 Payment Required error
      const errorMessage = err?.message || '';
      const is402Error = errorMessage.includes('402') ||
        errorMessage.includes('payment') ||
        errorMessage.includes('subscription') ||
        errorMessage.includes('credits');

      if (is402Error) {
        setPhase('subscription-required');
        setShowSubscriptionModal(true);
        return;
      }

      setError(err instanceof Error ? err.message : 'Failed to start interview');
      setPhase('error');
      toast({
        title: "Failed to start interview",
        description: "Please check your connection and try again",
        variant: "destructive",
      });
    }
  };

  const startRecording = useCallback(async () => {
    try {
      // LiveKit handles audio automatically via useLiveKitInterview hook
      setLiveTranscript('');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream; // Store stream ref for cleanup

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Use live transcript from LiveKit
        const finalTranscript = liveTranscript;
        setTranscript(finalTranscript.trim());

        await processRecording(audioBlob);
        // Stop stream tracks after processing
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
          audioStreamRef.current = null;
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Microphone access denied. Please allow microphone access.');
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to continue the interview",
        variant: "destructive",
      });
    }
  }, [liveTranscript]);

  const stopRecording = useCallback(() => {
    // LiveKit handles audio automatically();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const processRecording = async (audioBlob: Blob) => {
    if (!sessionId) return;

    setIsProcessing(true);

    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]); // Remove data URL prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      // Transcribe audio
      const transcribeStartTime = Date.now();
      const transcribeResponse = await interviewService.transcribeAudio({
        session_id: sessionId ? parseInt(sessionId) : 0,
        audio_data: base64Audio,
        audio_format: 'webm',
        question_number: currentQuestionIndex + 1,
      });

      // Track STT latency
      const sttLatency = Date.now() - transcribeStartTime;
      (window as any).__latencyMonitor?.addLatency({ stt: sttLatency });

      if (!transcribeResponse.success) {
        throw new Error(transcribeResponse.error || 'Transcription failed');
      }

      setTranscript(transcribeResponse.transcript);

      // Get AI response
      const aiStartTime = Date.now();
      const respondResponse = await interviewService.getInterviewerResponse({
        session_id: sessionId ? parseInt(sessionId) : 0,
        question_number: currentQuestionIndex + 1,
        transcript: transcribeResponse.transcript,
      });

      // Track AI latency
      const aiLatency = Date.now() - aiStartTime;
      (window as any).__latencyMonitor?.addLatency({ ai: aiLatency });

      // Play response audio
      if (respondResponse.audio_data) {
        setCurrentAudio(respondResponse.audio_data);
        setIsSpeaking(true);
      }

      // Check if interview is complete
      if (respondResponse.is_conclusion) {
        toast({
          title: "Interview complete!",
          description: "Analyzing your responses...",
        });
        await completeInterview();
      } else if (respondResponse.next_question) {
        // Move to next question
        setCurrentQuestionIndex(prev => prev + 1);
      }

    } catch (err) {
      console.error('Error processing recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to process your response');
    } finally {
      setIsProcessing(false);
    }
  };

  const completeInterview = async () => {
    if (!sessionId) return;

    setPhase('analyzing');

    try {
      const analyzeResponse = await interviewService.analyzeInterview(sessionId ? parseInt(sessionId) : 0);

      if (analyzeResponse.success) {
        const feedbackData = await interviewService.getFeedback(sessionId ? parseInt(sessionId) : 0);
        setFeedback(feedbackData);
        setPhase('feedback');
        toast({
          title: "Feedback ready!",
          description: "Your interview analysis is complete",
        });
      }
    } catch (err) {
      console.error('Error completing interview:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate feedback');
      setPhase('error');
      toast({
        title: "Analysis failed",
        description: "Failed to generate feedback. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEndInterview = async () => {
    // Cleanup media before exiting
    cleanupMedia();

    if (sessionId && phase === 'in-progress') {
      try {
        await interviewService.cancelInterview(sessionId ? parseInt(sessionId) : 0);
        toast({
          title: "Interview cancelled",
          description: "Your progress has been saved",
        });
      } catch (err) {
        console.error('Error cancelling interview:', err);
      }
    }
    navigate('/dashboard');
  };

  const handleRetry = () => {
    setPhase('setup');
    setSessionId(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setFeedback(null);
    setError(null);
    startInterview();
  };

  // Calculate progress
  const progress = questions.length > 0
    ? ((currentQuestionIndex + 1) / questions.length) * 100
    : 0;

  // Render feedback view
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
          <Button
            variant="ghost"
            onClick={() => setShowExitDialog(true)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit Interview
          </Button>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <div className="w-32">
              <Progress value={progress} className="h-2" />
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setWebcamActive(prev => !prev)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {/* Setup/Loading Phase */}
          {phase === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Setting up your interview...</h2>
              <p className="text-gray-600">Preparing personalized questions</p>
            </motion.div>
          )}

          {/* Analyzing Phase */}
          {phase === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Analyzing your interview...</h2>
              <p className="text-gray-600">Generating comprehensive feedback</p>
            </motion.div>
          )}

          {/* Auth Required Phase */}
          {phase === 'auth-required' && (
            <motion.div
              key="auth-required"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <LogIn className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Sign In Required</h2>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                Please sign in to your account to start a mock interview session.
                Your progress and feedback will be saved to your profile.
              </p>
              <div className="flex gap-4">
                <Button onClick={() => navigate('/auth')} className="gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Button>
                <Button variant="outline" onClick={() => navigate('/')}>
                  Back to Home
                </Button>
              </div>
            </motion.div>
          )}

          {/* Error Phase */}
          {phase === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <div className="flex gap-4">
                <Button onClick={handleRetry}>Try Again</Button>
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </Button>
              </div>
            </motion.div>
          )}

          {/* Subscription Required Phase */}
          {phase === 'subscription-required' && (
            <motion.div
              key="subscription-required"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#c7ff6b] to-[#a8e063] flex items-center justify-center mb-6 shadow-lg">
                <Crown className="w-12 h-12 text-black" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Subscription Required</h2>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                Unlock AI-powered mock interviews with personalized feedback. Choose a plan that fits your job search needs.
              </p>
              <div className="flex gap-4">
                <Button
                  onClick={() => setShowSubscriptionModal(true)}
                  className="gap-2 bg-gradient-to-r from-[#c7ff6b] to-[#a8e063] hover:from-[#b8f55a] hover:to-[#98d052] text-black font-bold"
                >
                  <Sparkles className="w-4 h-4" />
                  View Plans
                </Button>
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </Button>
              </div>
            </motion.div>
          )}

          {phase === 'in-progress' && (
            <motion.div
              key="in-progress"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid lg:grid-cols-3 gap-6"
            >
              {/* Voice Agent Section - Left/Main */}
              <div className="lg:col-span-2">
                <Card className="p-8">
                  <VoiceAgent
                    isListening={isListening}
                    isSpeaking={isSpeaking}
                    isProcessing={isProcessing}
                    currentQuestion={questions[currentQuestionIndex]?.question || ''}
                    onStartRecording={startRecording}
                    onStopRecording={stopRecording}
                    onAudioEnd={() => {
                      setIsSpeaking(false);
                      setCurrentAudio(undefined);
                    }}
                    audioToPlay={currentAudio}
                    persona={config.persona}
                  />

                  {/* Live Transcription Display */}
                  <TranscriptionDisplay
                    aiText={questions[currentQuestionIndex]?.question}
                    userText={isListening
                      ? (liveTranscript + (interimText ? ' ' + interimText : '')).trim() || 'Listening...'
                      : transcript
                    }
                    isAiSpeaking={isSpeaking}
                    isUserSpeaking={isListening}
                    className="mt-6"
                  />
                </Card>
              </div>

              {/* Webcam Section - Right */}
              <div className="space-y-4">
                <WebcamDisplay
                  isActive={webcamActive}
                  className="aspect-video w-full"
                />

                {/* Latency Monitor */}
                <LatencyMonitor className="w-full" compact={false} />

                {/* Interview info */}
                <Card className="p-4">
                  <h3 className="font-medium mb-2">Interview Details</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Type: <span className="capitalize">{config.interviewType.replace('_', ' ')}</span></p>
                    <p>Difficulty: <span className="capitalize">{config.difficulty}</span></p>
                    {config.jobRole && <p>Role: {config.jobRole}</p>}
                  </div>
                </Card>

                {/* End call button */}
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={completeInterview}
                >
                  <PhoneOff className="w-4 h-4" />
                  End Interview
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Interview?</DialogTitle>
            <DialogDescription>
              Are you sure you want to exit? Your progress will be lost and you won't receive feedback.
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
