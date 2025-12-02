/**
 * ATS Analysis Hook
 * =================
 * 
 * React hook for ATS (Applicant Tracking System) scoring and analysis.
 * Implements real-time scoring with debouncing for live editor integration.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Types
// ============================================================================

export interface KeywordMatch {
  keyword: string;
  category: string;
  importance: 'required' | 'preferred' | 'nice_to_have';
  context?: string;
}

export interface ATSIssue {
  category: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  suggestion: string;
  impactScore: number;
}

export interface ATSScoreResult {
  overallScore: number;
  categoryScores: {
    keywords: number;
    format: number;
    experience: number;
    education: number;
    completeness: number;
  };
  matchedKeywords: KeywordMatch[];
  missingKeywords: KeywordMatch[];
  issues: ATSIssue[];
  suggestions: string[];
  jobMatchPercentage?: number;
  parsingConfidence: number;
}

export interface QuickScoreResult {
  overallScore: number;
  parsingConfidence: number;
  topIssues: string[];
  quickWins: string[];
}

export interface JobMatchResult {
  matchPercentage: number;
  overallAtsScore: number;
  keywordCoverage: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  topSuggestions: string[];
  matchBreakdown: Record<string, number>;
}

interface UseATSAnalysisOptions {
  /** Debounce delay for auto-analysis in ms */
  debounceMs?: number;
  /** Auto-analyze on text change */
  autoAnalyze?: boolean;
}

interface UseATSAnalysisResult {
  // State
  isAnalyzing: boolean;
  score: ATSScoreResult | null;
  quickScore: QuickScoreResult | null;
  jobMatch: JobMatchResult | null;
  error: string | null;
  
  // Actions
  analyzeResume: (resumeText: string, jobDescription?: string, jobRequirements?: string[]) => Promise<ATSScoreResult | null>;
  quickAnalyze: (resumeText: string) => Promise<QuickScoreResult | null>;
  calculateJobMatch: (resumeText: string, jobTitle: string, jobDescription: string, jobRequirements?: string[]) => Promise<JobMatchResult | null>;
  clearResults: () => void;
}

// ============================================================================
// API Functions
// ============================================================================

const API_BASE = import.meta.env.VITE_API_URL || '';

async function fetchATSScore(
  resumeText: string,
  jobDescription?: string,
  jobRequirements?: string[]
): Promise<ATSScoreResult> {
  const response = await fetch(`${API_BASE}/api/v1/ats/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resume_text: resumeText,
      job_description: jobDescription,
      job_requirements: jobRequirements,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to analyze resume');
  }
  
  const data = await response.json();
  
  // Transform snake_case to camelCase
  return {
    overallScore: data.overall_score,
    categoryScores: data.category_scores,
    matchedKeywords: data.matched_keywords.map((k: any) => ({
      keyword: k.keyword,
      category: k.category,
      importance: k.importance,
      context: k.context,
    })),
    missingKeywords: data.missing_keywords.map((k: any) => ({
      keyword: k.keyword,
      category: k.category,
      importance: k.importance,
    })),
    issues: data.issues.map((i: any) => ({
      category: i.category,
      severity: i.severity,
      message: i.message,
      suggestion: i.suggestion,
      impactScore: i.impact_score,
    })),
    suggestions: data.suggestions,
    jobMatchPercentage: data.job_match_percentage,
    parsingConfidence: data.parsing_confidence,
  };
}

async function fetchQuickScore(resumeText: string): Promise<QuickScoreResult> {
  const response = await fetch(`${API_BASE}/api/v1/ats/quick-score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_text: resumeText }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to get quick score');
  }
  
  const data = await response.json();
  
  return {
    overallScore: data.overall_score,
    parsingConfidence: data.parsing_confidence,
    topIssues: data.top_issues,
    quickWins: data.quick_wins,
  };
}

