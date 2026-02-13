/**
 * useLiveKitInterview Hook (v1.3)
 *
 * Manages the LiveKit room connection for the real-time AI interview.
 * The agent now manages its own audio pipeline — we just need to:
 *  1. Connect to the room & enable our microphone
 *  2. Listen for transcription events (RoomEvent.TranscriptionReceived)
 *  3. Listen for data-channel messages (question_progress / interview_complete)
 *  4. Track the agent's speaking state via audio track subscriptions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Room,
    RoomEvent,
    Track,
    RemoteParticipant,
    RemoteTrack,
    RemoteTrackPublication,
    ConnectionState,
    TranscriptionSegment,
    Participant,
} from 'livekit-client';

// ── Public types ────────────────────────────────────────────────────────────

export interface TranscriptEntry {
    id: string;
    speaker: 'ai' | 'user';
    text: string;
    isFinal: boolean;
    timestamp: number;
}

export interface QuestionProgress {
    current: number;
    total: number;
}

export interface InterviewResult {
    questions_asked: number;
    duration_seconds: number;
    response_scores: Array<{ question_index: number; score: number; notes: string }>;
}

export interface UseLiveKitInterviewOptions {
    /** LiveKit server URL (wss://…) */
    serverUrl: string;
    /** Room access token returned by /livekit/start-interview */
    token: string;
    /** Automatically connect on mount (default true) */
    autoConnect?: boolean;
    /** Callbacks */
    onTranscript?: (entry: TranscriptEntry) => void;
    onQuestionProgress?: (progress: QuestionProgress) => void;
    onInterviewComplete?: (result: InterviewResult) => void;
    onError?: (error: Error) => void;
}

export interface UseLiveKitInterviewReturn {
    /* connection */
    isConnected: boolean;
    isConnecting: boolean;
    connectionState: ConnectionState | null;
    error: string | null;

    /* audio */
    isMicEnabled: boolean;
    agentIsSpeaking: boolean;

    /* interview progress */
    questionProgress: QuestionProgress | null;
    transcripts: TranscriptEntry[];

    /* actions */
    connect: () => Promise<void>;
    disconnect: () => void;
    toggleMic: () => Promise<void>;
}

// ── Hook implementation ─────────────────────────────────────────────────────

