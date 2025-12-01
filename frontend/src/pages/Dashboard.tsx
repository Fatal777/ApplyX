import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  FileText, Plus, Search, Filter, MoreVertical, Download, 
  Trash2, Eye, TrendingUp, Clock, CheckCircle, AlertCircle,
  BarChart2, Target, Zap, ArrowRight, X, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useResumes } from "@/hooks/useResumes";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";

interface ProfileStatus {
  is_complete: boolean;
  completion_percentage: number;
  missing_fields: string[];
  needs_attention: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { resumes, loading, deleteResume } = useResumes();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterScore, setFilterScore] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Check profile completion status
    const checkProfile = async () => {
      try {
        const status = await apiClient.getProfileStatus() as ProfileStatus;
        setProfileStatus(status);
      } catch (error) {
        console.error("Failed to check profile status:", error);
      }
    };
    
    checkProfile();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'processing':
        return <Clock className="w-4 h-4 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const filteredResumes = resumes?.filter((resume: any) => {
    const matchesSearch = resume.original_filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || resume.status === filterStatus;
    const matchesScore = filterScore === "all" || 
      (filterScore === "high" && (resume.analysis_score || 0) >= 80) ||
      (filterScore === "medium" && (resume.analysis_score || 0) >= 60 && (resume.analysis_score || 0) < 80) ||
      (filterScore === "low" && (resume.analysis_score || 0) < 60);
    return matchesSearch && matchesStatus && matchesScore;
  }) || [];

  const handleDelete = async (id: number, filename: string) => {
    if (window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      try {
        await deleteResume(id);
        toast({
          title: "Resume deleted",
          description: "The resume has been successfully deleted.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete resume. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const stats = {
    total: resumes?.length || 0,
    completed: resumes?.filter((r: any) => r.status === 'completed').length || 0,
    avgScore: resumes?.length > 0 
      ? Math.round(resumes.reduce((acc: number, r: any) => acc + (r.analysis_score || 0), 0) / resumes.length)
      : 0
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 md:py-12 mt-24 md:mt-28">
        {/* Profile Completion Banner - Subtle, dismissible */}
        {profileStatus?.needs_attention && !bannerDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="bg-gradient-to-r from-lime-50 to-emerald-50 border border-lime-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-lime-100 rounded-full">
                  <User className="w-4 h-4 text-lime-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Complete your profile to unlock all features
                  </p>
                  <p className="text-xs text-gray-600">
                    Add your {profileStatus.missing_fields.join(" and ").toLowerCase()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-lime-700 border-lime-300 hover:bg-lime-100"
                  onClick={() => navigate('/settings')}
                >
                  Complete Now
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setBannerDismissed(true)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-black mb-2">My Resumes</h1>
              <p className="text-gray-600">Manage and track all your resume analyses</p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={() => navigate('/ats-templates')}
              >
                <FileText className="w-4 h-4 mr-2" />
                ATS Templates
              </Button>
              <Button 
                className="bg-black hover:bg-gray-900 text-white"
                onClick={() => navigate('/resume-builder')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Upload New
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-2 border-gray-200 rounded-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Resumes</p>
                    <p className="text-3xl font-bold text-black">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 rounded-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Analyzed</p>
                    <p className="text-3xl font-bold text-black">{stats.completed}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 rounded-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg Score</p>
                    <p className="text-3xl font-bold text-black">{stats.avgScore}</p>
                  </div>
                  <div className="w-12 h-12 bg-lime-400 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-black" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter */}
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search resumes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-2"
                />
              </div>
              <Button 
                variant="outline" 
                className="border-2"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters {(filterStatus !== "all" || filterScore !== "all") && "(Active)"}
              </Button>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white border-2 border-gray-200 rounded-xl p-4"
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-black mb-2 block">Status</label>
                    <div className="flex flex-wrap gap-2">
                      {["all", "completed", "processing", "failed"].map((status) => (
                        <Button
                          key={status}
                          variant={filterStatus === status ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilterStatus(status)}
                          className={filterStatus === status ? "bg-black text-white" : ""}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-black mb-2 block">Score Range</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "all", label: "All" },
                        { value: "high", label: "80-100" },
                        { value: "medium", label: "60-79" },
                        { value: "low", label: "0-59" }
                      ].map((score) => (
                        <Button
                          key={score.value}
                          variant={filterScore === score.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilterScore(score.value)}
                          className={filterScore === score.value ? "bg-black text-white" : ""}
                        >
                          {score.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterStatus("all");
                      setFilterScore("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Resumes List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading your resumes...</p>
            </div>
          </div>
        ) : filteredResumes.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300 rounded-xl">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-black mb-2">No resumes yet</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery ? "No resumes match your search" : "Upload your first resume to get started"}
              </p>
              {!searchQuery && (
                <Button 
                  className="bg-black hover:bg-gray-900 text-white"
                  onClick={() => navigate('/resume-builder')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Resume
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredResumes.map((resume: any, index: number) => (
              <motion.div
                key={resume.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-2 border-gray-200 rounded-xl hover:shadow-lg transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Icon */}
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-gray-600" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-black text-lg mb-1 truncate">
                              {resume.original_filename}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Uploaded {new Date(resume.created_at).toLocaleDateString()} • {Math.round(resume.file_size / 1024)} KB
                            </p>
                          </div>
                          <Badge className={`${getStatusColor(resume.status)} border font-medium flex items-center gap-1`}>
                            {getStatusIcon(resume.status)}
                            {resume.status}
                          </Badge>
                        </div>

                        {/* Score and Actions */}
                        <div className="flex flex-wrap items-center gap-4 mt-4">
                          {resume.analysis_score && (
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">{resume.analysis_score}</span>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Overall Score</p>
                                <p className="text-sm font-medium text-black">
                                  {resume.analysis_score >= 80 ? 'Excellent' : resume.analysis_score >= 60 ? 'Good' : 'Needs Work'}
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="flex-1" />

                          <div className="flex items-center gap-2">
                            {resume.status === 'completed' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/resume/${resume.id}`)}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Analysis
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {resume.status === 'processing' && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                              >
                                <Clock className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </Button>
                            )}
                            {resume.status === 'failed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/resume-builder')}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Retry
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/resume/${resume.id}`)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDelete(resume.id, resume.original_filename)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <Card className="border-2 border-gray-200 rounded-xl hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/ats-templates')}>
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-lime-400 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-black" />
              </div>
              <h3 className="font-bold text-black mb-2">ATS Templates</h3>
              <p className="text-sm text-gray-600 mb-4">
                Download pre-optimized resume templates
              </p>
              <div className="flex items-center text-black font-medium text-sm">
                Browse Templates
                <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 rounded-xl hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/mock-interview')}>
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-black mb-2">Mock Interviews</h3>
              <p className="text-sm text-gray-600 mb-4">
                Practice with AI-powered interview simulations
              </p>
              <div className="flex items-center text-black font-medium text-sm">
                Start Practicing
                <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 rounded-xl hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/jobs')}>
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
                <BarChart2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-black mb-2">Job Opportunities</h3>
              <p className="text-sm text-gray-600 mb-4">
                Find jobs that match your resume profile
              </p>
              <div className="flex items-center text-black font-medium text-sm">
                Explore Jobs
                <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
