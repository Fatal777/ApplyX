/**
 * Active Session Component
 * Live interview interface with webcam, AI avatar, transcript, and timer
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  MessageSquare,
  Clock,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import interviewService, { InterviewQuestion, InterviewFeedback } from '@/services/interviewService';

interface ActiveSessionProps {
  sessionId: number;
  onEnd: () => void;
}

// Timer display component
const Timer = ({ seconds }: { seconds: number }) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return (
    <span className="font-mono">
      {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
    </span>
  );
};

// Audio visualizer component
const AudioVisualizer = ({ isActive }: { isActive: boolean }) => {
  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-[#c7ff6b] rounded-full"
          animate={{
            height: isActive 
              ? [8, 24, 16, 32, 12][i % 5] + Math.random() * 16
              : 4,
          }}
          transition={{
            duration: 0.2,
            repeat: isActive ? Infinity : 0,
            repeatType: 'reverse',
          }}
        />
      ))}
    </div>
  );
};

// AI Avatar component
const AIAvatar = ({ isSpeaking, persona }: { isSpeaking: boolean; persona: string }) => {
  return (
    <div className="relative">
      {/* Glow ring when speaking */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="absolute inset-0 rounded-full bg-[#c7ff6b]/20 blur-xl"
          />
        )}
      </AnimatePresence>
      
      {/* Avatar */}
      <motion.div
        animate={{ scale: isSpeaking ? [1, 1.05, 1] : 1 }}
        transition={{ duration: 1, repeat: isSpeaking ? Infinity : 0 }}
        className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white/10"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
          <Sparkles className="w-12 h-12 text-white" />
        </div>
        
        {/* Animated rings */}
        {isSpeaking && (
          <>
            <motion.div
              className="absolute inset-0 border-2 border-[#c7ff6b]/30 rounded-full"
              animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 border-2 border-[#c7ff6b]/30 rounded-full"
              animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            />
          </>
        )}
      </motion.div>
      
      {/* Status indicator */}
      <div className={`
        absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-[#0a0a0f]
        flex items-center justify-center
        ${isSpeaking ? 'bg-[#c7ff6b]' : 'bg-gray-600'}
      `}>
        {isSpeaking ? (
          <Volume2 className="w-3 h-3 text-black" />
        ) : (
          <VolumeX className="w-3 h-3 text-white" />
        )}
      </div>
    </div>
  );
};

