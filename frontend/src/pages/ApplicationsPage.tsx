/**
 * Applications Dashboard Page
 * ============================
 * Track job applications with status, match scores, and application history.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, 
  BookmarkPlus, 
  Send, 
  Users, 
  CheckCircle2,
  XCircle,
  Star,
  StarOff,
  ExternalLink,
  Trash2,
  MoreVertical,
  Filter,
  Search,
  ChevronDown,
  Sparkles,
  Clock,
  MapPin,
  Building2,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Zap,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  applicationsService, 
  creditsService, 
  matchScoringService,
  JobApplication,
  ApplicationStatus,
  UserCredits,
  ApplicationStats 
} from '@/services/applicationService';
import { toast } from 'sonner';

// Status configurations
const STATUS_CONFIG: Record<ApplicationStatus, { 
  label: string; 
  color: string; 
  bgColor: string;
  icon: typeof Briefcase;
}> = {
  saved: { label: 'Saved', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: BookmarkPlus },
  applied: { label: 'Applied', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: Send },
  screening: { label: 'Screening', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: Users },
  interview: { label: 'Interview', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: Users },
  interviewing: { label: 'Interviewing', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: Users },
  offer: { label: 'Offer', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle },
  withdrawn: { label: 'Withdrawn', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: XCircle },
};

// Match score color
const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return 'Excellent Match';
  if (score >= 60) return 'Good Match';
  if (score >= 40) return 'Fair Match';
  return 'Low Match';
};

// Application Card Component
const ApplicationCard = ({ 
  application, 
  onUpdate, 
  onDelete, 
  onApply,
  onScore 
}: { 
  application: JobApplication;
  onUpdate: (id: number, updates: Partial<JobApplication>) => void;
  onDelete: (id: number) => void;
  onApply: (id: number) => void;
  onScore: (id: number) => void;
}) => {
  const statusConfig = STATUS_CONFIG[application.status];
  const StatusIcon = statusConfig.icon;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Company Logo / Placeholder */}
        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
          {application.company_logo ? (
            <img 
              src={application.company_logo} 
              alt={application.company}
              className="w-10 h-10 object-contain"
            />
          ) : (
            <Building2 className="w-6 h-6 text-gray-400" />
          )}
        </div>
        
        {/* Job Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">
              {application.job_title}
            </h3>
            {application.is_favorite && (
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-2">{application.company}</p>
          
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            {application.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {application.location}
              </span>
            )}
            {application.job_type && (
              <span className="flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                {application.job_type}
              </span>
            )}
            {application.salary_min && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {application.salary_min.toLocaleString()}
                {application.salary_max && ` - ${application.salary_max.toLocaleString()}`}
              </span>
            )}
            {application.is_remote && (
              <Badge variant="outline" className="text-xs py-0">Remote</Badge>
            )}
          </div>
        </div>
        
        {/* Match Score */}
        {application.match_score !== undefined && application.match_score !== null ? (
          <div className="text-center flex-shrink-0">
            <div className={`text-2xl font-bold ${getScoreColor(application.match_score)}`}>
              {Math.round(application.match_score)}%
            </div>
            <div className="text-xs text-gray-500">{getScoreLabel(application.match_score)}</div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onScore(application.id)}
            className="text-xs"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Score
          </Button>
        )}
        
        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onUpdate(application.id, { is_favorite: !application.is_favorite })}>
              {application.is_favorite ? (
                <>
                  <StarOff className="w-4 h-4 mr-2" />
                  Remove Favorite
                </>
              ) : (
                <>
                  <Star className="w-4 h-4 mr-2" />
                  Add to Favorites
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(application.job_url, '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              View Job Posting
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onUpdate(application.id, { status: 'applied' })}>
              <Send className="w-4 h-4 mr-2" />
              Mark as Applied
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdate(application.id, { status: 'interview' })}>
              <Users className="w-4 h-4 mr-2" />
              Mark as Interview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdate(application.id, { status: 'offer' })}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Mark as Offer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdate(application.id, { status: 'rejected' })}>
              <XCircle className="w-4 h-4 mr-2" />
              Mark as Rejected
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(application.id)}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Status & Time */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {statusConfig.label}
        </Badge>
        
        <div className="flex items-center gap-3">
          {application.status === 'saved' && (
            <Button
              size="sm"
              onClick={() => onApply(application.id)}
              className="bg-primary hover:bg-primary/90"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Apply Now
            </Button>
          )}
          
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(application.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
      
      {/* Skills Preview */}
      {(application.matched_skills?.length > 0 || application.missing_skills?.length > 0) && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap gap-1">
            {application.matched_skills?.slice(0, 3).map(skill => (
              <Badge key={skill} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                ✓ {skill}
              </Badge>
            ))}
            {application.missing_skills?.slice(0, 2).map(skill => (
              <Badge key={skill} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                + {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Stats Card Component
const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: number; 
  icon: typeof Briefcase;
  color: string;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-gray-500">{title}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Credits Display Component
const CreditsDisplay = ({ credits }: { credits: UserCredits | null }) => {
  if (!credits) return null;
  
  return (
    <Card className="bg-gradient-to-r from-primary to-purple-600 text-white">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">Resume Credits</p>
            <p className="text-3xl font-bold">
              {credits.total_available}
              <span className="text-lg opacity-80">/{credits.daily_max}</span>
            </p>
            <p className="text-xs opacity-80 mt-1">
              Resets {credits.resets_at}
            </p>
          </div>
          <div className="text-right">
            <Badge className="bg-white/20 border-0 text-white capitalize">
              {credits.tier}
            </Badge>
            {credits.bonus_credits > 0 && (
              <p className="text-xs mt-2">
                +{credits.bonus_credits} bonus credits
              </p>
            )}
          </div>
        </div>
        <Progress 
          value={(credits.daily_remaining / credits.daily_max) * 100} 
          className="mt-3 h-2 bg-white/20"
        />
      </CardContent>
    </Card>
  );
};

// Main Applications Page
const ApplicationsPage = () => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'match_score'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [appsResponse, statsResponse, creditsResponse] = await Promise.all([
        applicationsService.listApplications({
          sort_by: sortBy,
          sort_order: sortOrder,
          limit: 100,
        }),
        applicationsService.getStats(),
        creditsService.getCredits(),
      ]);
      
      // Handle both array and paginated response
      const apps = Array.isArray(appsResponse) ? appsResponse : appsResponse;
      setApplications(apps);
      setStats(statsResponse);
      setCredits(creditsResponse);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, [sortBy, sortOrder]);
  
  // Filter applications by tab
  const filteredApplications = applications.filter(app => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!app.job_title.toLowerCase().includes(query) && 
          !app.company.toLowerCase().includes(query)) {
        return false;
      }
    }
    
    // Tab filter
    switch (activeTab) {
      case 'saved':
        return app.status === 'saved';
      case 'applied':
        return app.status === 'applied';
      case 'in_progress':
        return ['screening', 'interview'].includes(app.status);
      case 'completed':
        return ['offer', 'rejected', 'withdrawn'].includes(app.status);
      case 'favorites':
        return app.is_favorite;
      default:
        return true;
    }
  });
  
  // Handlers
  const handleUpdate = async (id: number, updates: Partial<JobApplication>) => {
    try {
      await applicationsService.updateApplication(id, updates as any);
      setApplications(apps => 
        apps.map(app => app.id === id ? { ...app, ...updates } : app)
      );
      toast.success('Application updated');
      fetchData(); // Refresh stats
    } catch (error) {
      toast.error('Failed to update application');
    }
  };
  
  const handleDelete = async (id: number) => {
    try {
      await applicationsService.deleteApplication(id);
      setApplications(apps => apps.filter(app => app.id !== id));
      toast.success('Application deleted');
      fetchData(); // Refresh stats
    } catch (error) {
      toast.error('Failed to delete application');
    }
  };
  
  const handleApply = async (id: number) => {
    try {
      const result = await applicationsService.markAsApplied(id);
      window.open(result.redirect_url, '_blank');
      setApplications(apps => 
        apps.map(app => app.id === id ? { ...app, status: 'applied', applied_at: new Date().toISOString() } : app)
      );
      toast.success('Good luck with your application!');
      fetchData();
    } catch (error) {
      toast.error('Failed to mark as applied');
    }
  };
  
  const handleScore = async (id: number) => {
    try {
      toast.info('Calculating match score...');
      const result = await matchScoringService.scoreApplication(id);
      setApplications(apps => 
        apps.map(app => app.id === id ? { 
          ...app, 
          match_score: result.overall_score,
          matched_skills: result.matched_skills,
          missing_skills: result.missing_skills,
        } : app)
      );
      toast.success(`Match score: ${Math.round(result.overall_score)}%`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to calculate score');
    }
  };
  
  const handleBatchScore = async () => {
    try {
      toast.info('Scoring all unscored applications...');
      const result = await matchScoringService.batchScore({ score_all_unscored: true });
      toast.success(`Scored ${result.scored_count} applications`);
      fetchData();
    } catch (error) {
      toast.error('Failed to batch score');
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
            <p className="text-gray-600 mt-1">Track and manage your job applications</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleBatchScore}>
              <Sparkles className="w-4 h-4 mr-2" />
              Score All
            </Button>
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          <StatsCard 
            title="Total" 
            value={stats?.total || 0} 
            icon={Briefcase} 
            color="bg-blue-500" 
          />
          <StatsCard 
            title="Saved" 
            value={stats?.by_status.saved || 0} 
            icon={BookmarkPlus} 
            color="bg-gray-500" 
          />
          <StatsCard 
            title="Applied" 
            value={stats?.by_status.applied || 0} 
            icon={Send} 
            color="bg-purple-500" 
          />
          <StatsCard 
            title="In Progress" 
            value={(stats?.by_status.screening || 0) + (stats?.by_status.interview || 0)} 
            icon={Users} 
            color="bg-orange-500" 
          />
          <CreditsDisplay credits={credits} />
        </div>
        
        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Filter className="w-4 h-4 mr-2" />
                Sort: {sortBy === 'match_score' ? 'Match Score' : 'Date Added'}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy('created_at')}>
                <Clock className="w-4 h-4 mr-2" />
                Date Added
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('match_score')}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Match Score
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                {sortOrder === 'desc' ? 'Descending' : 'Ascending'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">
              All ({stats?.total || 0})
            </TabsTrigger>
            <TabsTrigger value="saved">
              Saved ({stats?.by_status.saved || 0})
            </TabsTrigger>
            <TabsTrigger value="applied">
              Applied ({stats?.by_status.applied || 0})
            </TabsTrigger>
            <TabsTrigger value="in_progress">
              In Progress ({(stats?.by_status.screening || 0) + (stats?.by_status.interview || 0)})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({(stats?.by_status.offer || 0) + (stats?.by_status.rejected || 0)})
            </TabsTrigger>
            <TabsTrigger value="favorites">
              <Star className="w-4 h-4 mr-1" />
              ({stats?.favorites || 0})
            </TabsTrigger>
          </TabsList>
          
          {/* Applications Grid */}
          <TabsContent value={activeTab} className="mt-0">
            {loading ? (
              <div className="grid gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredApplications.length > 0 ? (
              <AnimatePresence mode="popLayout">
                <div className="grid gap-4">
                  {filteredApplications.map(app => (
                    <ApplicationCard
                      key={app.id}
                      application={app}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      onApply={handleApply}
                      onScore={handleScore}
                    />
                  ))}
                </div>
              </AnimatePresence>
            ) : (
              <Card className="p-12 text-center">
                <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No applications found
                </h3>
                <p className="text-gray-600 mb-4">
                  {activeTab === 'all' 
                    ? "Start by searching for jobs and saving the ones you're interested in."
                    : `No applications in "${activeTab}" status.`
                  }
                </p>
                <Button asChild>
                  <a href="/jobs-page">
                    <Search className="w-4 h-4 mr-2" />
                    Search Jobs
                  </a>
                </Button>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
};

export default ApplicationsPage;
