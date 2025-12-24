/**
 * LiveKit Service
 * Handles LiveKit room token fetching and configuration for real-time interview
 */

import { supabase } from '@/lib/supabase';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1';

export interface LiveKitToken {
    token: string;
    url: string;
    room_name: string;
}

export interface LiveKitStatus {
    configured: boolean;
    url?: string;
}

class LiveKitService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    /**
     * Get auth headers for API requests
     */
    private async getAuthHeaders(): Promise<HeadersInit> {
        const { data: { session } } = await supabase.auth.getSession();
        return {
            'Content-Type': 'application/json',
            ...(session?.access_token && {
                'Authorization': `Bearer ${session.access_token}`
            })
        };
    }

    /**
     * Check if LiveKit is configured on the server
     */
    async checkStatus(): Promise<LiveKitStatus> {
        try {
            const response = await fetch(`${this.baseUrl}/livekit/status`);
            if (!response.ok) {
                return { configured: false };
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to check LiveKit status:', error);
            return { configured: false };
        }
    }

    /**
     * Get a room token for joining an interview session
     * @param roomName - Interview session ID or room identifier
     * @param participantName - Display name for the participant
     */
    async getRoomToken(roomName: string, participantName?: string): Promise<LiveKitToken> {
        const headers = await this.getAuthHeaders();

        const response = await fetch(`${this.baseUrl}/livekit/token`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                room_name: roomName,
                participant_name: participantName
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Failed to get token' }));
            throw new Error(error.detail || 'Failed to get LiveKit token');
        }

        return await response.json();
    }
}

export const liveKitService = new LiveKitService();
export default liveKitService;
