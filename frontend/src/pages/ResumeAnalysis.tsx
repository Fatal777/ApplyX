import { motion } from "framer-motion";
import {
  Upload, BarChart2, FileText, Target, Zap, Award, TrendingUp,
  ChevronDown, Download, Share2, Check, AlertCircle, ArrowRight,
  Sparkles, Clock, CheckCircle, Edit3, User, Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useResumes } from "@/hooks/useResumes";
import { resumeBuilderApi } from "@/services/resumeBuilderApi";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

import Footer from "@/components/Footer";
import { SuccessStoryCard, successStories } from "@/components/ui/SuccessStoryCard";

interface ResumeData {
  id: number;
  original_filename: string;
  file_size: number;
  status: string;
  analysis_score?: number;
  keywords?: string[];
  sections?: any;
  skills?: string[];
  feedback?: any;
  suggestions?: any[];
  processed_at?: string;
  created_at: string;
  extracted_text?: string;
}

const ResumeAnalysis = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getResumeById, loading } = useResumes();
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [jobMatches, setJobMatches] = useState<Array<{ role: string; match_percent: number; strengths?: string[]; gaps?: string[] }>>([]);
  const [loadingJobMatches, setLoadingJobMatches] = useState(false);
  const [atsData, setAtsData] = useState<{ ats_score?: number; section_scores?: any[]; recommendations?: any[]; keyword_analysis?: any } | null>(null);
  const [loadingAts, setLoadingAts] = useState(false);
  const [hasFetchedAts, setHasFetchedAts] = useState(false);
  const [hasFetchedJobs, setHasFetchedJobs] = useState(false);
  const { toast } = useToast();

  // Handler to convert resume to builder format and open editor
  const handleEditInBuilder = async () => {
    if (!id) return;

    setIsConverting(true);
    try {
      const builderDoc = await resumeBuilderApi.convertFromResume(parseInt(id));
      toast({
        title: "Resume imported!",
        description: "Opening in Resume Editor...",
      });
      // Pass both: resumeId for PDF, builderId for document data
      navigate(`/resume-editor/live/${id}?builderId=${builderDoc.builder_document_id}`);
    } catch (error: any) {
      console.error('Error converting resume:', error);
      toast({
        title: "Conversion failed",
        description: error.response?.data?.detail || "Could not import resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    const fetchResume = async () => {
      try {
        const data: any = await getResumeById(parseInt(id));
        setResume(data as ResumeData);

        // If status is processing or uploaded, start polling
        if (data.status === 'processing' || data.status === 'uploaded') {
          setIsPolling(true);
        } else {
          setIsPolling(false);
        }
      } catch (error) {
        console.error('Error fetching resume:', error);
      }
    };

    fetchResume();

    // Poll every 3 seconds if processing
    let interval: NodeJS.Timeout;
    if (isPolling) {
      interval = setInterval(fetchResume, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [id, isPolling]);

  // Fetch real job matches when resume is loaded
  useEffect(() => {
    if (!id || !resume || resume.status !== 'completed' || hasFetchedJobs) return;

    const fetchJobMatches = async () => {
      setLoadingJobMatches(true);
      setHasFetchedJobs(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/resumes/${id}/job-match`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          setJobMatches(data.job_matches || []);
        }
      } catch (error) {
        console.error('Error fetching job matches:', error);
      } finally {
        setLoadingJobMatches(false);
      }
    };

    fetchJobMatches();
  }, [id, resume?.status, hasFetchedJobs]);

  // Fetch ATS analysis when resume is loaded  
  useEffect(() => {
    if (!id || !resume || resume.status !== 'completed' || hasFetchedAts) return;

    const fetchAtsAnalysis = async () => {
      setLoadingAts(true);
      setHasFetchedAts(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/resumes/${id}/ats-analysis`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          setAtsData(data);
        }
      } catch (error) {
        console.error('Error fetching ATS analysis:', error);
      } finally {
        setLoadingAts(false);
      }
    };

    fetchAtsAnalysis();
  }, [id, resume?.status, hasFetchedAts]);

  if (loading && !resume) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading resume analysis...</p>
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Resume Not Found</h2>
          <Button onClick={() => navigate('/resume-builder')}>Go Back</Button>
        </div>
      </div>
    );
  }

  // Show processing state
  if (resume.status === 'processing' || resume.status === 'uploaded') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="pt-32 pb-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="w-24 h-24 border-8 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
                <h1 className="text-4xl font-bold mb-4">Analyzing Your Resume</h1>
                <p className="text-xl text-gray-600 mb-8">
                  Our AI is carefully reviewing your resume. This usually takes 30-60 seconds.
                </p>
                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="space-y-4">
                    {[
                      { text: 'Extracting text from document', done: true },
                      { text: 'Analyzing content structure', done: resume.status === 'processing' },
                      { text: 'Identifying keywords and skills', done: false },
                      { text: 'Generating personalized feedback', done: false },
                    ].map((step, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        {step.done ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                        )}
                        <span className={step.done ? 'text-gray-900' : 'text-gray-400'}>
                          {step.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Show failed state
  if (resume.status === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="pt-32 pb-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <AlertCircle className="w-24 h-24 text-red-500 mx-auto mb-8" />
              <h1 className="text-4xl font-bold mb-4">Analysis Failed</h1>
              <p className="text-xl text-gray-600 mb-8">
                We encountered an error while analyzing your resume. Please try uploading again.
              </p>
              <Button onClick={() => navigate('/resume-builder')} size="lg">
                Upload New Resume
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const score = atsData?.ats_score || resume.analysis_score || 0;
  const atsScore = atsData?.ats_score || score || 0;
  const keywordsFound = resume.keywords?.length || atsData?.keyword_analysis?.density_score || 0;
  const impactScore = atsData?.section_scores?.find((s: any) => s.section?.includes('Experience'))?.score || 0;
  const analysisTime = atsData ? new Date().toLocaleString() : new Date(resume.processed_at || resume.created_at).toLocaleString();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-4 md:px-8 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/Dark BG Logo.png"
              alt="ApplyX Logo"
              className="h-10 md:h-12 w-auto"
            />
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => navigate('/dashboard')} className="text-sm font-medium text-gray-600 hover:text-black transition-colors">Dashboard</button>
            <button onClick={() => navigate('/resume-builder')} className="text-sm font-medium text-gray-600 hover:text-black transition-colors">Upload New</button>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center text-white text-sm font-semibold">
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Header with context */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <span>Resumes</span>
            <span>/</span>
            <span className="text-black font-medium">{resume.original_filename}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 md:mb-8 gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-black">Resume Analysis</h1>
                <span className="px-3 py-1 bg-black text-white text-xs font-bold rounded-full">LIVE</span>
              </div>
              <p className="text-gray-600 text-base md:text-lg">
                Last updated {analysisTime} • {Math.round(resume.file_size / 1024)} KB
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="default" className="group">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button className="bg-black hover:bg-gray-900 text-white group">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>

          {/* Score Dashboard - Responsive Grid */}
          <div className="bg-white border border-gray-200 rounded-xl md:rounded-2xl p-4 md:p-8 shadow-sm mb-6 md:mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              <div className="text-center md:border-r border-gray-200 last:border-r-0">
                <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-black rounded-full mb-3 md:mb-4">
                  <span className="text-2xl md:text-3xl font-bold text-white">{score}</span>
                </div>
                <h3 className="text-xs md:text-sm font-bold text-gray-900 mb-1">Overall Score</h3>
                <p className="text-xs text-gray-500">Strong performance</p>
              </div>

              <div className="text-center md:border-r border-gray-200 last:border-r-0">
                <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-full mb-3 md:mb-4">
                  <span className="text-2xl md:text-3xl font-bold text-black">{atsScore}</span>
                </div>
                <h3 className="text-xs md:text-sm font-bold text-gray-900 mb-1">ATS Compatible</h3>
                <p className="text-xs text-green-600 font-medium">Excellent</p>
              </div>

              <div className="text-center md:border-r border-gray-200 last:border-r-0">
                <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-full mb-3 md:mb-4">
                  <span className="text-2xl md:text-3xl font-bold text-black">{keywordsFound}<span className="text-base md:text-lg text-gray-400">/30</span></span>
                </div>
                <h3 className="text-xs md:text-sm font-bold text-gray-900 mb-1">Keywords Found</h3>
                <p className="text-xs text-blue-600 font-medium">Add {30 - keywordsFound} more</p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-full mb-3 md:mb-4">
                  <span className="text-2xl md:text-3xl font-bold text-black">{impactScore}</span>
                </div>
                <h3 className="text-xs md:text-sm font-bold text-gray-900 mb-1">Impact Score</h3>
                <p className="text-xs text-gray-500">Good foundation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area - Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Primary Analysis */}
          <div className="lg:col-span-8 space-y-6">
            {/* Quick Wins Card */}
            <Card className="bg-gradient-to-br from-black to-gray-900 rounded-xl md:rounded-2xl overflow-hidden">
              <CardContent className="p-6 md:p-8 text-white">
                <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-lime-400" />
                      <h2 className="text-xl md:text-2xl font-bold">Quick Wins</h2>
                    </div>
                    <p className="text-gray-300 text-sm md:text-base">Complete these actions to boost your score by 15 points</p>
                  </div>
                  <Button className="bg-lime-400 hover:bg-lime-500 text-black text-sm font-bold w-full md:w-auto">
                    Auto-fix All
                  </Button>
                </div>

                <div className="space-y-3">
                  {(resume.suggestions || [
                    { text: 'Add industry-specific keywords', impact: 8, time: '2 min' },
                    { text: 'Include quantifiable metrics', impact: 5, time: '5 min' },
                    { text: 'Standardize date formatting', impact: 2, time: '1 min' },
                  ]).slice(0, 3).map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 md:p-5 transition-all cursor-pointer"
                      onClick={() => navigate(`/live-editor/${id}`)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 md:gap-4 flex-1">
                          <div className="w-5 h-5 md:w-6 md:h-6 border-2 border-white/30 group-hover:border-lime-400 rounded transition-all flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 md:w-4 md:h-4 text-lime-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm md:text-base mb-1 truncate">{item.text || item}</p>
                            <div className="flex items-center gap-2 md:gap-3 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {item.time || '2 min'}
                              </span>
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                +{item.impact || 5} points
                              </span>
                            </div>
                          </div>
                        </div>
                        <button className="hidden md:block opacity-0 group-hover:opacity-100 text-lime-400 font-semibold text-sm transition-all flex items-center gap-1 whitespace-nowrap">
                          Fix now
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Section Breakdown */}
            <Card className="rounded-xl md:rounded-2xl">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl md:text-2xl font-bold text-black">Section Performance</h2>
                  <button className="text-sm text-gray-500 hover:text-black font-medium hidden md:block">View Details →</button>
                </div>

                <div className="space-y-6">
                  {loadingAts ? (
                    <div className="text-center py-4">
                      <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">Analyzing sections...</p>
                    </div>
                  ) : (atsData?.section_scores || [
                    { section: 'Work Experience', score: 80, status: 'Good', feedback: 'Loading...', icon: CheckCircle },
                    { section: 'Skills & Keywords', score: 75, status: 'Fair', feedback: 'Loading...', icon: CheckCircle },
                    { section: 'Format & Structure', score: 70, status: 'Fair', feedback: 'Loading...', icon: AlertCircle },
                  ]).map((item: any, idx: number) => (
                    <div key={idx} className="group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                          {item.score >= 90 ? <CheckCircle className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 text-black" /> :
                            item.score >= 75 ? <CheckCircle className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 text-gray-600" /> :
                              <AlertCircle className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 text-gray-400" />}
                          <span className="font-semibold text-black text-sm md:text-base truncate">{item.section}</span>
                          <span className="text-xs px-2 py-0.5 md:px-2.5 md:py-1 bg-gray-100 text-gray-600 font-medium rounded-full whitespace-nowrap">
                            {item.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4">
                          <span className="text-base md:text-lg font-bold text-black">{item.score}</span>
                        </div>
                      </div>
                      <div className="relative w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`${item.score >= 90 ? 'bg-black' : item.score >= 75 ? 'bg-gray-600' : 'bg-gray-400'} h-2 rounded-full transition-all duration-700`}
                          style={{ width: `${item.score}%` }}
                        ></div>
                      </div>
                      {item.feedback && <p className="text-xs text-gray-500 mt-1">{item.feedback}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Recommendations */}
            <Card className="bg-gray-50 rounded-xl md:rounded-2xl">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <h2 className="text-xl md:text-2xl font-bold text-black">AI Recommendations</h2>
                </div>
                <p className="text-gray-600 mb-6 text-sm md:text-base">Based on analysis of 50,000+ successful resumes in your industry</p>

                <div className="space-y-3">
                  {[
                    { priority: 'High', label: 'Keywords', text: 'Add missing technical terms: "agile", "scrum", "CI/CD"' },
                    { priority: 'High', label: 'Metrics', text: 'Replace "Managed team" with "Led team of 8 engineers"' },
                    { priority: 'Medium', label: 'Format', text: 'Use consistent date format throughout document' },
                    { priority: 'Low', label: 'Links', text: 'Add professional portfolio and LinkedIn profile' },
                  ].map((item, idx) => (
                    <div key={idx} className="group bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-4 md:p-5 transition-all">
                      <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg self-start ${item.priority === 'High' ? 'bg-black text-white' :
                          item.priority === 'Medium' ? 'bg-gray-200 text-gray-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                          {item.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 leading-relaxed">{item.text}</p>
                        </div>
                        <button className="hidden md:block opacity-0 group-hover:opacity-100 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-all whitespace-nowrap">
                          Apply
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - Context & Actions */}
          <div className="lg:col-span-4 space-y-6">
            {/* Job Match Analysis */}
            <Card className="rounded-xl md:rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-black">Job Role Match</h3>
                  <Target className="w-4 h-4 text-gray-400" />
                </div>

                <div className="space-y-5">
                  {loadingJobMatches ? (
                    <div className="text-center py-4">
                      <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">Analyzing job matches...</p>
                    </div>
                  ) : jobMatches.length > 0 ? (
                    jobMatches.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="group cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-black truncate">{item.role}</p>
                            <p className="text-xs text-gray-500">{item.strengths?.[0] || 'AI analyzed'}</p>
                          </div>
                          <span className="text-lg md:text-xl font-bold text-black ml-2">{item.match_percent}%</span>
                        </div>
                        <div className="relative w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`${idx === 0 ? 'bg-black' : idx === 1 ? 'bg-gray-700' : 'bg-gray-400'} h-1.5 rounded-full transition-all duration-500`}
                            style={{ width: `${item.match_percent}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Processing job matches...</p>
                  )}
                </div>

                <Button variant="outline" className="w-full mt-6">
                  Compare with Job Description
                </Button>
              </CardContent>
            </Card>

            {/* Document Stats */}
            <Card className="bg-gray-50 rounded-xl md:rounded-2xl">
              <CardContent className="p-6">
                <h3 className="font-bold text-black mb-5">Document Info</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">File size</span>
                    <span className="text-sm font-semibold text-black">{Math.round(resume.file_size / 1024)} KB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <span className="text-sm font-semibold text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      {resume.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">ATS readable</span>
                    <span className="text-sm font-semibold text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Yes
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card className="rounded-xl md:rounded-2xl">
              <CardContent className="p-6">
                <h3 className="font-bold text-black mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    onClick={handleEditInBuilder}
                    disabled={isConverting}
                  >
                    {isConverting ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Converting...</>
                    ) : (
                      <><Edit3 className="w-4 h-4 mr-2" />Edit in Resume Builder</>
                    )}
                  </Button>
                  <Button className="w-full bg-lime-400 hover:bg-lime-500 text-black font-bold">
                    <Zap className="w-4 h-4 mr-2" />
                    Optimize with AI
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/resume-builder')}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload New Version
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>
                    <FileText className="w-4 h-4 mr-2" />
                    View All Resumes
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Extracted Words */}
            {resume.status === 'completed' && resume.keywords && resume.keywords.length > 0 && (
              <Card className="rounded-xl md:rounded-2xl border-2 border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-black" />
                    <h3 className="font-bold text-black">Top Keywords</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      Showing {Math.min(50, resume.keywords.length)} of {resume.keywords.length} words
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {resume.keywords.slice(0, 50).join(', ')}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    Top 50 most important keywords extracted and used to calculate your ATS score
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Tips Card */}
            <Card className="bg-blue-50 border-blue-200 rounded-xl md:rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-black mb-2">Pro Tip</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Resumes with quantified achievements get 40% more interview callbacks. Add numbers to your bullet points!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Success Story */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent Success</h3>
              <SuccessStoryCard story={successStories[0]} variant="compact" />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ResumeAnalysis;
