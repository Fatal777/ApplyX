import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AgentState = 'idle' | 'listening' | 'speaking' | 'thinking';

interface VoiceAgentProps {
  /** Current high-level state of the voice agent */
  agentState: AgentState;
  /** Whether the local mic is enabled */
  isMicEnabled: boolean;
  /** Toggle microphone callback */
  onToggleMic: () => void;
  /** Persona used by the interviewer */
  persona?: 'friendly' | 'professional' | 'challenging';
  className?: string;
}

/**
 * VoiceAgent Component (v2.0 — Premium)
 *
 * Pure state-driven visualization — no audio playback logic.
 * LiveKit handles all audio routing; we just render the avatar and controls.
 */
export function VoiceAgent({
  agentState,
  isMicEnabled,
  onToggleMic,
  persona = 'professional',
  className,
}: VoiceAgentProps) {

  const isSpeaking = agentState === 'speaking';
  const isListening = agentState === 'listening';
  const isThinking = agentState === 'thinking';

  // Persona gradients
  const personaGradient = {
    friendly: 'from-emerald-400 via-green-500 to-teal-600',
    professional: 'from-indigo-500 via-purple-500 to-violet-600',
    challenging: 'from-orange-500 via-red-500 to-rose-600',
  }[persona];

  const personaRingColor = {
    friendly: 'border-emerald-300',
    professional: 'border-indigo-300',
    challenging: 'border-orange-300',
  }[persona];

  const personaGlow = {
    friendly: 'shadow-emerald-300/40',
    professional: 'shadow-indigo-400/40',
    challenging: 'shadow-orange-300/40',
  }[persona];

  const personaName = {
    friendly: 'Alex',
    professional: 'Taylor',
    challenging: 'Jordan',
  }[persona];

  return (
    <div className={cn('flex flex-col items-center py-4', className)}>
      {/* AI Avatar */}
      <div className="relative mb-5">
        {/* Outer glow rings when speaking */}
        {isSpeaking && (
          <>
            <div className={cn(
              'absolute -inset-5 rounded-full bg-gradient-to-r opacity-15 animate-ping',
              personaGradient,
            )} />
            <div className={cn(
              'absolute -inset-3 rounded-full bg-gradient-to-r opacity-20 animate-pulse',
              personaGradient,
            )} />
          </>
        )}

        {/* Listening ring */}
        {isListening && (
          <div className={cn(
            'absolute -inset-2 rounded-full border-2 opacity-60 animate-pulse',
            personaRingColor,
          )} />
        )}

        {/* Avatar circle */}
        <div className={cn(
          'w-24 h-24 rounded-full bg-gradient-to-br flex items-center justify-center relative z-10',
          'transition-all duration-300 shadow-xl',
          personaGradient,
          isSpeaking && personaGlow,
          isSpeaking && 'shadow-2xl scale-105',
          isThinking && 'opacity-85',
        )}>
          {isThinking ? (
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          ) : isSpeaking ? (
            <Volume2 className="w-10 h-10 text-white animate-pulse" />
          ) : (
            <span className="text-3xl font-bold text-white drop-shadow-sm">
              {personaName.charAt(0)}
            </span>
          )}
        </div>
      </div>

      {/* Interviewer name */}
      <h3 className="text-base font-semibold text-gray-900 mb-0.5">
        {personaName}
      </h3>
      <p className="text-xs text-gray-400 mb-4 capitalize">{persona} interviewer</p>

      {/* Status indicator */}
      <div className="flex items-center gap-2 mb-4 h-5">
        {isThinking && (
          <span className="text-xs text-amber-600 flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-full">
            <Loader2 className="w-3 h-3 animate-spin" />
            Thinking…
          </span>
        )}
        {isSpeaking && (
          <span className="text-xs text-indigo-600 flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1 rounded-full">
            <Volume2 className="w-3 h-3" />
            Speaking…
          </span>
        )}
        {isListening && (
          <span className="text-xs text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full">
            <Mic className="w-3 h-3 animate-pulse" />
            Listening…
          </span>
        )}
        {agentState === 'idle' && (
          <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">Ready</span>
        )}
      </div>

      {/* Mic toggle — premium button */}
      <Button
        onClick={onToggleMic}
        size="lg"
        className={cn(
          'gap-2 rounded-full px-8 font-medium transition-all duration-200',
          isMicEnabled
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-200/50'
            : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200/50',
        )}
      >
        {isMicEnabled ? (
          <>
            <Mic className="w-4 h-4" />
            Mute
          </>
        ) : (
          <>
            <MicOff className="w-4 h-4" />
            Unmute
          </>
        )}
      </Button>

      {/* Live indicator */}
      {isMicEnabled && isListening && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-xs font-medium text-red-500">Live</span>
        </div>
      )}
    </div>
  );
}

export default VoiceAgent;
