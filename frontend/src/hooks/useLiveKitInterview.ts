/**
 * useLiveKitInterview Hook
 * Manages LiveKit connection for real-time AI interview sessions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Room,
    RoomEvent,
    Track,
    RemoteParticipant,
    RemoteTrack,
    RemoteTrackPublication,
    LocalParticipant,
    ConnectionState,
    DataPacket_Kind,
} from 'livekit-client';
import { liveKitService, LiveKitToken } from '@/services/livekitService';

interface UseLiveKitInterviewOptions {
    roomName: string;
    participantName?: string;
    onTranscript?: (text: string, isFinal: boolean) => void;
    onAIResponse?: (text: string) => void;
    onAIAudio?: (audioTrack: MediaStreamTrack) => void;
    onConnectionChange?: (state: ConnectionState) => void;
    onError?: (error: Error) => void;
}

interface UseLiveKitInterviewReturn {
    // State
    isConnected: boolean;
    isConnecting: boolean;
    connectionState: ConnectionState | null;
    error: string | null;

    // Audio state
    isMicEnabled: boolean;
    isSpeaking: boolean;
    aiIsSpeaking: boolean;

    // Actions
    connect: () => Promise<void>;
    disconnect: () => void;
    toggleMic: () => Promise<void>;
    sendMessage: (message: string) => void;
}

export function useLiveKitInterview(options: UseLiveKitInterviewOptions): UseLiveKitInterviewReturn {
    const {
        roomName,
        participantName,
        onTranscript,
        onAIResponse,
        onAIAudio,
        onConnectionChange,
        onError,
    } = options;

    // Room reference
    const roomRef = useRef<Room | null>(null);

    // State
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isMicEnabled, setIsMicEnabled] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [aiIsSpeaking, setAiIsSpeaking] = useState(false);

    /**
     * Handle remote track subscription (AI audio)
     */
    const handleTrackSubscribed = useCallback((
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
    ) => {
        if (track.kind === Track.Kind.Audio && participant.identity === 'ai-interviewer') {
            console.log('AI audio track subscribed');
            setAiIsSpeaking(true);

            if (onAIAudio && track.mediaStreamTrack) {
                onAIAudio(track.mediaStreamTrack);
            }

            // Auto-attach to audio element
            const audioElement = document.createElement('audio');
            audioElement.autoplay = true;
            track.attach(audioElement);
        }
    }, [onAIAudio]);

    /**
     * Handle remote track unsubscribe
     */
    const handleTrackUnsubscribed = useCallback((
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
    ) => {
        if (track.kind === Track.Kind.Audio && participant.identity === 'ai-interviewer') {
            console.log('AI audio track unsubscribed');
            setAiIsSpeaking(false);
            track.detach();
        }
    }, []);

    /**
     * Handle data messages (transcriptions, AI responses)
     */
    const handleDataReceived = useCallback((
        payload: Uint8Array,
        participant?: RemoteParticipant,
        kind?: DataPacket_Kind
    ) => {
        try {
            const message = JSON.parse(new TextDecoder().decode(payload));

            if (message.type === 'transcript') {
                onTranscript?.(message.text, message.is_final);
            } else if (message.type === 'ai_response') {
                onAIResponse?.(message.text);
            }
        } catch (err) {
            console.error('Failed to parse data message:', err);
        }
    }, [onTranscript, onAIResponse]);

    /**
     * Connect to LiveKit room
     */
    const connect = useCallback(async () => {
        if (roomRef.current?.state === ConnectionState.Connected) {
            console.log('Already connected to room');
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            // Get token from backend
            const tokenData: LiveKitToken = await liveKitService.getRoomToken(roomName, participantName);

            // Create room instance
            const room = new Room({
                adaptiveStream: true,
                dynacast: true,
                audioCaptureDefaults: {
                    autoGainControl: true,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });

            // Set up event handlers
            room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
            room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
            room.on(RoomEvent.DataReceived, handleDataReceived);

            room.on(RoomEvent.ConnectionStateChanged, (state) => {
                console.log('Connection state:', state);
                setConnectionState(state);
                onConnectionChange?.(state);

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

            room.on(RoomEvent.LocalTrackPublished, () => {
                setIsMicEnabled(true);
            });

            room.on(RoomEvent.LocalTrackUnpublished, () => {
                setIsMicEnabled(false);
            });

            // Store room reference
            roomRef.current = room;

            // Connect to room
            await room.connect(tokenData.url, tokenData.token);
            console.log('Connected to LiveKit room:', roomName);

            // Enable microphone
            await room.localParticipant.setMicrophoneEnabled(true);
            setIsMicEnabled(true);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
            console.error('LiveKit connection error:', err);
            setError(errorMessage);
            onError?.(err instanceof Error ? err : new Error(errorMessage));
            setIsConnecting(false);
        }
    }, [roomName, participantName, handleTrackSubscribed, handleTrackUnsubscribed, handleDataReceived, onConnectionChange, onError]);

    /**
     * Disconnect from room
     */
    const disconnect = useCallback(() => {
        if (roomRef.current) {
            roomRef.current.disconnect();
            roomRef.current = null;
        }
        setIsConnected(false);
        setIsMicEnabled(false);
        setAiIsSpeaking(false);
    }, []);

    /**
     * Toggle microphone
     */
    const toggleMic = useCallback(async () => {
        if (!roomRef.current?.localParticipant) return;

        const newState = !isMicEnabled;
        await roomRef.current.localParticipant.setMicrophoneEnabled(newState);
        setIsMicEnabled(newState);
    }, [isMicEnabled]);

    /**
     * Send a text message to the AI
     */
    const sendMessage = useCallback((message: string) => {
        if (!roomRef.current?.localParticipant) return;

        const data = new TextEncoder().encode(JSON.stringify({
            type: 'user_message',
            text: message,
        }));

        roomRef.current.localParticipant.publishData(data, { reliable: true });
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        isConnected,
        isConnecting,
        connectionState,
        error,
        isMicEnabled,
        isSpeaking,
        aiIsSpeaking,
        connect,
        disconnect,
        toggleMic,
        sendMessage,
    };
}

export default useLiveKitInterview;
