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
  LogIn
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

import WebcamDisplay from './WebcamDisplay';
import VoiceAgent from './VoiceAgent';
import FeedbackView from './FeedbackView';
import interviewService, { 
  type InterviewQuestion,
  type InterviewFeedback,
  type InterviewPersona,
  type DifficultyLevel,
  type InterviewType
} from '@/services/interviewService';

type InterviewPhase = 'setup' | 'in-progress' | 'analyzing' | 'feedback' | 'error' | 'auth-required';

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
  const [sessionId, setSessionId] = useState<number | null>(null);
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
  
  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
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
      
      const response = await interviewService.startInterview({
        interview_type: config.interviewType,
        difficulty: config.difficulty,
        persona: config.persona,
        num_questions: config.numQuestions,
        resume_id: config.resumeId,
        job_role: config.jobRole,
        job_description: config.jobDescription,
      });
      
      setSessionId(response.session_id);
      setQuestions(response.questions);
      setPhase('in-progress');
      
      toast({
        title: "Interview started",
        description: `${response.questions.length} questions prepared. Good luck!`,
      });
      
      // Play greeting audio if available
      if (response.greeting_audio) {
        setCurrentAudio(response.greeting_audio);
        setIsSpeaking(true);
      }
    } catch (err) {
      console.error('Failed to start interview:', err);
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        await processRecording(audioBlob);
        stream.getTracks().forEach(track => track.stop());
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
  }, []);

  const stopRecording = useCallback(() => {
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
      const transcribeResponse = await interviewService.transcribeAudio({
        session_id: sessionId,
        audio_data: base64Audio,
        audio_format: 'webm',
        question_number: currentQuestionIndex + 1,
      });
      
      if (!transcribeResponse.success) {
        throw new Error(transcribeResponse.error || 'Transcription failed');
      }
      
      setTranscript(transcribeResponse.transcript);
      
      // Get AI response
      const respondResponse = await interviewService.getInterviewerResponse({
        session_id: sessionId,
        question_number: currentQuestionIndex + 1,
        transcript: transcribeResponse.transcript,
      });
      
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
      const analyzeResponse = await interviewService.analyzeInterview(sessionId);
      
      if (analyzeResponse.success) {
        const feedbackData = await interviewService.getFeedback(sessionId);
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
    if (sessionId && phase === 'in-progress') {
      try {
        await interviewService.cancelInterview(sessionId);
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

          {/* In-Progress Phase */}
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
                    audioToPlay={currentAudio}
                    persona={config.persona}
                  />
                  
                  {/* Transcript display */}
                  {transcript && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Your response:</p>
                      <p className="text-gray-700">{transcript}</p>
                    </div>
                  )}
                </Card>
              </div>

              {/* Webcam Section - Right */}
              <div className="space-y-4">
                <WebcamDisplay 
                  isActive={webcamActive} 
                  className="aspect-video w-full"
                />
                
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
    </div>
  );
}

export default InterviewRoom;
