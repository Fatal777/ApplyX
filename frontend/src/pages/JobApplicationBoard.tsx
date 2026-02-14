/**
 * JobApplicationBoard - Jobright-style job application tracking board
 * Features: Kanban columns, credits display, match scores, resume customization
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  Search,
  Plus,
  Filter,
  LayoutGrid,
  List,
  Star,
  StarOff,
  MapPin,
  Building2,
  Clock,
  ExternalLink,
  MoreHorizontal,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  Zap,
  Target,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  FileText,
  Download,
  Edit3,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Eye,
  Send,
  Calendar,
  DollarSign,
  Globe,
  Users,
  Award,
  MessageSquare,
  Bell,
  Settings,
  Home,
  Coins,
  Loader2,
  GripVertical,
  ArrowUpRight,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';

import Footer from '@/components/Footer';
import { ResumeCustomizer } from '@/components/jobs';
import { applicationsService, creditsService, JobApplication, UserCredits } from '@/services/applicationService';
import { cn } from '@/lib/utils';

type ApplicationStatus = 'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'withdrawn';

interface KanbanColumn {
  id: ApplicationStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

const kanbanColumns: KanbanColumn[] = [
  { 
    id: 'saved', 
    title: 'Saved', 
    icon: <Bookmark className="w-4 h-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  { 
    id: 'applied', 
    title: 'Applied', 
    icon: <Send className="w-4 h-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  { 
    id: 'interviewing', 
    title: 'Interview', 
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  { 
    id: 'offer', 
    title: 'Offer', 
    icon: <Award className="w-4 h-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
];

// Credits Display Widget
const CreditsWidget = ({ credits, loading }: { credits: UserCredits | null; loading: boolean }) => {
  const creditsUsed = credits ? credits.daily_limit - credits.remaining : 0;
  const progressPercentage = credits && credits.daily_limit > 0 
    ? (credits.remaining / credits.daily_limit) * 100 
    : 0;
  
  return (
    <Card className="border-2 border-[#c7ff6b]/30 bg-gradient-to-br from-[#c7ff6b]/5 to-[#c7ff6b]/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#c7ff6b] flex items-center justify-center">
              <Coins className="w-4 h-4 text-black" />
            </div>
            <div>
              <h3 className="font-bold text-sm">AI Credits</h3>
              <p className="text-xs text-muted-foreground">Resume optimization</p>
            </div>
          </div>
          <Badge variant="outline" className="border-[#c7ff6b] text-[#7fb832] bg-[#c7ff6b]/10">
            {credits?.tier || 'Free'}
          </Badge>
        </div>
        
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-2 bg-gray-200 rounded-full" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Daily remaining</span>
              <span className="font-bold text-[#7fb832]">
                {credits?.remaining ?? 0} / {credits?.daily_limit ?? 3}
              </span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-2 bg-gray-200"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Resets at midnight UTC
            </p>
          </>
        )}
        
        <Link to="/pricing">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3 border-[#c7ff6b] text-[#7fb832] hover:bg-[#c7ff6b] hover:text-black"
          >
            <Zap className="w-3 h-3 mr-1" />
            Upgrade for More
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

// Job Application Card for Kanban Board
const JobApplicationCard = ({ 
  application, 
  onStatusChange,
  onCustomizeResume,
  onRemove,
  onToggleFavorite
}: { 
  application: JobApplication;
  onStatusChange: (id: number, status: ApplicationStatus) => void;
  onCustomizeResume: (application: JobApplication) => void;
  onRemove: (id: number) => void;
  onToggleFavorite: (id: number) => void;
}) => {
  const matchScore = application.match_score || 0;
  
  const getMatchColor = (score: number) => {
    if (score >= 80) return 'from-[#c7ff6b] to-[#a8e063]';
    if (score >= 60) return 'from-blue-400 to-indigo-500';
    if (score >= 40) return 'from-amber-400 to-orange-500';
    return 'from-gray-300 to-gray-400';
  };

  const getMatchBadge = (score: number) => {
    if (score >= 80) return { text: 'Great Match', color: 'bg-green-100 text-green-700' };
    if (score >= 60) return { text: 'Good Match', color: 'bg-blue-100 text-blue-700' };
    if (score >= 40) return { text: 'Fair Match', color: 'bg-amber-100 text-amber-700' };
    return { text: 'Low Match', color: 'bg-gray-100 text-gray-700' };
  };

  const matchBadge = getMatchBadge(matchScore);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ y: -2 }}
      className="group"
    >
      <Card className="border border-gray-200 hover:border-primary/30 hover:shadow-lg transition-all duration-300 bg-white">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Company Logo */}
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                {application.company_logo ? (
                  <img 
                    src={application.company_logo} 
                    alt={application.company} 
                    className="w-6 h-6 object-contain rounded"
                  />
                ) : (
                  <Building2 className="w-5 h-5 text-gray-400" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {application.job_title}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {application.company}
                </p>
              </div>
            </div>
            
            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onCustomizeResume(application)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Customize Resume
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(application.job_url, '_blank')}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Job
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleFavorite(application.id)}>
                  {application.is_favorite ? (
                    <>
                      <StarOff className="w-4 h-4 mr-2" />
                      Remove from Favorites
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4 mr-2" />
                      Add to Favorites
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => onRemove(application.id)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Location & Type */}
          <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {application.location || 'Remote'}
            </span>
            {application.is_remote && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                <Globe className="w-2.5 h-2.5 mr-1" />
                Remote
              </Badge>
            )}
          </div>
          
          {/* Match Score */}
          {matchScore > 0 && (
            <div className="flex items-center justify-between mb-3 p-2 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center",
                  getMatchColor(matchScore)
                )}>
                  <span className="text-[10px] font-bold text-white">{Math.round(matchScore)}%</span>
                </div>
                <div>
                  <Badge className={cn("text-[10px]", matchBadge.color)}>
                    {matchBadge.text}
                  </Badge>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => onCustomizeResume(application)}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Improve
              </Button>
            </div>
          )}
          
          {/* Skills */}
          {application.matched_skills && application.matched_skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {application.matched_skills.slice(0, 3).map((skill, idx) => (
                <Badge key={idx} variant="secondary" className="text-[10px] px-2 py-0.5 bg-[#c7ff6b]/20 text-[#7fb832]">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                  {skill}
                </Badge>
              ))}
              {application.matched_skills.length > 3 && (
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                  +{application.matched_skills.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {application.saved_at ? new Date(application.saved_at).toLocaleDateString() : 'Recently'}
            </div>
            
            <div className="flex items-center gap-1">
              {application.is_favorite && (
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              )}
              <Button 
                variant="ghost" 
                size="sm"
                className="h-7 text-xs hover:bg-primary hover:text-white"
                onClick={() => window.open(application.job_url, '_blank')}
              >
                Apply
                <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Kanban Column Component
const KanbanColumnComponent = ({
  column,
  applications,
  onStatusChange,
  onCustomizeResume,
  onRemove,
  onToggleFavorite
}: {
  column: KanbanColumn;
  applications: JobApplication[];
  onStatusChange: (id: number, status: ApplicationStatus) => void;
  onCustomizeResume: (application: JobApplication) => void;
  onRemove: (id: number) => void;
  onToggleFavorite: (id: number) => void;
}) => {
  return (
    <div className="flex-1 min-w-[300px] max-w-[350px]">
      <div className={cn(
        "rounded-xl p-4",
        column.bgColor
      )}>
        {/* Column Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              column.color,
              column.bgColor
            )}>
              {column.icon}
            </div>
            <div>
              <h3 className="font-semibold text-sm">{column.title}</h3>
              <p className="text-xs text-muted-foreground">{applications.length} jobs</p>
            </div>
          </div>
          
          <Badge 
            variant="outline" 
            className={cn("text-xs", column.borderColor, column.color)}
          >
            {applications.length}
          </Badge>
        </div>
        
        {/* Cards */}
        <ScrollArea className="h-[calc(100vh-400px)] pr-2">
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {applications.map((app) => (
                <JobApplicationCard
                  key={app.id}
                  application={app}
                  onStatusChange={onStatusChange}
                  onCustomizeResume={onCustomizeResume}
                  onRemove={onRemove}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </AnimatePresence>
            
            {applications.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No jobs in {column.title.toLowerCase()}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

// Stats Card
const StatsCard = ({ 
  icon, 
  label, 
  value, 
  color,
  trend
}: { 
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  trend?: { value: number; positive: boolean };
}) => (
  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          color
        )}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        {trend && (
          <div className={cn(
            "ml-auto text-xs font-medium",
            trend.positive ? "text-green-600" : "text-red-600"
          )}>
            {trend.positive ? "+" : "-"}{trend.value}%
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

const JobApplicationBoard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [showResumeCustomizer, setShowResumeCustomizer] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');

  // Fetch applications
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const apps = await applicationsService.listApplications();
        setApplications(apps);
      } catch (error) {
        console.error('Failed to fetch applications:', error);
        toast({
          title: "Error",
          description: "Failed to load applications",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Fetch credits
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        setCreditsLoading(true);
        const userCredits = await creditsService.getCredits();
        setCredits(userCredits);
      } catch (error) {
        console.error('Failed to fetch credits:', error);
      } finally {
        setCreditsLoading(false);
      }
    };
    
    fetchCredits();
  }, []);

  // Group applications by status
  const applicationsByStatus = useMemo(() => {
    const filtered = applications.filter(app => {
      const matchesSearch = searchQuery.trim() === '' || 
        app.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.company.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTab = activeTab === 'all' || (activeTab === 'favorites' && app.is_favorite);
      
      return matchesSearch && matchesTab;
    });

    return kanbanColumns.reduce((acc, col) => {
      acc[col.id] = filtered.filter(app => app.status === col.id);
      return acc;
    }, {} as Record<ApplicationStatus, JobApplication[]>);
  }, [applications, searchQuery, activeTab]);

  // Stats
  const stats = useMemo(() => ({
    total: applications.length,
    saved: applications.filter(a => a.status === 'saved').length,
    applied: applications.filter(a => a.status === 'applied').length,
    interviewing: applications.filter(a => a.status === 'interviewing').length,
    offers: applications.filter(a => a.status === 'offer').length,
    favorites: applications.filter(a => a.is_favorite).length,
  }), [applications]);

  const handleStatusChange = async (id: number, status: ApplicationStatus) => {
    try {
      await applicationsService.updateApplication(id, { status });
      setApplications(prev => 
        prev.map(app => app.id === id ? { ...app, status } : app)
      );
      toast({
        title: "Status updated",
        description: `Application moved to ${status}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await applicationsService.updateApplication(id, { status: 'withdrawn' as ApplicationStatus });
      setApplications(prev => prev.filter(app => app.id !== id));
      toast({
        title: "Application removed",
        description: "The job has been removed from your board",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove application",
        variant: "destructive"
      });
    }
  };

  const handleToggleFavorite = async (id: number) => {
    const app = applications.find(a => a.id === id);
    if (!app) return;
    
    try {
      await applicationsService.updateApplication(id, { is_favorite: !app.is_favorite });
      setApplications(prev => 
        prev.map(a => a.id === id ? { ...a, is_favorite: !a.is_favorite } : a)
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorite",
        variant: "destructive"
      });
    }
  };

  const handleCustomizeResume = (application: JobApplication) => {
    setSelectedApplication(application);
    setShowResumeCustomizer(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-outfit">
      <div className="pt-20 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Link to="/dashboard" className="hover:text-primary">Dashboard</Link>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-foreground font-medium">Job Board</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                  Job Application Board
                </h1>
                <p className="text-muted-foreground">
                  Track your applications and customize resumes for each job
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Link to="/jobs">
                  <Button variant="outline" className="gap-2">
                    <Search className="w-4 h-4" />
                    Find Jobs
                  </Button>
                </Link>
                <Link to="/resume-builder">
                  <Button className="gap-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90">
                    <FileText className="w-4 h-4" />
                    Resume Builder
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
            <StatsCard
              icon={<Briefcase className="w-5 h-5 text-white" />}
              label="Total Applications"
              value={stats.total}
              color="bg-gradient-to-br from-primary to-indigo-600"
            />
            <StatsCard
              icon={<Bookmark className="w-5 h-5 text-white" />}
              label="Saved"
              value={stats.saved}
              color="bg-gradient-to-br from-blue-500 to-blue-600"
            />
            <StatsCard
              icon={<Send className="w-5 h-5 text-white" />}
              label="Applied"
              value={stats.applied}
              color="bg-gradient-to-br from-purple-500 to-purple-600"
            />
            <StatsCard
              icon={<MessageSquare className="w-5 h-5 text-white" />}
              label="Interviews"
              value={stats.interviewing}
              color="bg-gradient-to-br from-orange-500 to-orange-600"
            />
            <StatsCard
              icon={<Award className="w-5 h-5 text-white" />}
              label="Offers"
              value={stats.offers}
              color="bg-gradient-to-br from-green-500 to-green-600"
            />
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Content */}
            <div className="flex-1">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search jobs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                    <TabsList>
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="favorites" className="gap-1">
                        <Star className="w-3 h-3" />
                        Favorites
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'kanban' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('kanban')}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  
                  <Button variant="outline" size="sm" className="gap-1">
                    <Filter className="w-4 h-4" />
                    Filters
                  </Button>
                </div>
              </div>

              {/* Kanban Board */}
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : viewMode === 'kanban' ? (
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {kanbanColumns.map((column) => (
                    <KanbanColumnComponent
                      key={column.id}
                      column={column}
                      applications={applicationsByStatus[column.id] || []}
                      onStatusChange={handleStatusChange}
                      onCustomizeResume={handleCustomizeResume}
                      onRemove={handleRemove}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.length === 0 ? (
                    <Card className="p-12 text-center">
                      <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Start saving jobs to track your application progress
                      </p>
                      <Link to="/jobs">
                        <Button>
                          <Search className="w-4 h-4 mr-2" />
                          Browse Jobs
                        </Button>
                      </Link>
                    </Card>
                  ) : (
                    applications.map((app) => (
                      <JobApplicationCard
                        key={app.id}
                        application={app}
                        onStatusChange={handleStatusChange}
                        onCustomizeResume={handleCustomizeResume}
                        onRemove={handleRemove}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-80 space-y-6">
              {/* Credits Widget */}
              <CreditsWidget credits={credits} loading={creditsLoading} />
              
              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link to="/resume-builder">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <FileText className="w-4 h-4" />
                      Create New Resume
                    </Button>
                  </Link>
                  <Link to="/jobs">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Search className="w-4 h-4" />
                      Search Jobs
                    </Button>
                  </Link>
                  <Link to="/mock-interview">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Practice Interview
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Tips */}
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Pro Tip</h4>
                      <p className="text-xs text-muted-foreground">
                        Customize your resume for each job to increase your match score by up to 40%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Resume Customizer Dialog */}
      {selectedApplication && (
        <ResumeCustomizer 
          isOpen={showResumeCustomizer}
          onClose={() => {
            setShowResumeCustomizer(false);
            setSelectedApplication(null);
          }}
          jobTitle={selectedApplication.job_title}
          company={selectedApplication.company}
          jobDescription={selectedApplication.job_description || ''}
          applicationId={selectedApplication.id}
        />
      )}

      <Footer />
    </div>
  );
};

export default JobApplicationBoard;
