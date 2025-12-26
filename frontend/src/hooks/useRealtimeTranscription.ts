/**
 * useRealtimeTranscription Hook
 * Streams audio to backend WebSocket for real-time Deepgram transcription
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface TranscriptionResult {
    text: string;
    isFinal: boolean;
    speechFinal: boolean;
}

interface UseRealtimeTranscriptionOptions {
    onTranscript?: (result: TranscriptionResult) => void;
    onUtteranceEnd?: () => void;
    onError?: (error: string) => void;
    sampleRate?: number;
}

interface UseRealtimeTranscriptionReturn {
    // State
    isConnected: boolean;
    isRecording: boolean;
    interimText: string;
    finalText: string;
    error: string | null;

    // Actions
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    clearTranscript: () => void;
}

// Get WebSocket URL from API URL
const getWsUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    // Convert http(s) to ws(s)
    const wsUrl = apiUrl.replace(/^http/, 'ws');
    return `${wsUrl}/api/v1/transcription/stream`;
};

export function useRealtimeTranscription(
    options: UseRealtimeTranscriptionOptions = {}
): UseRealtimeTranscriptionReturn {
    const {
        onTranscript,
        onUtteranceEnd,
        onError,
        sampleRate = 16000,
    } = options;

    // State
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [interimText, setInterimText] = useState('');
    const [finalText, setFinalText] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Refs
    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    /**
     * Convert Float32Array to Int16Array (PCM 16-bit)
     */
    const floatTo16BitPCM = (input: Float32Array): Int16Array => {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        return output;
    };

    /**
     * Downsample audio to target sample rate
     */
    const downsample = (
        buffer: Float32Array,
        inputSampleRate: number,
        outputSampleRate: number
    ): Float32Array => {
        if (inputSampleRate === outputSampleRate) {
            return buffer;
        }
        const ratio = inputSampleRate / outputSampleRate;
        const newLength = Math.round(buffer.length / ratio);
        const result = new Float32Array(newLength);
        let offsetResult = 0;
        let offsetBuffer = 0;
        while (offsetResult < result.length) {
            const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
            let accum = 0;
            let count = 0;
            for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
                accum += buffer[i];
                count++;
            }
            result[offsetResult] = accum / count;
            offsetResult++;
            offsetBuffer = nextOffsetBuffer;
        }
        return result;
    };

    /**
     * Start recording and streaming to WebSocket
     */
    const startRecording = useCallback(async () => {
        try {
            setError(null);
            setInterimText('');

            // Create WebSocket connection
            const ws = new WebSocket(getWsUrl());
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('Transcription WebSocket connected');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'ready') {
                        setIsConnected(true);
                        console.log('Transcription ready');
                    } else if (data.type === 'transcript') {
                        const result: TranscriptionResult = {
                            text: data.text,
                            isFinal: data.is_final,
                            speechFinal: data.speech_final,
                        };

                        if (data.is_final) {
                            // Append to final text
                            setFinalText(prev => prev + (prev ? ' ' : '') + data.text);
                            setInterimText('');
                        } else {
                            // Update interim text
                            setInterimText(data.text);
                        }

                        onTranscript?.(result);
                    } else if (data.type === 'utterance_end') {
                        onUtteranceEnd?.();
                    } else if (data.type === 'error') {
                        setError(data.message);
                        onError?.(data.message);
                    }
                } catch (e) {
                    console.error('Failed to parse WebSocket message:', e);
                }
            };

            ws.onerror = (event) => {
                console.error('WebSocket error:', event);
                setError('Connection error');
                onError?.('Connection error');
            };

            ws.onclose = () => {
                console.log('Transcription WebSocket closed');
                setIsConnected(false);
                setIsRecording(false);
            };

            // Wait for WebSocket to be ready
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('WebSocket connection timeout'));
                }, 5000);

                const checkReady = () => {
                    if (ws.readyState === WebSocket.OPEN) {
                        clearTimeout(timeout);
                        resolve();
                    } else if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
                        clearTimeout(timeout);
                        reject(new Error('WebSocket connection failed'));
                    } else {
                        setTimeout(checkReady, 100);
                    }
                };
                checkReady();
            });

            // Get microphone stream
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: { ideal: sampleRate },
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });
            streamRef.current = stream;

            // Create audio context and processor
            const audioContext = new AudioContext({ sampleRate: stream.getAudioTracks()[0].getSettings().sampleRate || 44100 });
            audioContextRef.current = audioContext;

            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;

            // Use ScriptProcessor for audio processing (deprecated but widely supported)
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (event) => {
                if (ws.readyState !== WebSocket.OPEN) return;

                const inputData = event.inputBuffer.getChannelData(0);

                // Downsample to target sample rate
                const downsampled = downsample(inputData, audioContext.sampleRate, sampleRate);

                // Convert to 16-bit PCM
                const pcmData = floatTo16BitPCM(downsampled);

                // Send to WebSocket
                ws.send(pcmData.buffer);
            };

            source.connect(processor);
            processor.connect(audioContext.destination);

            setIsRecording(true);
            console.log('Recording started');

        } catch (err) {
            console.error('Failed to start recording:', err);
            const message = err instanceof Error ? err.message : 'Failed to start recording';
            setError(message);
            onError?.(message);
        }
    }, [sampleRate, onTranscript, onUtteranceEnd, onError]);

    /**
     * Stop recording
     */
    const stopRecording = useCallback(() => {
        // Stop processor
        if (processorRef.current && sourceRef.current) {
            sourceRef.current.disconnect();
            processorRef.current.disconnect();
            processorRef.current = null;
            sourceRef.current = null;
        }

        // Close audio context
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        // Stop media stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        // Close WebSocket
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        setIsRecording(false);
        setIsConnected(false);
        console.log('Recording stopped');
    }, []);

    /**
     * Clear transcript
     */
    const clearTranscript = useCallback(() => {
        setInterimText('');
        setFinalText('');
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopRecording();
        };
    }, [stopRecording]);

    return {
        isConnected,
        isRecording,
        interimText,
        finalText,
        error,
        startRecording,
        stopRecording,
        clearTranscript,
    };
}

export default useRealtimeTranscription;