export function useLiveKitInterview(
    options: UseLiveKitInterviewOptions,
): UseLiveKitInterviewReturn {
    const {
        serverUrl,
        token,
        autoConnect = true,
        onTranscript,
        onQuestionProgress,
        onInterviewComplete,
        onError,
    } = options;

    const roomRef = useRef<Room | null>(null);
    const callbacksRef = useRef({ onTranscript, onQuestionProgress, onInterviewComplete, onError });
    callbacksRef.current = { onTranscript, onQuestionProgress, onInterviewComplete, onError };

    // ── state ──
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isMicEnabled, setIsMicEnabled] = useState(false);
    const [agentIsSpeaking, setAgentIsSpeaking] = useState(false);
    const [questionProgress, setQuestionProgress] = useState<QuestionProgress | null>(null);
    const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);

    // ── helpers ──

    const addTranscript = useCallback((entry: TranscriptEntry) => {
        setTranscripts(prev => {
            // Replace interim segment with same id, or append
            const idx = prev.findIndex(t => t.id === entry.id);
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = entry;
                return next;
            }
            return [...prev, entry];
        });
        callbacksRef.current.onTranscript?.(entry);
    }, []);

    // ── event handlers (stable refs) ──

    const handleTrackSubscribed = useCallback(
        (track: RemoteTrack, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
            if (track.kind === Track.Kind.Audio) {
                // Auto-attach agent audio to a hidden <audio> element
                const el = document.createElement('audio');
                el.autoplay = true;
                el.id = `lk-audio-${participant.identity}`;
                document.body.appendChild(el);
                track.attach(el);
                setAgentIsSpeaking(true);
            }
        },
        [],
    );

    const handleTrackUnsubscribed = useCallback(
        (track: RemoteTrack, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
            if (track.kind === Track.Kind.Audio) {
                const el = document.getElementById(`lk-audio-${participant.identity}`);
                if (el) {
                    track.detach(el as HTMLMediaElement);
                    el.remove();
                }
                setAgentIsSpeaking(false);
            }
        },
        [],
    );

    const handleActiveSpeakersChanged = useCallback((speakers: Participant[]) => {
        const agentSpeaking = speakers.some(
            s => s instanceof RemoteParticipant && s.identity === 'ai-interviewer',
        );
        setAgentIsSpeaking(agentSpeaking);
    }, []);

    const handleTranscriptionReceived = useCallback(
        (segments: TranscriptionSegment[], participant?: Participant) => {
            for (const seg of segments) {
                const speaker: 'ai' | 'user' =
                    participant instanceof RemoteParticipant ? 'ai' : 'user';
                addTranscript({
                    id: seg.id,
                    speaker,
                    text: seg.text,
                    isFinal: seg.final,
                    timestamp: Date.now(),
                });
            }
        },
        [addTranscript],
    );

    const handleDataReceived = useCallback(
        (payload: Uint8Array) => {
            try {
                const msg = JSON.parse(new TextDecoder().decode(payload));
                if (msg.type === 'question_progress') {
                    const progress: QuestionProgress = { current: msg.current, total: msg.total };
                    setQuestionProgress(progress);
                    callbacksRef.current.onQuestionProgress?.(progress);
                } else if (msg.type === 'interview_complete') {
                    callbacksRef.current.onInterviewComplete?.(msg as InterviewResult);
                }
            } catch {
                // ignore non-JSON payloads
            }
        },
        [],
    );

    // ── connect / disconnect ──

    const connect = useCallback(async () => {
        if (roomRef.current?.state === ConnectionState.Connected) return;

        setIsConnecting(true);
        setError(null);

        try {
            const room = new Room({
                adaptiveStream: true,
                dynacast: true,
                audioCaptureDefaults: {
                    autoGainControl: true,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });

            // Wire up events
            room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
            room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
            room.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged);
            room.on(RoomEvent.TranscriptionReceived, handleTranscriptionReceived);
            room.on(RoomEvent.DataReceived, handleDataReceived);

            room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
                setConnectionState(state);
                if (state === ConnectionState.Connected) {
                    setIsConnected(true);
                    setIsConnecting(false);
                } else if (state === ConnectionState.Disconnected) {
                    setIsConnected(false);
                }
            });

            room.on(RoomEvent.Disconnected, () => {
                setIsConnected(false);
                setIsMicEnabled(false);
            });

            roomRef.current = room;

            await room.connect(serverUrl, token);
            console.log('[LiveKit] Connected to room');

            // Enable mic
            await room.localParticipant.setMicrophoneEnabled(true);
            setIsMicEnabled(true);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Connection failed';
            console.error('[LiveKit] connect error:', err);
            setError(msg);
            callbacksRef.current.onError?.(err instanceof Error ? err : new Error(msg));
            setIsConnecting(false);
        }
    }, [serverUrl, token, handleTrackSubscribed, handleTrackUnsubscribed, handleActiveSpeakersChanged, handleTranscriptionReceived, handleDataReceived]);

    const disconnect = useCallback(() => {
        if (roomRef.current) {
            roomRef.current.disconnect();
            roomRef.current = null;
        }
        setIsConnected(false);
        setIsMicEnabled(false);
        setAgentIsSpeaking(false);
    }, []);

    const toggleMic = useCallback(async () => {
        if (!roomRef.current?.localParticipant) return;
        const next = !isMicEnabled;
        await roomRef.current.localParticipant.setMicrophoneEnabled(next);
        setIsMicEnabled(next);
    }, [isMicEnabled]);

    // Auto-connect if token is provided
    useEffect(() => {
        if (autoConnect && token && serverUrl) {
            connect();
        }
        return () => { disconnect(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, serverUrl]);

    return {
        isConnected,
        isConnecting,
        connectionState,
        error,
        isMicEnabled,
        agentIsSpeaking,
        questionProgress,
        transcripts,
        connect,
        disconnect,
        toggleMic,
    };
}

export default useLiveKitInterview;
