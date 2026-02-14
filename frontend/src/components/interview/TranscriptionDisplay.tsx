import { useRef, useEffect, useMemo, useCallback } from 'react';
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
 * TranscriptionDisplay Component (v4.0 — Dark / immersive / smooth)
 *
 * - Consolidates consecutive same-speaker segments into a single bubble
 * - Reliable auto-scroll with user-scroll-override detection
 * - Smooth word-by-word text appearance via CSS animation
 * - Dark theme to match interview room
 */
export function TranscriptionDisplay({
    transcripts,
    agentIsSpeaking,
    isMicEnabled,
    className,
}: TranscriptionDisplayProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const userScrolledUp = useRef(false);

    // Detect if user manually scrolled up (disable auto-scroll until they scroll back down)
    const handleScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        userScrolledUp.current = distFromBottom > 80;
    }, []);

    // Native wheel handler — fixes react-resizable-panels passive event issue
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const handler = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();
            el.scrollTop += e.deltaY;
            el.scrollLeft += e.deltaX;
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, []);

    // Consolidate consecutive same-speaker segments into single messages
    const consolidated = useMemo<ConsolidatedMessage[]>(() => {
        if (transcripts.length === 0) return [];

        const groups: ConsolidatedMessage[] = [];
        let current: ConsolidatedMessage | null = null;

        for (const entry of transcripts) {
            if (current && current.speaker === entry.speaker) {
                const trimmedNew = entry.text.trim();
                if (trimmedNew && !current.text.endsWith(trimmedNew)) {
                    current.text = current.text.trimEnd() + ' ' + trimmedNew;
                }
                if (!entry.isFinal) current.isLive = true;
                current.key += '|' + entry.id;
            } else {
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

    // Reliable auto-scroll: use requestAnimationFrame + scrollTo for smoothness
    useEffect(() => {
        if (userScrolledUp.current) return;
        const el = scrollRef.current;
        if (!el) return;
        // Use rAF to ensure DOM has painted the new content
        requestAnimationFrame(() => {
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        });
    }, [consolidated]);

    return (
        <div className={cn(
            'flex flex-col overflow-hidden',
            className,
        )}>
            {/* Slim header strip */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-800/60 bg-gray-900/80 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    <span className="font-medium text-gray-300 text-xs">Live Transcript</span>
                </div>
                <div className="flex items-center gap-2">
                    {agentIsSpeaking && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                            <Volume2 className="w-3 h-3 animate-pulse" />
                            AI Speaking
                        </span>
                    )}
                    {isMicEnabled && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            <Mic className="w-3 h-3" />
                            Mic On
                        </span>
                    )}
                </div>
            </div>

            {/* Transcript Content — fills available space */}
            <div className="relative flex-1 min-h-0">
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="absolute inset-0 px-5 py-4 space-y-4 overflow-y-auto scroll-smooth"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#4b5563 transparent' }}
                >
                    {consolidated.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-600">
                            <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
                                <Bot className="w-7 h-7 text-gray-500" />
                            </div>
                            <p className="text-sm font-medium text-gray-500">Waiting for conversation…</p>
                            <p className="text-xs text-gray-600 mt-1">The transcript will appear here in real time</p>
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
        <div
            className={cn('flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300', !isAI && 'flex-row-reverse')}
        >
            {/* Avatar */}
            <div
                className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                    isAI
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'bg-emerald-500/20 text-emerald-400',
                )}
            >
                {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>

            {/* Message Bubble */}
            <div className={cn('flex flex-col max-w-[80%]', !isAI && 'items-end')}>
                <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                        'text-[11px] font-semibold',
                        isAI ? 'text-indigo-400' : 'text-emerald-400',
                    )}>
                        {isAI ? 'AI Interviewer' : 'You'}
                    </span>
                    <span className="text-[10px] text-gray-600">{time}</span>
                </div>
                <div
                    className={cn(
                        'px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed transition-all duration-300',
                        isAI
                            ? 'bg-gray-800/80 text-gray-200 rounded-tl-md border border-gray-700/50'
                            : 'bg-indigo-600 text-white rounded-tr-md shadow-md shadow-indigo-900/30',
                        isLive && 'ring-1 ring-offset-1 ring-offset-gray-950',
                        isLive && isAI && 'ring-indigo-500/30',
                        isLive && !isAI && 'ring-indigo-400/40',
                    )}
                >
                    {isLive ? (
                        <span className="inline">
                            {text.split(' ').map((word, i) => (
                                <span
                                    key={i}
                                    className="inline animate-in fade-in duration-200"
                                    style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                                >
                                    {word}{' '}
                                </span>
                            ))}
                            <span className="inline-flex ml-0.5 gap-0.5 align-middle">
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
                        </span>
                    ) : (
                        text
                    )}
                </div>
            </div>
        </div>
    );
}

export default TranscriptionDisplay;