// Transcript bubble component
const TranscriptBubble = ({ 
  text, 
  isAI, 
  timestamp 
}: { 
  text: string; 
  isAI: boolean;
  timestamp: Date;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}
  >
    <div className={`
      max-w-[80%] p-4 rounded-2xl
      ${isAI 
        ? 'bg-white/[0.05] border border-white/[0.1]' 
        : 'bg-gradient-to-r from-primary to-purple-600'
      }
    `}>
      <p className="text-white text-sm">{text}</p>
      <span className="text-xs text-gray-400 mt-1 block">
        {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  </motion.div>
);

const ActiveSession = ({ sessionId, onEnd }: ActiveSessionProps) => {
  const { toast } = useToast();
  
  // Session state
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<Array<{ text: string; isAI: boolean; timestamp: Date }>>([]);
  
  // Media state
  const [webcamEnabled, setWebcamEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [timer, setTimer] = useState(0);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Initialize session and webcam
  useEffect(() => {
    initializeSession();
    setupWebcam();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [sessionId]);

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const initializeSession = async () => {
    try {
      setIsLoading(true);
      const status = await interviewService.getSessionStatus(sessionId);
      
      // If session has questions in config, use them
      // Otherwise fetch from status
      setCurrentQuestionIndex(status.current_question - 1);
      setIsLoading(false);
      
      // Add initial AI greeting
      setTranscript([{
        text: "Hello! I'm your AI interviewer today. Let's begin when you're ready.",
        isAI: true,
        timestamp: new Date()
      }]);
      
    } catch (err) {
      setError('Failed to load interview session');
      setIsLoading(false);
    }
  };

  const setupWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Failed to access webcam:', err);
      toast({
        title: "Camera access denied",
        description: "Enable camera for the full interview experience",
        variant: "destructive"
      });
    }
  };

  const toggleWebcam = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setWebcamEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
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
      setIsRecording(true);
    } catch (err) {
      toast({
        title: "Microphone error",
        description: "Please allow microphone access",
        variant: "destructive"
      });
    }
  }, [sessionId, currentQuestionIndex]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const processRecording = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Convert to base64
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });
      
      // Transcribe
      const transcribeResponse = await interviewService.transcribeAudio({
        session_id: sessionId,
        audio_data: base64Audio,
        audio_format: 'webm',
        question_number: currentQuestionIndex + 1,
      });
      
      if (transcribeResponse.success && transcribeResponse.transcript) {
        // Add user response to transcript
        setTranscript(prev => [...prev, {
          text: transcribeResponse.transcript,
          isAI: false,
          timestamp: new Date()
        }]);
        
        // Get AI response
        setIsSpeaking(true);
        const respondResponse = await interviewService.getInterviewerResponse({
          session_id: sessionId,
          question_number: currentQuestionIndex + 1,
          transcript: transcribeResponse.transcript,
        });
        
        // Add AI response to transcript
        setTranscript(prev => [...prev, {
          text: respondResponse.response_text,
          isAI: true,
          timestamp: new Date()
        }]);
        
        // Check if interview is complete
        if (respondResponse.is_conclusion) {
          await completeInterview();
        } else if (respondResponse.next_question) {
          setCurrentQuestionIndex(prev => prev + 1);
        }
        
        setIsSpeaking(false);
      }
    } catch (err) {
      toast({
        title: "Processing error",
        description: "Failed to process your response",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const completeInterview = async () => {
    try {
      await interviewService.analyzeInterview(sessionId);
      toast({
        title: "Interview completed!",
        description: "Generating your feedback...",
      });
      onEnd();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to complete interview",
        variant: "destructive"
      });
    }
  };

  const handleEndInterview = async () => {
    try {
      await interviewService.cancelInterview(sessionId);
      toast({
        title: "Interview ended",
        description: "Your progress has been saved",
      });
      onEnd();
    } catch (err) {
      onEnd();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">Loading interview session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white font-medium mb-4">{error}</p>
          <Button onClick={onEnd}>Go Back</Button>
        </div>
      </div>
    );
  }

  const progress = questions.length > 0 
    ? ((currentQuestionIndex + 1) / questions.length) * 100 
    : 0;

  return (
    <div className="h-full flex flex-col">
      {/* Top Bar */}
      <div className="
        flex items-center justify-between px-6 py-4
        bg-white/[0.02] border-b border-white/[0.08]
      ">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white">
            <Clock className="w-4 h-4 text-[#c7ff6b]" />
            <Timer seconds={timer} />
          </div>
          
          <div className="h-4 w-px bg-white/10" />
          
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Progress</span>
            <div className="w-32">
              <Progress value={progress} className="h-2 bg-white/10" />
            </div>
            <span className="text-white text-sm font-medium">
              {currentQuestionIndex + 1}/{questions.length || '?'}
            </span>
          </div>
        </div>
        
        <Button
          variant="ghost"
          onClick={handleEndInterview}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <PhoneOff className="w-4 h-4 mr-2" />
          End Interview
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Video & Controls */}
        <div className="w-1/3 p-6 flex flex-col border-r border-white/[0.08]">
          {/* AI Avatar */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <AIAvatar isSpeaking={isSpeaking} persona="professional" />
            <p className="text-white font-medium mt-4">AI Interviewer</p>
            <p className="text-gray-400 text-sm">
              {isSpeaking ? 'Speaking...' : isProcessing ? 'Thinking...' : 'Listening'}
            </p>
            
            {/* Audio Visualizer */}
            <div className="mt-6">
              <AudioVisualizer isActive={isRecording || isSpeaking} />
            </div>
          </div>
          
          {/* Webcam Preview */}
          <div className="relative rounded-2xl overflow-hidden bg-black/50 aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!webcamEnabled ? 'hidden' : ''}`}
            />
            {!webcamEnabled && (
              <div className="absolute inset-0 flex items-center justify-center">
                <VideoOff className="w-8 h-8 text-gray-500" />
              </div>
            )}
            
            {/* Recording Indicator */}
            {isRecording && (
              <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 rounded-full bg-red-500/80">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-white text-xs font-medium">Recording</span>
              </div>
            )}
          </div>

          {/* Media Controls */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMic}
              className={`
                rounded-full w-12 h-12 border-white/20
                ${micEnabled ? 'bg-white/5 text-white' : 'bg-red-500/20 text-red-400 border-red-500/50'}
              `}
            >
              {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={toggleWebcam}
              className={`
                rounded-full w-12 h-12 border-white/20
                ${webcamEnabled ? 'bg-white/5 text-white' : 'bg-red-500/20 text-red-400 border-red-500/50'}
              `}
            >
              {webcamEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>
            
            {/* Main Record/Stop Button */}
            <Button
              size="icon"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing || isSpeaking}
              className={`
                rounded-full w-16 h-16 transition-all
                ${isRecording 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-gradient-to-r from-[#c7ff6b] to-[#a8e063] hover:opacity-90'
                }
              `}
            >
              {isProcessing ? (
                <Loader2 className="w-6 h-6 animate-spin text-black" />
              ) : isRecording ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Mic className="w-6 h-6 text-black" />
              )}
            </Button>
          </div>
          
          <p className="text-center text-gray-400 text-sm mt-3">
            {isRecording 
              ? 'Click to stop recording' 
              : isProcessing 
                ? 'Processing your response...'
                : 'Click to start speaking'
            }
          </p>
        </div>

        {/* Right Panel - Transcript */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-white/[0.08]">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#c7ff6b]" />
              Conversation
            </h2>
          </div>
          
          {/* Transcript Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {transcript.map((item, index) => (
              <TranscriptBubble
                key={index}
                text={item.text}
                isAI={item.isAI}
                timestamp={item.timestamp}
              />
            ))}
            <div ref={transcriptEndRef} />
          </div>
          
          {/* Input Hint */}
          <div className="p-4 bg-white/[0.02] border-t border-white/[0.08]">
            <div className="flex items-center gap-3 text-gray-400 text-sm">
              <Mic className="w-4 h-4" />
              <span>Press the microphone button to respond</span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Scrollbar Style */}
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

export default ActiveSession;
