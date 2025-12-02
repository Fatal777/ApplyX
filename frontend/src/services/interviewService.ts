/**
 * Interview Service API Client
 * Handles all interview-related API calls including sessions, transcription, and feedback
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1';

// ============== Types ==============

export type InterviewType = 'behavioral' | 'technical_theory' | 'mixed' | 'custom';
export type InterviewStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type InterviewPersona = 'friendly' | 'professional' | 'challenging';

export interface InterviewQuestion {
  question: string;
  category: string;
  expected_skills: string[];
  follow_up_hints: string[];
  evaluation_criteria: string[];
}

export interface StartInterviewRequest {
  interview_type: InterviewType;
  difficulty: DifficultyLevel;
  resume_id?: number;
  job_role?: string;
  job_description?: string;
  num_questions: number;
  persona: InterviewPersona;
}

export interface StartInterviewResponse {
  session_id: number;
  status: InterviewStatus;
  questions: InterviewQuestion[];
  first_question: string;
  greeting_audio?: string; // Base64 encoded audio
}

export interface TranscribeRequest {
  session_id: number;
  audio_data: string; // Base64 encoded audio
  audio_format: string;
  question_number: number;
}

export interface TranscribeResponse {
  success: boolean;
  transcript: string;
  duration: number;
  error?: string;
}

export interface RespondRequest {
  session_id: number;
  question_number: number;
  transcript: string;
}

export interface RespondResponse {
  response_text: string;
  audio_data?: string; // Base64 encoded audio
  next_question?: string;
  is_follow_up: boolean;
  is_conclusion: boolean;
  question_number: number;
}

export interface InterviewFeedback {
  id: number;
  session_id: number;
  overall_score: number;
  category_scores: Record<string, number>;
  strengths: string[];
  improvements: string[];
  detailed_feedback: Record<string, string>;
  recommendations: string[];
  generated_at: string;
}

export interface InterviewSession {
  id: number;
  user_id: number;
  resume_id?: number;
  interview_type: InterviewType;
  status: InterviewStatus;
  config: Record<string, unknown>;
  created_at: string;
  completed_at?: string;
}

export interface InterviewStatusResponse {
  session_id: number;
  status: InterviewStatus;
  current_question: number;
  total_questions: number;
  responses_count: number;
  feedback_ready: boolean;
}

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
}

export interface ServiceHealth {
  status: string;
  speech_service: {
    stt_available: boolean;
    stt_provider?: string;
    tts_available: boolean;
    tts_provider?: string;
  };
  ai_service: {
    available: boolean;
    provider?: string;
    model?: string;
  };
}

// ============== Service Class ==============

class InterviewService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('supabase.auth.token');
    if (!token) {
      throw new Error('Not authenticated');
    }
    
    try {
      const parsed = JSON.parse(token);
      return {
        'Authorization': `Bearer ${parsed.access_token}`,
        'Content-Type': 'application/json',
      };
    } catch {
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    }
  }

  /**
   * Check health of interview services
   */
  async checkHealth(): Promise<ServiceHealth> {
    const response = await fetch(`${this.baseUrl}/interview/health`);
    
    if (!response.ok) {
      throw new Error('Failed to check interview service health');
    }
    
    return response.json();
  }

  /**
   * Start a new interview session
   */
  async startInterview(params: StartInterviewRequest): Promise<StartInterviewResponse> {
    const response = await fetch(`${this.baseUrl}/interview/start`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to start interview');
    }
    
    return response.json();
  }

  /**
   * Transcribe audio using Whisper
   */
  async transcribeAudio(params: TranscribeRequest): Promise<TranscribeResponse> {
    const response = await fetch(`${this.baseUrl}/interview/transcribe`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to transcribe audio');
    }
    
    return response.json();
  }

  /**
   * Get AI interviewer response
   */
  async getInterviewerResponse(params: RespondRequest): Promise<RespondResponse> {
    const response = await fetch(`${this.baseUrl}/interview/respond`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get interviewer response');
    }
    
    return response.json();
  }

  /**
   * Complete interview and generate feedback
   */
  async analyzeInterview(sessionId: number): Promise<{
    success: boolean;
    session_id: number;
    feedback_id: number;
    overall_score: number;
    message: string;
  }> {
    const response = await fetch(`${this.baseUrl}/interview/analyze`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ session_id: sessionId }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to analyze interview');
    }
    
    return response.json();
  }

  /**
   * Get feedback for a completed interview
   */
  async getFeedback(sessionId: number): Promise<InterviewFeedback> {
    const response = await fetch(`${this.baseUrl}/interview/feedback/${sessionId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get feedback');
    }
    
    return response.json();
  }

  /**
   * List user's interview sessions
   */
  async listSessions(limit = 10, offset = 0): Promise<InterviewSession[]> {
    const response = await fetch(
      `${this.baseUrl}/interview/sessions?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to list sessions');
    }
    
    return response.json();
  }

  /**
   * Get current session status
   */
  async getSessionStatus(sessionId: number): Promise<InterviewStatusResponse> {
    const response = await fetch(`${this.baseUrl}/interview/session/${sessionId}/status`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get session status');
    }
    
    return response.json();
  }

  /**
   * Cancel an in-progress interview
   */
  async cancelInterview(sessionId: number): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/interview/session/${sessionId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to cancel interview');
    }
    
    return response.json();
  }

  /**
   * Get available voice options for TTS
   */
  async getVoiceOptions(): Promise<{ voices: VoiceOption[] }> {
    const response = await fetch(`${this.baseUrl}/interview/voices`);
    
    if (!response.ok) {
      throw new Error('Failed to get voice options');
    }
    
    return response.json();
  }
}

// Export singleton instance
export const interviewService = new InterviewService();
export default interviewService;
