import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Mic, Volume2, User, Bot } from 'lucide-react';

interface TranscriptEntry {
    id: string;
    type: 'ai' | 'user';
    text: string;
    timestamp: Date;
}

interface TranscriptionDisplayProps {
    aiText?: string;          // Current AI question/response text
    userText?: string;        // Current user transcript (live)
    isAiSpeaking: boolean;
    isUserSpeaking: boolean;
    conversationHistory?: TranscriptEntry[];
    className?: string;
}

/**
 * TranscriptionDisplay Component
 * Shows live transcription of AI questions and user responses
 */
export function TranscriptionDisplay({
    aiText,
    userText,
    isAiSpeaking,
    isUserSpeaking,
    conversationHistory = [],
    className
}: TranscriptionDisplayProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new content appears
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [aiText, userText, conversationHistory]);

    return (
        <div className={cn("flex flex-col bg-gray-50 rounded-xl border border-gray-200", className)}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white rounded-t-xl">
                <h3 className="font-semibold text-gray-800">Live Transcript</h3>
                <div className="flex items-center gap-3">
                    {isAiSpeaking && (
                        <span className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                            <Volume2 className="w-3 h-3 animate-pulse" />
                            AI Speaking
                        </span>
                    )}
                    {isUserSpeaking && (
                        <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            <Mic className="w-3 h-3 animate-pulse" />
                            Recording
                        </span>
                    )}
                </div>
            </div>

            {/* Transcript Content */}
            <div
                ref={scrollRef}
                className="flex-1 p-4 space-y-4 overflow-y-auto max-h-80"
            >
                {/* Conversation History */}
                {conversationHistory.map((entry) => (
                    <TranscriptMessage
                        key={entry.id}
                        type={entry.type}
                        text={entry.text}
                        isLive={false}
                    />
                ))}

                {/* Current AI Text */}
                {aiText && (
                    <TranscriptMessage
                        type="ai"
                        text={aiText}
                        isLive={isAiSpeaking}
                    />
                )}

                {/* Current User Text */}
                {userText && (
                    <TranscriptMessage
                        type="user"
                        text={userText}
                        isLive={isUserSpeaking}
                    />
                )}

                {/* Empty State */}
                {!aiText && !userText && conversationHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <Bot className="w-8 h-8 mb-2" />
                        <p className="text-sm">Transcript will appear here</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function TranscriptMessage({
    type,
    text,
    isLive
}: {
    type: 'ai' | 'user';
    text: string;
    isLive: boolean;
}) {
    const isAI = type === 'ai';

    return (
        <div className={cn(
            "flex gap-3",
            !isAI && "flex-row-reverse"
        )}>
            {/* Avatar */}
            <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                isAI ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
            )}>
                {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>

            {/* Message Bubble */}
            <div className={cn(
                "flex-1 px-4 py-2 rounded-2xl max-w-[85%]",
                isAI
                    ? "bg-white border border-gray-200 rounded-tl-sm"
                    : "bg-blue-600 text-white rounded-tr-sm",
                isLive && "animate-pulse"
            )}>
                <p className={cn(
                    "text-sm leading-relaxed",
                    isAI ? "text-gray-700" : "text-white"
                )}>
                    {text}
                    {isLive && (
                        <span className="inline-flex ml-1">
                            <span className="animate-bounce delay-0">.</span>
                            <span className="animate-bounce delay-75">.</span>
                            <span className="animate-bounce delay-150">.</span>
                        </span>
                    )}
                </p>
            </div>
        </div>
    );
}

export default TranscriptionDisplay;
