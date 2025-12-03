import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class APIClient {
  private baseURL: string;
  private refreshPromise: Promise<any> | null = null;
  private isRefreshing = false;
  private failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void }> = [];

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    axios.interceptors.request.use(
      async (config) => {
        // Skip for auth routes
        if (config.url?.includes('/auth/')) {
          return config;
        }
        
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          console.log('Attaching token to request:', config.url);
          // Create a new headers object to avoid mutating the original
          const headers = {
            ...config.headers,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': config.headers?.['Content-Type'] || 'application/json'
          };
          
          // Update the config with new headers
          config.headers = headers as any;
        } else {
          console.warn('No access token found in session for request:', config.url);
        }
        
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh
    axios.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;
        
        // If error is not 401 or we've already tried to refresh, reject
        if (error.response?.status !== 401 || originalRequest._retry) {
          return Promise.reject(error);
        }

        // If we're already refreshing, add the request to the queue
        if (this.isRefreshing) {
          return new Promise((resolve, reject) => {
            this.failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers['Authorization'] = 'Bearer ' + token;
              return axios(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        this.isRefreshing = true;

        try {
          // Try to refresh the session
          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !session) {
            throw refreshError || new Error('No session after refresh');
          }

          // Update the original request with the new token
          originalRequest.headers['Authorization'] = 'Bearer ' + session.access_token;
          
          // Process the queue
          this.processQueue(null, session.access_token);
          
          // Retry the original request
          return axios(originalRequest);
        } catch (error) {
          console.error('Error refreshing session:', error);
          this.processQueue(error, null);
          
          // If refresh fails, sign out the user
          await supabase.auth.signOut();
          window.location.href = '/login';
          return Promise.reject(error);
        } finally {
          this.isRefreshing = false;
        }
      }
    );
  }

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach((promise) => {
      if (error) {
        promise.reject(error);
      } else {
        promise.resolve(token);
      }
    });
    this.failedQueue = [];
  }

  private async request<T>(endpoint: string, options: AxiosRequestConfig = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      // Create a new headers object to avoid mutating the original
      const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> || {}),
      };

      // Set Content-Type if not already set
      if (!headers['Content-Type']) {
        headers['Content-Type'] = options.data instanceof FormData 
          ? 'multipart/form-data' 
          : 'application/json';
      }

      const config: AxiosRequestConfig = {
        ...options,
        url,
        headers
      };
      
      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      console.error('API request failed:', {
        url,
        method: options.method || 'GET',
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw error;
    }
  }

  // Auth methods
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;
    return data;
  }

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  // Resume methods
  async uploadResume(file: File, jobDescription?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (jobDescription) {
      formData.append('job_description', jobDescription);
    }
    
    return this.request('/api/v1/resumes/upload', {
      method: 'POST',
      data: formData,
    });
  }

  async listResumes(skip: number = 0, limit: number = 10) {
    return this.request(`/api/v1/resumes/?skip=${skip}&limit=${limit}`);
  }

  async getResume(id: number) {
    return this.request(`/api/v1/resumes/${id}/`);
  }

  async getResumeStatus(id: number) {
    return this.request(`/api/v1/resumes/${id}/status`);
  }

  async deleteResume(id: number) {
    return this.request(`/api/v1/resumes/${id}`, {
      method: 'DELETE',
    });
  }

  async generateAISuggestions(id: number) {
    return this.request(`/api/v1/resumes/${id}/generate-suggestions`, {
      method: 'POST',
    });
  }

  // Profile methods
  async getProfile() {
    return this.request('/api/v1/user/profile');
  }

  async updateProfile(data: { full_name?: string; phone_number?: string }) {
    return this.request('/api/v1/user/profile', {
      method: 'PUT',
      data,
    });
  }

  async getProfileStatus() {
    return this.request('/api/v1/user/profile/status');
  }

  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session?.access_token;
  }
}

export const apiClient = new APIClient(API_BASE_URL);
