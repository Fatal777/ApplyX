import { useState } from 'react';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface LatencyData {
    stt?: number;
    ai?: number;
    tts?: number;
    timestamp: number;
}

interface LatencyMonitorProps {
    className?: string;
    compact?: boolean;
}

export function LatencyMonitor({ className, compact = false }: LatencyMonitorProps) {
    const [latencies, setLatencies] = useState<LatencyData[]>([]);
    const [expanded, setExpanded] = useState(!compact);

    // Get latest latency for each service
    const latest = latencies[latencies.length - 1];

    // Calculate averages
    const avgStt = latencies.length > 0
        ? Math.round(latencies.reduce((sum, l) => sum + (l.stt || 0), 0) / latencies.filter(l => l.stt).length)
        : 0;
    const avgAi = latencies.length > 0
        ? Math.round(latencies.reduce((sum, l) => sum + (l.ai || 0), 0) / latencies.filter(l => l.ai).length)
        : 0;
    const avgTts = latencies.length > 0
        ? Math.round(latencies.reduce((sum, l) => sum + (l.tts || 0), 0) / latencies.filter(l => l.tts).length)
        : 0;

    const getLatencyColor = (ms: number | undefined, type: 'stt' | 'ai' | 'tts') => {
        if (!ms) return 'text-gray-400';

        // Different thresholds for different services
        const thresholds = {
            stt: { good: 500, moderate: 1000 },
            ai: { good: 2000, moderate: 4000 },
            tts: { good: 1000, moderate: 2000 }
        };

        const threshold = thresholds[type];
        if (ms < threshold.good) return 'text-green-600';
        if (ms < threshold.moderate) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getLatencyBg = (ms: number | undefined, type: 'stt' | 'ai' | 'tts') => {
        if (!ms) return 'bg-gray-100';

        const thresholds = {
            stt: { good: 500, moderate: 1000 },
            ai: { good: 2000, moderate: 4000 },
            tts: { good: 1000, moderate: 2000 }
        };

        const threshold = thresholds[type];
        if (ms < threshold.good) return 'bg-green-100';
        if (ms < threshold.moderate) return 'bg-yellow-100';
        return 'bg-red-100';
    };

    // Expose method to add latency data
    const addLatency = (data: Partial<Omit<LatencyData, 'timestamp'>>) => {
        setLatencies(prev => [...prev.slice(-19), { ...data, timestamp: Date.now() }]);
    };

    // Expose via ref or global context if needed
    (window as any).__latencyMonitor = { addLatency };

    if (compact && !expanded) {
        return (
            <button
                onClick={() => setExpanded(true)}
                className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 transition-colors",
                    className
                )}
            >
                <Activity className="w-4 h-4 text-gray-600" />
                <span className="text-gray-700">Latency</span>
                {latest && (
                    <div className="flex gap-1">
                        {latest.stt && (
                            <span className={cn("text-xs font-medium", getLatencyColor(latest.stt, 'stt'))}>
                                STT: {latest.stt}ms
                            </span>
                        )}
                    </div>
                )}
            </button>
        );
    }

    return (
        <Card className={cn("p-4", className)}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-gray-600" />
                    <h3 className="text-sm font-medium">Performance Metrics</h3>
                </div>
                {compact && (
                    <button onClick={() => setExpanded(false)}>
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                    </button>
                )}
            </div>

            <div className="space-y-3">
                {/* STT Latency */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            latest?.stt ? getLatencyBg(latest.stt, 'stt') : 'bg-gray-200'
                        )} />
                        <span className="text-sm text-gray-600">Speech-to-Text</span>
                    </div>
                    <div className="flex flex-col items-end">
                        {latest?.stt && (
                            <span className={cn("text-sm font-medium", getLatencyColor(latest.stt, 'stt'))}>
                                {latest.stt}ms
                            </span>
                        )}
                        {avgStt > 0 && (
                            <span className="text-xs text-gray-400">
                                avg: {avgStt}ms
                            </span>
                        )}
                    </div>
                </div>

                {/* AI Latency */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            latest?.ai ? getLatencyBg(latest.ai, 'ai') : 'bg-gray-200'
                        )} />
                        <span className="text-sm text-gray-600">AI Response</span>
                    </div>
                    <div className="flex flex-col items-end">
                        {latest?.ai && (
                            <span className={cn("text-sm font-medium", getLatencyColor(latest.ai, 'ai'))}>
                                {latest.ai}ms
                            </span>
                        )}
                        {avgAi > 0 && (
                            <span className="text-xs text-gray-400">
                                avg: {avgAi}ms
                            </span>
                        )}
                    </div>
                </div>

                {/* TTS Latency */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            latest?.tts ? getLatencyBg(latest.tts, 'tts') : 'bg-gray-200'
                        )} />
                        <span className="text-sm text-gray-600">Text-to-Speech</span>
                    </div>
                    <div className="flex flex-col items-end">
                        {latest?.tts && (
                            <span className={cn("text-sm font-medium", getLatencyColor(latest.tts, 'tts'))}>
                                {latest.tts}ms
                            </span>
                        )}
                        {avgTts > 0 && (
                            <span className="text-xs text-gray-400">
                                avg: {avgTts}ms
                            </span>
                        )}
                    </div>
                </div>

                {latencies.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">
                        No metrics yet. Start interviewing to see real-time performance.
                    </p>
                )}
            </div>

            {latencies.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500">
                        Total requests: {latencies.length}
                    </p>
                </div>
            )}
        </Card>
    );
}

// Helper to track latency in Interview Room
export const trackLatency = {
    stt: (startTime: number) => {
        const latency = Date.now() - startTime;
        (window as any).__latencyMonitor?.addLatency({ stt: latency });
        return latency;
    },
    ai: (startTime: number) => {
        const latency = Date.now() - startTime;
        (window as any).__latencyMonitor?.addLatency({ ai: latency });
        return latency;
    },
    tts: (startTime: number) => {
        const latency = Date.now() - startTime;
        (window as any).__latencyMonitor?.addLatency({ tts: latency });
        return latency;
    }
};

export default LatencyMonitor;
