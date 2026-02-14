import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
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
 * VoiceAgent Component (v3.0 — Compact Inline)
 *
 * Minimal inline indicator for the AI interviewer status.
 * Shows a small avatar + name + status badge.
 * Mute/unmute button is no longer here — it lives in the parent control bar.
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

  const personaGradient = {
    friendly: 'from-emerald-400 to-teal-600',
    professional: 'from-indigo-500 to-violet-600',
    challenging: 'from-orange-500 to-rose-600',
  }[persona];

  const personaName = {
    friendly: 'Alex',
    professional: 'Taylor',
    challenging: 'Jordan',
  }[persona];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Small animated avatar */}
      <div className="relative flex-shrink-0">
        {isSpeaking && (
          <div className={cn(
            'absolute -inset-1 rounded-full bg-gradient-to-r opacity-30 animate-pulse',
            personaGradient,
          )} />
        )}
        <div className={cn(
          'w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center relative z-10',
          'transition-all duration-300 shadow-md',
          personaGradient,
          isSpeaking && 'scale-110',
        )}>
          {isThinking ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : isSpeaking ? (
            <Volume2 className="w-4 h-4 text-white animate-pulse" />
          ) : (
            <span className="text-sm font-bold text-white">
              {personaName.charAt(0)}
            </span>
          )}
        </div>
      </div>

      {/* Name + role */}
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold text-gray-900 leading-tight">{personaName}</span>
        <span className="text-[11px] text-gray-400 leading-tight capitalize">{persona} interviewer</span>
      </div>

      {/* Status badge */}
      <div className="ml-1 flex-shrink-0">
        {isThinking && (
          <span className="text-[11px] text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
            <Loader2 className="w-3 h-3 animate-spin" />
            Thinking
          </span>
        )}
        {isSpeaking && (
          <span className="text-[11px] text-indigo-600 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full">
            <Volume2 className="w-3 h-3" />
            Speaking
          </span>
        )}
        {isListening && (
          <span className="text-[11px] text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full">
            <Mic className="w-3 h-3 animate-pulse" />
            Listening
          </span>
        )}
        {agentState === 'idle' && (
          <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Idle</span>
        )}
      </div>

      {/* LIVE dot when mic active and agent listening */}
      {isMicEnabled && isListening && (
        <div className="flex items-center gap-1 ml-auto flex-shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-[10px] font-medium text-red-500">LIVE</span>
        </div>
      )}
    </div>
  );
}

export default VoiceAgent;
