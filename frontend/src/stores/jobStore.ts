/**
 * Job Store - Zustand state management for jobs
 * Handles search state, recommendations, filters, and UI state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jobService, Job, JobSearchParams, JobSearchResponse, RecommendationsResponse } from '@/services/jobService';

export type ExperienceLevel = 'all' | 'fresher' | 'mid' | 'senior';
export type Portal = 'all' | 'adzuna' | 'jsearch' | 'remotive' | 'greenhouse' | 'lever' | 'workday' | 'smartrecruiters' | 'ashby';

interface JobFilters {
  experienceLevel: ExperienceLevel;
  portal: Portal;
  location: string;
  remoteOnly: boolean;
  salaryMin: number;
  salaryMax: number;
  useFastSearch: boolean;  // Enable millisecond search
}

interface JobState {
  // Search state
  searchQuery: string;
  searchResults: Job[];
  isSearching: boolean;
  searchError: string | null;
  
  // Recommendations state
  recommendations: Job[];
  recommendationsStatus: 'idle' | 'loading' | 'ready' | 'error';
  recommendationsError: string | null;
  currentResumeId: number | null;
  
  // Filters
  filters: JobFilters;
  
  // UI state
  selectedJob: Job | null;
  viewMode: 'grid' | 'list';
  
  // Recent searches (persisted)
  recentSearches: string[];
  
  // Saved/Bookmarked jobs (persisted)
  savedJobs: Job[];
  comparedJobs: Job[];
  
  // Actions
  setSearchQuery: (query: string) => void;
  searchJobs: (params?: Partial<JobSearchParams>) => Promise<void>;
  clearSearch: () => void;
  
  getRecommendations: (resumeId: number, refresh?: boolean) => Promise<void>;
  pollRecommendationStatus: (resumeId: number) => Promise<void>;
  clearRecommendations: () => void;
  
  setFilters: (filters: Partial<JobFilters>) => void;
  resetFilters: () => void;
  
  selectJob: (job: Job | null) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  
  // Saved jobs actions
  toggleSaveJob: (job: Job) => void;
  isJobSaved: (jobId: string) => boolean;
  removeSavedJob: (jobId: string) => void;
  clearSavedJobs: () => void;
  
  // Job comparison actions
  addToCompare: (job: Job) => void;
  removeFromCompare: (jobId: string) => void;
  clearComparedJobs: () => void;
  isJobCompared: (jobId: string) => boolean;
}

const defaultFilters: JobFilters = {
  experienceLevel: 'all',
  portal: 'all',
  location: 'India',
  remoteOnly: false,
  salaryMin: 0,
  salaryMax: 5000000, // 50 LPA
  useFastSearch: true,  // Enable fast search by default
};

export const useJobStore = create<JobState>()(
  persist(
    (set, get) => ({
      // Initial state
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      searchError: null,
      
      recommendations: [],
      recommendationsStatus: 'idle',
      recommendationsError: null,
      currentResumeId: null,
      
      filters: defaultFilters,
      
      selectedJob: null,
      viewMode: 'grid',
      
      recentSearches: [],
      savedJobs: [],
      comparedJobs: [],
      
      // Search actions
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      searchJobs: async (params) => {
        const { searchQuery, filters, addRecentSearch } = get();
        
        if (!searchQuery.trim() && !params?.keywords) {
          set({ searchError: 'Please enter search keywords' });
          return;
        }
        
        set({ isSearching: true, searchError: null });
        
        try {
          const searchParams: JobSearchParams = {
            keywords: params?.keywords || searchQuery,
            location: params?.location || filters.location,
            limit: params?.limit || 20,
            useFastSearch: filters.useFastSearch,  // Use fast search when enabled
          };
          
          // Apply filters
          if (filters.portal !== 'all') {
            searchParams.portal = filters.portal as any;
          }
          if (filters.experienceLevel !== 'all') {
            searchParams.experience_level = filters.experienceLevel as 'fresher' | 'mid' | 'senior';
          }
          
          // Use instant search for better UX (debounced)
          const response = filters.useFastSearch 
            ? await jobService.instantSearch(searchParams)
            : await jobService.searchJobs(searchParams);
          
          let jobs = response.jobs;
          
          // Client-side filter for remote if needed
          if (filters.remoteOnly) {
            jobs = jobs.filter(job => 
              job.is_remote || 
              job.location?.toLowerCase().includes('remote')
            );
          }
          
          set({ 
            searchResults: jobs, 
            isSearching: false,
          });
          
          // Save to recent searches
          addRecentSearch(searchQuery || params?.keywords || '');
          
        } catch (error) {
          // Ignore cancelled search errors
          if ((error as Error).message === 'Search cancelled') {
            return;
          }
          set({ 
            searchError: error instanceof Error ? error.message : 'Search failed',
            isSearching: false,
          });
        }
      },
      
      clearSearch: () => set({ 
        searchQuery: '', 
        searchResults: [], 
        searchError: null 
      }),
      
      // Recommendations actions
      getRecommendations: async (resumeId, refresh = false) => {
        set({ 
          recommendationsStatus: 'loading', 
          recommendationsError: null,
          currentResumeId: resumeId,
        });
        
        try {
          const response = await jobService.getRecommendations(resumeId, refresh);
          
          if (response.status === 'processing') {
            // Start polling
            set({ recommendationsStatus: 'loading' });
            get().pollRecommendationStatus(resumeId);
          } else {
            set({ 
              recommendations: response.jobs,
              recommendationsStatus: 'ready',
            });
          }
        } catch (error) {
          set({ 
            recommendationsError: error instanceof Error ? error.message : 'Failed to get recommendations',
            recommendationsStatus: 'error',
          });
        }
      },
      
      pollRecommendationStatus: async (resumeId) => {
        const maxAttempts = 30;
        let attempts = 0;
        
        const poll = async () => {
          if (attempts >= maxAttempts) {
            set({ 
              recommendationsError: 'Recommendations are taking too long. Please try again.',
              recommendationsStatus: 'error',
            });
            return;
          }
          
          try {
            const response = await jobService.getRecommendationStatus(resumeId);
            
            if (response.status === 'ready') {
              set({ 
                recommendations: response.jobs,
                recommendationsStatus: 'ready',
              });
            } else {
              attempts++;
              setTimeout(poll, 2000); // Poll every 2 seconds
            }
          } catch (error) {
            set({ 
              recommendationsError: 'Failed to check status',
              recommendationsStatus: 'error',
            });
          }
        };
        
        poll();
      },
      
      clearRecommendations: () => set({ 
        recommendations: [], 
        recommendationsStatus: 'idle',
        recommendationsError: null,
        currentResumeId: null,
      }),
      
      // Filter actions
      setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters }
      })),
      
      resetFilters: () => set({ filters: defaultFilters }),
      
      // UI actions
      selectJob: (job) => set({ selectedJob: job }),
      
      setViewMode: (mode) => set({ viewMode: mode }),
      
      // Recent searches
      addRecentSearch: (query) => {
        if (!query.trim()) return;
        
        set((state) => {
          const searches = [
            query,
            ...state.recentSearches.filter(s => s !== query)
          ].slice(0, 5);
          return { recentSearches: searches };
        });
      },
      
      clearRecentSearches: () => set({ recentSearches: [] }),
      
      // Saved jobs actions
      toggleSaveJob: (job) => {
        set((state) => {
          const jobKey = job.job_id || `${job.title}-${job.company}`;
          const isSaved = state.savedJobs.some(j => (j.job_id || `${j.title}-${j.company}`) === jobKey);
          if (isSaved) {
            return { savedJobs: state.savedJobs.filter(j => (j.job_id || `${j.title}-${j.company}`) !== jobKey) };
          } else {
            return { savedJobs: [...state.savedJobs, job] };
          }
        });
      },
      
      isJobSaved: (jobId) => {
        return get().savedJobs.some(j => (j.job_id || `${j.title}-${j.company}`) === jobId);
      },
      
      removeSavedJob: (jobId) => {
        set((state) => ({
          savedJobs: state.savedJobs.filter(j => (j.job_id || `${j.title}-${j.company}`) !== jobId)
        }));
      },
      
      clearSavedJobs: () => set({ savedJobs: [] }),
      
      // Job comparison actions
      addToCompare: (job) => {
        set((state) => {
          // Limit to 3 jobs for comparison
          if (state.comparedJobs.length >= 3) {
            return state;
          }
          const jobKey = job.job_id || `${job.title}-${job.company}`;
          if (state.comparedJobs.some(j => (j.job_id || `${j.title}-${j.company}`) === jobKey)) {
            return state;
          }
          return { comparedJobs: [...state.comparedJobs, job] };
        });
      },
      
      removeFromCompare: (jobId) => {
        set((state) => ({
          comparedJobs: state.comparedJobs.filter(j => (j.job_id || `${j.title}-${j.company}`) !== jobId)
        }));
      },
      
      clearComparedJobs: () => set({ comparedJobs: [] }),
      
      isJobCompared: (jobId) => {
        return get().comparedJobs.some(j => (j.job_id || `${j.title}-${j.company}`) === jobId);
      },
    }),
    {
      name: 'applyx-job-store',
      partialize: (state) => ({
        recentSearches: state.recentSearches,
        viewMode: state.viewMode,
        filters: state.filters,
        savedJobs: state.savedJobs,
        comparedJobs: state.comparedJobs,
      }),
    }
  )
);

export default useJobStore;