async function fetchJobMatch(
  resumeText: string,
  jobTitle: string,
  jobDescription: string,
  jobRequirements?: string[]
): Promise<JobMatchResult> {
  const response = await fetch(`${API_BASE}/api/v1/ats/job-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resume_text: resumeText,
      job_title: jobTitle,
      job_description: jobDescription,
      job_requirements: jobRequirements,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to calculate job match');
  }
  
  const data = await response.json();
  
  return {
    matchPercentage: data.match_percentage,
    overallAtsScore: data.overall_ats_score,
    keywordCoverage: data.keyword_coverage,
    matchedKeywords: data.matched_keywords,
    missingKeywords: data.missing_keywords,
    topSuggestions: data.top_suggestions,
    matchBreakdown: data.match_breakdown,
  };
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useATSAnalysis(options: UseATSAnalysisOptions = {}): UseATSAnalysisResult {
  const { debounceMs = 1500, autoAnalyze = false } = options;
  const { toast } = useToast();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [score, setScore] = useState<ATSScoreResult | null>(null);
  const [quickScore, setQuickScore] = useState<QuickScoreResult | null>(null);
  const [jobMatch, setJobMatch] = useState<JobMatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTextRef = useRef<string>('');
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  const analyzeResume = useCallback(async (
    resumeText: string,
    jobDescription?: string,
    jobRequirements?: string[]
  ): Promise<ATSScoreResult | null> => {
    if (!resumeText || resumeText.length < 50) {
      setError('Resume text too short for analysis');
      return null;
    }
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await fetchATSScore(resumeText, jobDescription, jobRequirements);
      setScore(result);
      lastTextRef.current = resumeText;
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setError(message);
      toast({
        title: 'ATS Analysis Failed',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [toast]);
  
  const quickAnalyze = useCallback(async (
    resumeText: string
  ): Promise<QuickScoreResult | null> => {
    if (!resumeText || resumeText.length < 50) {
      return null;
    }
    
    // Skip if text hasn't changed significantly
    if (Math.abs(resumeText.length - lastTextRef.current.length) < 10) {
      return quickScore;
    }
    
    setIsAnalyzing(true);
    
    try {
      const result = await fetchQuickScore(resumeText);
      setQuickScore(result);
      lastTextRef.current = resumeText;
      return result;
    } catch (err) {
      console.error('Quick analysis failed:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [quickScore]);
  
  const calculateJobMatch = useCallback(async (
    resumeText: string,
    jobTitle: string,
    jobDescription: string,
    jobRequirements?: string[]
  ): Promise<JobMatchResult | null> => {
    if (!resumeText || resumeText.length < 50) {
      setError('Resume text too short');
      return null;
    }
    
    if (!jobDescription || jobDescription.length < 50) {
      setError('Job description too short');
      return null;
    }
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await fetchJobMatch(resumeText, jobTitle, jobDescription, jobRequirements);
      setJobMatch(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Match calculation failed';
      setError(message);
      toast({
        title: 'Job Match Failed',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [toast]);
  
  const clearResults = useCallback(() => {
    setScore(null);
    setQuickScore(null);
    setJobMatch(null);
    setError(null);
    lastTextRef.current = '';
  }, []);
  
  return {
    isAnalyzing,
    score,
    quickScore,
    jobMatch,
    error,
    analyzeResume,
    quickAnalyze,
    calculateJobMatch,
    clearResults,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get color class based on score
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

/**
 * Get background color class based on score
 */
export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-100';
  if (score >= 60) return 'bg-yellow-100';
  if (score >= 40) return 'bg-orange-100';
  return 'bg-red-100';
}

/**
 * Get severity icon/color
 */
export function getSeverityStyles(severity: 'critical' | 'warning' | 'info'): {
  color: string;
  bgColor: string;
  icon: string;
} {
  switch (severity) {
    case 'critical':
      return { color: 'text-red-600', bgColor: 'bg-red-50', icon: '🔴' };
    case 'warning':
      return { color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: '⚠️' };
    case 'info':
      return { color: 'text-blue-600', bgColor: 'bg-blue-50', icon: 'ℹ️' };
  }
}

/**
 * Format category name for display
 */
export function formatCategoryName(category: string): string {
  const names: Record<string, string> = {
    keywords: 'Keywords',
    format: 'Format & Structure',
    experience: 'Experience',
    education: 'Education',
    completeness: 'Completeness',
    programming: 'Programming',
    frameworks: 'Frameworks',
    databases: 'Databases',
    cloud: 'Cloud & DevOps',
    tools: 'Tools',
    methodologies: 'Methodologies',
    soft_skill: 'Soft Skills',
  };
  return names[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Get match quality label
 */
export function getMatchLabel(matchPercentage: number): string {
  if (matchPercentage >= 90) return 'Excellent Match';
  if (matchPercentage >= 75) return 'Strong Match';
  if (matchPercentage >= 60) return 'Good Match';
  if (matchPercentage >= 40) return 'Partial Match';
  return 'Low Match';
}

export default useATSAnalysis;
