import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

export function useResumes() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResumes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data: any = await apiClient.listResumes();
      setResumes(data.resumes || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadResume = async (file: File, jobDescription?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.uploadResume(file, jobDescription);
      await fetchResumes();
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getResumeById = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getResume(id);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteResume = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.deleteResume(id);
      await fetchResumes();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiClient.isAuthenticated()) {
      fetchResumes();
    }
  }, []);

  return {
    resumes,
    loading,
    error,
    uploadResume,
    getResumeById,
    deleteResume,
    refresh: fetchResumes,
  };
}
