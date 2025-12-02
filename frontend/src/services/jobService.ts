/**
 * Job Service API Client
 * 
 * High-performance job API client with:
 * - Request debouncing for instant search
 * - In-memory caching (LRU)
 * - Request deduplication
 * - AbortController for cancellation
 * - Retry logic with exponential backoff
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1';

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
  portal?: 'adzuna' | 'jsearch' | 'remotive' | 'greenhouse' | 'lever' | 'workday' | 'smartrecruiters' | 'ashby';
  experience_level?: 'fresher' | 'mid' | 'senior';
  limit?: number;
  useFastSearch?: boolean;  // Use high-performance search endpoint
}

export interface JobSearchResponse {
  status: string;
  count: number;
  keywords: string[];
  location: string;
  jobs: Job[];
  _meta?: {
    source: string;
    latency_ms: number;
    cached: boolean;
  };
}

export interface RecommendationsResponse {
  status: 'cached' | 'processing' | 'ready';
  count: number;
  jobs: Job[];
  task_id?: string;
  message?: string;
}

// LRU Cache for search results
class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, { value: V; timestamp: number }>;
  private ttl: number; // Time to live in milliseconds

  constructor(capacity: number = 100, ttlMs: number = 60000) {
    this.capacity = capacity;
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    // Delete if exists (to move to end)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Evict oldest if at capacity
    if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Request deduplication
class RequestDeduplicator {
  private pending: Map<string, Promise<any>> = new Map();

  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // If there's already a pending request with same key, return it
    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    // Execute and store promise
    const promise = fn().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingPromise: { resolve: (value: any) => void; reject: (error: any) => void } | null = null;

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      pendingPromise = { resolve, reject };

      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args);
          pendingPromise?.resolve(result);
        } catch (error) {
          pendingPromise?.reject(error);
        }
      }, delay);
    });
  };
}

class JobService {
  private baseUrl: string;
  private cache: LRUCache<string, JobSearchResponse>;
  private deduplicator: RequestDeduplicator;
  private abortController: AbortController | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.cache = new LRUCache(100, 5 * 60 * 1000); // 100 entries, 5 min TTL
    this.deduplicator = new RequestDeduplicator();
  }

  /**
   * Generate cache key from search params
   */
  private getCacheKey(params: JobSearchParams): string {
    return JSON.stringify({
      keywords: params.keywords.toLowerCase().trim(),
      location: (params.location || 'India').toLowerCase(),
      portal: params.portal || 'all',
      experience_level: params.experience_level || 'all',
      limit: params.limit || 20,
      useFastSearch: params.useFastSearch || false,
    });
  }

  /**
   * Search for jobs with caching and deduplication
   */
  async searchJobs(params: JobSearchParams): Promise<JobSearchResponse> {
    const cacheKey = this.getCacheKey(params);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { ...cached, _meta: { ...cached._meta, source: 'client_cache', cached: true } as any };
    }

    // Use deduplication to prevent duplicate concurrent requests
    return this.deduplicator.dedupe(cacheKey, async () => {
      // Cancel any previous request
      if (this.abortController) {
        this.abortController.abort();
      }
      this.abortController = new AbortController();

      const queryParams = new URLSearchParams();
      queryParams.append('keywords', params.keywords);
      
      if (params.location) queryParams.append('location', params.location);
      if (params.portal) queryParams.append('portal', params.portal);
      if (params.experience_level) queryParams.append('experience_level', params.experience_level);
      if (params.limit) queryParams.append('limit', params.limit.toString());

      // Use fast-search endpoint if enabled
      const endpoint = params.useFastSearch ? 'jobs/fast-search' : 'jobs/search';

      try {
        const response = await fetch(`${this.baseUrl}/${endpoint}?${queryParams}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          signal: this.abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Job search failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        // Cache the result
        this.cache.set(cacheKey, result);
        
        return result;
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          throw new Error('Search cancelled');
        }
        throw error;
      }
    });
  }

  /**
   * Instant search with debouncing (300ms)
   * Use this for search-as-you-type
   */
  instantSearch = debounce(async (params: JobSearchParams): Promise<JobSearchResponse> => {
    return this.searchJobs({ ...params, useFastSearch: true });
  }, 300);

  /**
   * Search from enhanced sources (Greenhouse, Lever, etc.)
   */
  async searchEnhancedSources(
    keywords: string,
    location = 'India',
    sources?: string[],
    limit = 50
  ): Promise<JobSearchResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('keywords', keywords);
    queryParams.append('location', location);
    queryParams.append('limit', limit.toString());
    
    if (sources && sources.length > 0) {
      queryParams.append('sources', sources.join(','));
    }

    const response = await fetch(`${this.baseUrl}/jobs/enhanced-search?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Enhanced search failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get available job sources
   */
  async getJobSources(): Promise<{
    classic_sources: Array<{ name: string; type: string; status: string }>;
    enhanced_sources: Array<{ name: string; type: string; companies: number; status: string }>;
  }> {
    const response = await fetch(`${this.baseUrl}/jobs/sources`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get sources: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Cancel any pending search request
   */
  cancelSearch(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Clear the search cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size(),
      maxSize: 100,
    };
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
      // Enhanced sources
      greenhouse: { name: 'Greenhouse', color: 'bg-emerald-500', icon: '🌱' },
      lever: { name: 'Lever', color: 'bg-orange-500', icon: '⚡' },
      workday: { name: 'Workday', color: 'bg-cyan-500', icon: '💎' },
      smartrecruiters: { name: 'SmartRecruiters', color: 'bg-indigo-500', icon: '🎯' },
      ashby: { name: 'Ashby', color: 'bg-pink-500', icon: '🚀' },
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
