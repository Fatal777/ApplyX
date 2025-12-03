import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class APIClient {
  private baseURL: string;
  private refreshPromise: Promise<any> | null = null;

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
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          config.headers.Authorization = `Bearer ${session.access_token}`;
        }
        return config;
      },
      (error) => {
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

        // Prevent multiple refresh attempts
        if (!this.refreshPromise) {
          this.refreshPromise = supabase.auth.refreshSession()
            .finally(() => {
              this.refreshPromise = null;
            });
        }

        try {
          await this.refreshPromise;
          
          // Get the new session
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            throw new Error('No active session after refresh');
          }
          
          // Update the original request with the new token
          originalRequest._retry = true;
          originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
          
          // Retry the original request
          return axios(originalRequest);
        } catch (refreshError) {
          // If refresh fails, sign out the user
          await supabase.auth.signOut();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    );
  }

  private async request<T>(endpoint: string, options: AxiosRequestConfig = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await axios({
        url,
        ...options,
        headers: {
          ...(options.headers || {}),
          ...(options.data instanceof FormData ? {} : { 'Content-Type': 'application/json' })
        }
      });
      
      return response.data;
    } catch (error: any) {
      console.error('API request failed:', error);
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
  async uploadResume(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.request('/api/v1/resumes/upload', {
      method: 'POST',
      data: formData,
    });
  }

  async listResumes(skip: number = 0, limit: number = 10) {
    return this.request(`/api/v1/resumes?skip=${skip}&limit=${limit}`);
  }

  async getResume(id: number) {
    return this.request(`/api/v1/resumes/${id}`);
  }

  async getResumeStatus(id: number) {
    return this.request(`/api/v1/resumes/${id}/status`);
  }

  async deleteResume(id: number) {
    return this.request(`/api/v1/resumes/${id}`, {
      method: 'DELETE',
    });
  }

  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session?.access_token;
  }
}

export const apiClient = new APIClient(API_BASE_URL);
