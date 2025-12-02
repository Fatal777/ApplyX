/**
 * Applications Service
 * ====================
 * Handles job application tracking, credits, and match scoring.
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const BASE_URL = `${API_URL}/api/v1/applications`;

// Types
export type ApplicationStatus = 
  | 'saved' 
  | 'applied' 
  | 'screening' 
  | 'interview'
  | 'interviewing'
  | 'offer' 
  | 'rejected' 
  | 'withdrawn';

export interface JobApplication {
  id: number;
  job_external_id: string;
  job_title: string;
  company: string;
  company_logo?: string;
  location?: string;
  job_url: string;
  job_portal: string;
  job_type?: string;
  job_description?: string;
  salary_min?: number;
  salary_max?: number;
  is_remote: boolean;
  match_score?: number;
  match_breakdown?: MatchBreakdown;
  matched_skills: string[];
  missing_skills: string[];
  status: ApplicationStatus;
  applied_at?: string;
  saved_at?: string;
  notes?: string;
  is_favorite: boolean;
  created_at: string;
  has_customized_resume: boolean;
}

export interface MatchBreakdown {
  skills: number;
  experience: number;
  education: number;
  keywords: number;
}

export interface MatchScoreResult {
  overall_score: number;
  breakdown: MatchBreakdown;
  matched_skills: string[];
  missing_skills: string[];
  partial_skills: string[];
  matched_keywords: string[];
  missing_keywords: string[];
  experience_match: {
    required_years?: number;
    candidate_years?: number;
    status: string;
  };
  education_match: {
    required_level?: string;
    candidate_level?: string;
    status: string;
  };
  suggestions: string[];
  priority_improvements: string[];
  improvement_suggestions: string[];
  // Aliases for component compatibility
  keyword_match: number;
  skills_match: number;
}

export interface UserCredits {
  daily_remaining: number;
  daily_max: number;
  bonus_credits: number;
  total_available: number;
  tier: 'free' | 'premium' | 'unlimited';
  tier_description: string;
  can_customize: boolean;
  total_used: number;
  resets_at: string;
  // Aliases for component compatibility
  remaining: number;
  daily_limit: number;
}

export interface ApplicationStats {
  total: number;
  favorites: number;
  by_status: Record<ApplicationStatus, number>;
  recent: JobApplication[];
}

// Get auth token
const getAuthHeaders = () => {
  const token = localStorage.getItem('supabase_token') || localStorage.getItem('access_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// Applications API
export const applicationsService = {
  /**
   * Save a job to user's application tracker
   */
  async saveJob(job: {
    job_external_id: string;
    job_title: string;
    company: string;
    company_logo?: string;
    location?: string;
    job_url: string;
    job_portal: string;
    job_type?: string;
    salary_min?: number;
    salary_max?: number;
    is_remote?: boolean;
    job_description?: string;
    match_score?: number;
    matched_skills?: string[];
    missing_skills?: string[];
  }): Promise<{ success: boolean; application: JobApplication; is_new: boolean }> {
    const response = await axios.post(
      `${BASE_URL}/save`,
      job,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Mark application as applied (user clicked Apply button)
   */
  async markAsApplied(applicationId: number): Promise<{ 
    success: boolean; 
    application: JobApplication;
    redirect_url: string;
  }> {
    const response = await axios.post(
      `${BASE_URL}/${applicationId}/apply`,
      {},
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Update application status, notes, or favorite
   */
  async updateApplication(
    applicationId: number,
    updates: {
      status?: ApplicationStatus;
      notes?: string;
      is_favorite?: boolean;
      resume_id?: number;
    }
  ): Promise<{ success: boolean; application: JobApplication }> {
    const response = await axios.patch(
      `${BASE_URL}/${applicationId}`,
      updates,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Delete an application
   */
  async deleteApplication(applicationId: number): Promise<{ success: boolean }> {
    const response = await axios.delete(
      `${BASE_URL}/${applicationId}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * List user's applications with filtering
   */
  async listApplications(params: {
    status?: ApplicationStatus;
    is_favorite?: boolean;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  } = {}): Promise<JobApplication[]> {
    try {
      const response = await axios.get(`${BASE_URL}/list`, {
        params,
        headers: getAuthHeaders(),
      });
      // Handle both paginated and simple array responses
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return response.data.applications || [];
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      return [];
    }
  },

  /**
   * Get application statistics
   */
  async getStats(): Promise<ApplicationStats> {
    const response = await axios.get(`${BASE_URL}/stats`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Get single application details
   */
  async getApplication(applicationId: number): Promise<{
    application: JobApplication;
    customized_resume?: any;
  }> {
    const response = await axios.get(
      `${BASE_URL}/${applicationId}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Bulk save multiple jobs
   */
  async bulkSave(jobs: Array<{
    job_external_id: string;
    job_title: string;
    company: string;
    job_url: string;
    job_portal: string;
    [key: string]: any;
  }>): Promise<{
    success: boolean;
    saved_count: number;
    skipped_count: number;
  }> {
    const response = await axios.post(
      `${BASE_URL}/bulk-save`,
      jobs,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Bulk update status
   */
  async bulkUpdateStatus(
    applicationIds: number[],
    newStatus: ApplicationStatus
  ): Promise<{ success: boolean; updated_count: number }> {
    const response = await axios.post(
      `${BASE_URL}/bulk-status`,
      { application_ids: applicationIds, new_status: newStatus },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },
};

// Credits API
export const creditsService = {
  /**
   * Get current credit balance
   */
  async getCredits(): Promise<UserCredits> {
    const response = await axios.get(
      `${BASE_URL}/credits/status`,
      { headers: getAuthHeaders() }
    );
    const data = response.data;
    // Add aliases for component compatibility
    return {
      ...data,
      remaining: data.daily_remaining ?? data.remaining ?? 0,
      daily_limit: data.daily_max ?? data.daily_limit ?? 3,
    };
  },

  /**
   * Use a credit for an action
   */
  async useCredit(action: string, params: {
    application_id?: number;
    description?: string;
  } = {}): Promise<{
    daily_remaining: number;
    bonus_credits: number;
    total_available: number;
  }> {
    const response = await axios.post(
      `${BASE_URL}/credits/use`,
      { action, ...params },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Get credit usage history
   */
  async getHistory(limit: number = 50): Promise<{
    history: Array<{
      id: number;
      action: string;
      credits_used: number;
      application_id?: number;
      description?: string;
      created_at: string;
    }>;
    total: number;
  }> {
    const response = await axios.get(
      `${BASE_URL}/credits/history`,
      { params: { limit }, headers: getAuthHeaders() }
    );
    return response.data;
  },
};

// Match Scoring API
export const matchScoringService = {
  /**
   * Calculate match score for a job
   */
  async calculateMatchScore(params: {
    job_description: string;
    resume_id?: number;
  }): Promise<MatchScoreResult & { resume_id: number; resume_name: string }> {
    const response = await axios.post(
      `${BASE_URL}/match-score`,
      params,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Quick match (no auth required for demo)
   */
  async quickMatch(params: {
    job_description: string;
    resume_text?: string;
  }): Promise<MatchScoreResult> {
    const response = await axios.post(
      `${BASE_URL}/quick-match`,
      params,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Score a saved application
   */
  async scoreApplication(applicationId: number): Promise<MatchScoreResult & {
    application_id: number;
  }> {
    const response = await axios.post(
      `${BASE_URL}/${applicationId}/score`,
      {},
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Batch score multiple applications
   */
  async batchScore(params: {
    application_ids?: number[];
    score_all_unscored?: boolean;
  }): Promise<{
    success: boolean;
    scored_count: number;
    failed_count: number;
    scored: Array<{ id: number; job_title: string; score: number }>;
    failed: Array<{ id: number; error: string }>;
  }> {
    const response = await axios.post(
      `${BASE_URL}/batch-score`,
      params,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },
};

// Export all services
export default {
  applications: applicationsService,
  credits: creditsService,
  matching: matchScoringService,
};
