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
 * VoiceAgent Component (v1.3)
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

  // Persona colors
  const personaColor = {
    friendly: 'from-green-400 to-emerald-600',
    professional: 'from-blue-400 to-indigo-600',
    challenging: 'from-orange-400 to-red-600',
  }[persona];

  const personaName = {
    friendly: 'Alex',
    professional: 'Taylor',
    challenging: 'Jordan',
  }[persona];

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* AI Avatar */}
      <div className="relative mb-6">
        {/* Animated rings when speaking */}
        {isSpeaking && (
          <>
            <div className={cn('absolute inset-0 rounded-full bg-gradient-to-r opacity-30 animate-ping', personaColor)} />
            <div className={cn('absolute -inset-2 rounded-full bg-gradient-to-r opacity-20 animate-pulse', personaColor)} />
          </>
        )}

        {/* Listening pulse */}
        {isListening && (
          <div className="absolute -inset-2 rounded-full border-2 border-blue-400 opacity-50 animate-pulse" />
        )}

        {/* Avatar circle */}
        <div className={cn(
          'w-32 h-32 rounded-full bg-gradient-to-br flex items-center justify-center relative z-10 transition-all duration-300',
          personaColor,
          isThinking && 'opacity-80',
        )}>
          {isThinking ? (
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          ) : isSpeaking ? (
            <Volume2 className="w-12 h-12 text-white animate-pulse" />
          ) : (
            <span className="text-4xl font-bold text-white">
              {personaName.charAt(0)}
            </span>
          )}
        </div>
      </div>

      {/* Interviewer name */}
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        {personaName}
        <span className="text-sm font-normal text-gray-500 ml-2">
          ({persona} interviewer)
        </span>
      </h3>

      {/* Status indicator */}
      <div className="flex items-center gap-2 mb-6 h-6">
        {isThinking && (
          <span className="text-sm text-yellow-600 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Thinking…
          </span>
        )}
        {isSpeaking && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <Volume2 className="w-3 h-3" />
            Speaking…
          </span>
        )}
        {isListening && (
          <span className="text-sm text-blue-600 flex items-center gap-1">
            <Mic className="w-3 h-3 animate-pulse" />
            Listening…
          </span>
        )}
        {agentState === 'idle' && (
          <span className="text-sm text-gray-400">Ready</span>
        )}
      </div>

      {/* Mic toggle */}
      <Button
        onClick={onToggleMic}
        size="lg"
        variant={isMicEnabled ? 'default' : 'destructive'}
        className="gap-2"
      >
        {isMicEnabled ? (
          <>
            <Mic className="w-5 h-5" />
            Mute
          </>
        ) : (
          <>
            <MicOff className="w-5 h-5" />
            Unmute
          </>
        )}
      </Button>

      {/* Live recording dot */}
      {isMicEnabled && isListening && (
        <div className="mt-4 flex items-center gap-2">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm text-red-600">Live</span>
        </div>
      )}
    </div>
  );
}

export default VoiceAgent;
