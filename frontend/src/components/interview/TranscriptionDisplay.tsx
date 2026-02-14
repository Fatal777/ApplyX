import { useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Mic, Volume2, User, Bot, MessageSquare } from 'lucide-react';
import type { TranscriptEntry } from '@/hooks/useLiveKitInterview';

interface TranscriptionDisplayProps {
    /** Transcript entries streamed from useLiveKitInterview */
    transcripts: TranscriptEntry[];
    /** Is the agent currently speaking */
    agentIsSpeaking: boolean;
    /** Is the user mic active */
    isMicEnabled: boolean;
    className?: string;
}

/** A consolidated message: merges consecutive segments from the same speaker */
interface ConsolidatedMessage {
    key: string;
    speaker: 'ai' | 'user';
    text: string;
    isLive: boolean;
    timestamp: number;
}

/**
 * TranscriptionDisplay Component (v2.0 — Premium)
 *
 * - Consolidates consecutive same-speaker segments into a single bubble
 * - Auto-scrolls smoothly as new text arrives
 * - Premium glassmorphism styling with larger chat area
 */
export function TranscriptionDisplay({
    transcripts,
    agentIsSpeaking,
    isMicEnabled,
    className,
}: TranscriptionDisplayProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Consolidate consecutive same-speaker segments into single messages
    const consolidated = useMemo<ConsolidatedMessage[]>(() => {
        if (transcripts.length === 0) return [];

        const groups: ConsolidatedMessage[] = [];
        let current: ConsolidatedMessage | null = null;

        for (const entry of transcripts) {
            if (current && current.speaker === entry.speaker) {
                // Same speaker — merge text into current bubble
                // Avoid duplicating if the new segment text is already at the end
                const trimmedNew = entry.text.trim();
                if (trimmedNew && !current.text.endsWith(trimmedNew)) {
                    current.text = current.text.trimEnd() + ' ' + trimmedNew;
                }
                // Still live if any segment is not final
                if (!entry.isFinal) current.isLive = true;
                current.key += '|' + entry.id;
            } else {
                // Speaker changed — close current and start new group
                if (current) groups.push(current);
                current = {
                    key: entry.id,
                    speaker: entry.speaker,
                    text: entry.text.trim(),
                    isLive: !entry.isFinal,
                    timestamp: entry.timestamp,
                };
            }
        }
        if (current) groups.push(current);

        return groups;
    }, [transcripts]);

    // Smooth auto-scroll on every transcript change
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [consolidated]);

    return (
        <div className={cn(
            'flex flex-col rounded-2xl overflow-hidden',
            'bg-white/80 backdrop-blur-xl border border-white/20 shadow-lg',
            className,
        )}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-gray-50">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 text-sm">Live Transcript</h3>
                        <p className="text-[11px] text-gray-400">Real-time conversation</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {agentIsSpeaking && (
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full ring-1 ring-indigo-100">
                            <Volume2 className="w-3 h-3 animate-pulse" />
                            AI Speaking
                        </span>
                    )}
                    {isMicEnabled && (
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full ring-1 ring-emerald-100">
                            <Mic className="w-3 h-3" />
                            Mic On
                        </span>
                    )}
                </div>
            </div>

            {/* Transcript Content — much taller */}
            <div
                ref={scrollRef}
                className="flex-1 px-5 py-4 space-y-3 overflow-y-auto min-h-[400px] max-h-[60vh] scroll-smooth"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
            >
                {consolidated.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                        <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                            <Bot className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-medium text-gray-400">Waiting for conversation…</p>
                        <p className="text-xs text-gray-300 mt-1">The transcript will appear here in real time</p>
                    </div>
                )}

                {consolidated.map((msg) => (
                    <TranscriptMessage
                        key={msg.key}
                        speaker={msg.speaker}
                        text={msg.text}
                        isLive={msg.isLive}
                        timestamp={msg.timestamp}
                    />
                ))}

                {/* Scroll sentinel */}
                <div ref={bottomRef} className="h-0" />
            </div>
        </div>
    );
}

function TranscriptMessage({
    speaker,
    text,
    isLive,
    timestamp,
}: {
    speaker: 'ai' | 'user';
    text: string;
    isLive: boolean;
    timestamp: number;
}) {
    const isAI = speaker === 'ai';
    const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className={cn('flex gap-3', !isAI && 'flex-row-reverse')}>
            {/* Avatar */}
            <div
                className={cn(
                    'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm',
                    isAI
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                        : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
                )}
            >
                {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>

            {/* Message Bubble */}
            <div className={cn('flex flex-col max-w-[80%]', !isAI && 'items-end')}>
                <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                        'text-[11px] font-semibold',
                        isAI ? 'text-indigo-600' : 'text-emerald-600',
                    )}>
                        {isAI ? 'AI Interviewer' : 'You'}
                    </span>
                    <span className="text-[10px] text-gray-300">{time}</span>
                </div>
                <div
                    className={cn(
                        'px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed transition-all duration-200',
                        isAI
                            ? 'bg-gray-50 text-gray-800 rounded-tl-md border border-gray-100'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-md shadow-md shadow-indigo-200/50',
                        isLive && 'ring-2 ring-offset-1',
                        isLive && isAI && 'ring-indigo-200',
                        isLive && !isAI && 'ring-purple-300',
                    )}
                >
                    {text}
                    {isLive && (
                        <span className="inline-flex ml-1.5 gap-0.5 align-middle">
                            <span className={cn(
                                'w-1 h-1 rounded-full animate-bounce',
                                isAI ? 'bg-indigo-400' : 'bg-white/80',
                            )} style={{ animationDelay: '0ms' }} />
                            <span className={cn(
                                'w-1 h-1 rounded-full animate-bounce',
                                isAI ? 'bg-indigo-400' : 'bg-white/80',
                            )} style={{ animationDelay: '150ms' }} />
                            <span className={cn(
                                'w-1 h-1 rounded-full animate-bounce',
                                isAI ? 'bg-indigo-400' : 'bg-white/80',
                            )} style={{ animationDelay: '300ms' }} />
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TranscriptionDisplay;
