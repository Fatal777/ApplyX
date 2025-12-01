/**
 * Job Service API Client
 * Handles all job-related API calls including search, recommendations, and fetching
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface Job {
  title: string;
  company: string;
  location: string;
  description: string;
  skills: string[];
  redirect_url: string;
  portal: string;
  posted_date?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  experience?: string;
  match_score?: number;
  skill_matches?: string[];
  job_id?: string;
  is_remote?: boolean;
  employer_logo?: string;
  company_logo?: string;
  job_type?: string;
  category?: string;
}

export interface JobSearchParams {
  keywords: string;
  location?: string;
  portal?: 'adzuna' | 'jsearch' | 'remotive';
  experience_level?: 'fresher' | 'mid' | 'senior';
  limit?: number;
}

export interface JobSearchResponse {
  status: string;
  count: number;
  keywords: string[];
  location: string;
  jobs: Job[];
}

export interface RecommendationsResponse {
  status: 'cached' | 'processing' | 'ready';
  count: number;
  jobs: Job[];
  task_id?: string;
  message?: string;
}

class JobService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Search for jobs directly without resume matching
   */
  async searchJobs(params: JobSearchParams): Promise<JobSearchResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('keywords', params.keywords);
    
    if (params.location) queryParams.append('location', params.location);
    if (params.portal) queryParams.append('portal', params.portal);
    if (params.experience_level) queryParams.append('experience_level', params.experience_level);
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(`${this.baseUrl}/jobs/search?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Job search failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get job recommendations for a resume
   */
  async getRecommendations(resumeId: number, refresh = false, topN = 20): Promise<RecommendationsResponse> {
    const queryParams = new URLSearchParams();
    if (refresh) queryParams.append('refresh', 'true');
    queryParams.append('top_n', topN.toString());

    const response = await fetch(
      `${this.baseUrl}/jobs/recommendations/${resumeId}?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get recommendations: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Poll recommendation status
   */
  async getRecommendationStatus(resumeId: number): Promise<RecommendationsResponse> {
    const response = await fetch(
      `${this.baseUrl}/jobs/recommendations/${resumeId}/status`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Force refresh recommendations
   */
  async refreshRecommendations(resumeId: number): Promise<RecommendationsResponse> {
    const response = await fetch(
      `${this.baseUrl}/jobs/recommendations/${resumeId}/refresh`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to refresh: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Trigger background job fetch to populate cache
   */
  async triggerJobFetch(keywords?: string, location = 'India'): Promise<{ status: string; task_id: string; message: string }> {
    const queryParams = new URLSearchParams();
    if (keywords) queryParams.append('keywords', keywords);
    queryParams.append('location', location);

    const response = await fetch(
      `${this.baseUrl}/jobs/fetch?${queryParams}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to trigger fetch: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Format salary range for display
   */
  formatSalary(min?: number | null, max?: number | null): string {
    if (!min && !max) return 'Not specified';
    
    const formatNum = (n: number) => {
      if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
      if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
      return `₹${n}`;
    };

    if (min && max) return `${formatNum(min)} - ${formatNum(max)}`;
    if (min) return `${formatNum(min)}+`;
    if (max) return `Up to ${formatNum(max)}`;
    return 'Not specified';
  }

  /**
   * Get portal display info
   */
  getPortalInfo(portal: string): { name: string; color: string; icon: string } {
    const portals: Record<string, { name: string; color: string; icon: string }> = {
      adzuna: { name: 'Adzuna', color: 'bg-green-500', icon: '🌍' },
      jsearch: { name: 'LinkedIn/Indeed', color: 'bg-blue-500', icon: '💼' },
      remotive: { name: 'Remotive', color: 'bg-purple-500', icon: '🏠' },
    };
    return portals[portal] || { name: portal, color: 'bg-gray-500', icon: '📋' };
  }

  /**
   * Get experience level badge color
   */
  getExperienceColor(experience?: string): string {
    if (!experience) return 'bg-gray-100 text-gray-700';
    const exp = experience.toLowerCase();
    if (exp.includes('0-2') || exp.includes('fresher') || exp.includes('entry')) {
      return 'bg-green-100 text-green-700';
    }
    if (exp.includes('5+') || exp.includes('senior') || exp.includes('lead')) {
      return 'bg-purple-100 text-purple-700';
    }
    return 'bg-blue-100 text-blue-700';
  }
}

export const jobService = new JobService();
export default jobService;
