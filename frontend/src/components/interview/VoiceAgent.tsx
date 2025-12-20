import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Volume2, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceAgentProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  currentQuestion: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onAudioEnd?: () => void; // Called when AI audio finishes playing
  audioToPlay?: string; // Base64 audio data
  className?: string;
  persona?: 'friendly' | 'professional' | 'challenging';
}

/**
 * VoiceAgent Component
 * Handles voice interaction with the AI interviewer
 * - Shows AI speaking animation
 * - Shows listening state
 * - Handles audio playback
 */
export function VoiceAgent({
  isListening,
  isSpeaking,
  isProcessing,
  currentQuestion,
  onStartRecording,
  onStopRecording,
  onAudioEnd,
  audioToPlay,
  className,
  persona = 'professional'
}: VoiceAgentProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  // Play audio when audioToPlay changes
  useEffect(() => {
    if (audioToPlay && audioRef.current) {
      const audioSrc = `data:audio/mp3;base64,${audioToPlay}`;
      audioRef.current.src = audioSrc;
      audioRef.current.play().catch(console.error);
      setAudioPlaying(true);
    }
  }, [audioToPlay]);

  const handleAudioEnd = () => {
    setAudioPlaying(false);
    onAudioEnd?.(); // Notify parent that audio finished
  };

  // Get persona avatar color
  const getPersonaColor = () => {
    switch (persona) {
      case 'friendly': return 'from-green-400 to-emerald-600';
      case 'challenging': return 'from-orange-400 to-red-600';
      default: return 'from-blue-400 to-indigo-600';
    }
  };

  // Get persona name
  const getPersonaName = () => {
    switch (persona) {
      case 'friendly': return 'Alex';
      case 'challenging': return 'Jordan';
      default: return 'Taylor';
    }
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnd}
        className="hidden"
      />

      {/* AI Avatar */}
      <div className="relative mb-6">
        {/* Animated rings when speaking */}
        {(isSpeaking || audioPlaying) && (
          <>
            <div className={cn(
              "absolute inset-0 rounded-full bg-gradient-to-r opacity-30 animate-ping",
              getPersonaColor()
            )} />
            <div className={cn(
              "absolute -inset-2 rounded-full bg-gradient-to-r opacity-20 animate-pulse",
              getPersonaColor()
            )} />
          </>
        )}

        {/* Avatar circle */}
        <div className={cn(
          "w-32 h-32 rounded-full bg-gradient-to-br flex items-center justify-center relative z-10",
          getPersonaColor()
        )}>
          {isProcessing ? (
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          ) : (isSpeaking || audioPlaying) ? (
            <Volume2 className="w-12 h-12 text-white animate-pulse" />
          ) : (
            <span className="text-4xl font-bold text-white">
              {getPersonaName().charAt(0)}
            </span>
          )}
        </div>
      </div>

      {/* Interviewer name */}
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        {getPersonaName()}
        <span className="text-sm font-normal text-gray-500 ml-2">
          ({persona} interviewer)
        </span>
      </h3>

      {/* Status indicator */}
      <div className="flex items-center gap-2 mb-4">
        {isProcessing && (
          <span className="text-sm text-yellow-600 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing...
          </span>
        )}
        {(isSpeaking || audioPlaying) && !isProcessing && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <Volume2 className="w-3 h-3" />
            Speaking...
          </span>
        )}
        {isListening && (
          <span className="text-sm text-blue-600 flex items-center gap-1">
            <Mic className="w-3 h-3 animate-pulse" />
            Listening...
          </span>
        )}
      </div>

      {/* Current question display */}
      <div className="w-full max-w-md bg-gray-100 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-500 mb-1">Current Question:</p>
        <p className="text-gray-800">{currentQuestion}</p>
      </div>

      {/* Recording controls */}
      <div className="flex gap-4">
        {!isListening ? (
          <Button
            onClick={onStartRecording}
            disabled={isProcessing || isSpeaking || audioPlaying}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Mic className="w-5 h-5 mr-2" />
            Start Speaking
          </Button>
        ) : (
          <Button
            onClick={onStopRecording}
            size="lg"
            variant="destructive"
            className="animate-pulse"
          >
            <MicOff className="w-5 h-5 mr-2" />
            Stop Recording
          </Button>
        )}
      </div>

      {/* Recording indicator */}
      {isListening && (
        <div className="mt-4 flex items-center gap-2">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm text-red-600">Recording...</span>
        </div>
      )}
    </div>
  );
}

export default VoiceAgent;
