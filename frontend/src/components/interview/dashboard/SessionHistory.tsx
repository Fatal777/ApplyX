/**
 * Session History Component
 * Displays past interview sessions with premium cards and filtering
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  Clock,
  ChevronRight,
  Filter,
  Search,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trophy,
  Brain,
  MessageSquare,
  Star,
  TrendingUp,
  Eye,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import interviewService, { InterviewSession, InterviewStatus } from '@/services/interviewService';

interface SessionHistoryProps {
  limit?: number;
  showAll?: boolean;
  onViewAll?: () => void;
  onResumeSession?: (sessionId: number) => void;
}

// Status badge configuration
const statusConfig: Record<InterviewStatus, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  completed: { icon: CheckCircle, color: '#c7ff6b', bg: 'rgba(199, 255, 107, 0.1)', label: 'Completed' },
  in_progress: { icon: Play, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)', label: 'In Progress' },
  scheduled: { icon: Calendar, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Scheduled' },
  cancelled: { icon: XCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Cancelled' },
  failed: { icon: AlertCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Failed' },
};

// Interview type labels
const typeLabels: Record<string, string> = {
  behavioral: 'Behavioral',
  technical_theory: 'Technical',
  mixed: 'Mixed',
  custom: 'Custom',
};

// Session Card Component
const SessionCard = ({ 
  session, 
  index,
  onResume,
  onViewFeedback
}: { 
  session: InterviewSession; 
  index: number;
  onResume?: () => void;
  onViewFeedback?: () => void;
}) => {
  const config = session.config as Record<string, any>;
  const status = statusConfig[session.status] || statusConfig.failed;
  const StatusIcon = status.icon;
  const score = config?.feedback?.overall_score || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -2 }}
      className="group relative"
    >
      <div className="
        relative p-5 rounded-2xl overflow-hidden
        bg-white/[0.03] backdrop-blur-xl
        border border-white/[0.08]
        hover:border-white/[0.15] hover:bg-white/[0.05]
        transition-all duration-300
      ">
        {/* Gradient Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c7ff6b] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Header Row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Type Icon */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
              {session.interview_type === 'behavioral' && <MessageSquare className="w-5 h-5 text-primary" />}
              {session.interview_type === 'technical_theory' && <Brain className="w-5 h-5 text-primary" />}
              {session.interview_type === 'mixed' && <Star className="w-5 h-5 text-primary" />}
              {session.interview_type === 'custom' && <Trophy className="w-5 h-5 text-primary" />}
            </div>
            
            <div>
              <h3 className="text-white font-medium">
                {typeLabels[session.interview_type] || 'Interview'} Interview
              </h3>
              <p className="text-gray-500 text-sm">
                {config?.job_role || 'General Practice'}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: status.bg, color: status.color }}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            {status.label}
          </div>
        </div>

        {/* Info Row */}
        <div className="flex items-center gap-6 text-sm text-gray-400 mb-4">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {format(new Date(session.created_at), 'MMM d, yyyy')}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
          </div>
          {config?.num_questions && (
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              {config.num_questions} questions
            </div>
          )}
        </div>

        {/* Score and Actions */}
        <div className="flex items-center justify-between">
          {/* Score Display */}
          {score !== null ? (
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="4"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke={score >= 80 ? '#c7ff6b' : score >= 60 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 126} 126`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                  {score}
                </span>
              </div>
              <div>
                <p className="text-white font-medium text-sm">Score</p>
                <p className="text-gray-500 text-xs">
                  {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Practice'}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-sm">
              {session.status === 'in_progress' ? 'In progress...' : 'No score available'}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {session.status === 'in_progress' && onResume && (
              <Button
                size="sm"
                onClick={onResume}
                className="bg-[#c7ff6b] text-black hover:bg-[#b8f55a] gap-1.5"
              >
                <Play className="w-4 h-4" />
                Resume
              </Button>
            )}
            {session.status === 'completed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={onViewFeedback}
                className="border-white/20 text-white hover:bg-white/10 gap-1.5"
              >
                <Eye className="w-4 h-4" />
                View
              </Button>
            )}
            {(session.status === 'cancelled' || session.status === 'failed') && (
              <Button
                size="sm"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const SessionHistory = ({
  limit = 10,
  showAll = false,
  onViewAll,
  onResumeSession
}: SessionHistoryProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Fetch sessions
  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ['interviewSessions', limit],
    queryFn: () => interviewService.listSessions(showAll ? 100 : limit, 0),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Filter sessions
  const filteredSessions = sessions?.filter(session => {
    const config = session.config as Record<string, any>;
    const matchesSearch = !searchQuery || 
      (config?.job_role?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    const matchesType = typeFilter === 'all' || session.interview_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  }) || [];

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(limit > 5 ? 5 : limit)].map((_, i) => (
          <div 
            key={i}
            className="h-32 rounded-2xl bg-white/[0.03] animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="
        p-8 rounded-2xl text-center
        bg-white/[0.03] border border-white/[0.08]
      ">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-white font-medium mb-2">Failed to load sessions</h3>
        <p className="text-gray-400 text-sm">Please try again later</p>
      </div>
    );
  }

  // Empty state
  if (!sessions?.length) {
    return (
      <div className="
        p-12 rounded-2xl text-center
        bg-white/[0.03] border border-white/[0.08]
      ">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Brain className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-white font-semibold text-lg mb-2">No interviews yet</h3>
        <p className="text-gray-400 mb-6">Start your first mock interview to see your history here</p>
        <Button 
          className="bg-gradient-to-r from-[#c7ff6b] to-[#a8e063] text-black hover:opacity-90"
        >
          Start Interview
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters (only show in full view) */}
      {showAll && (
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by job role..."
              className="pl-10 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-500"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-white/[0.03] border-white/[0.08] text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] bg-white/[0.03] border-white/[0.08] text-white">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="behavioral">Behavioral</SelectItem>
                <SelectItem value="technical_theory">Technical</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Section Header (for overview) */}
      {!showAll && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Recent Sessions</h2>
          {onViewAll && (
            <Button
              variant="ghost"
              onClick={onViewAll}
              className="text-gray-400 hover:text-white gap-1"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* Sessions List */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredSessions.slice(0, showAll ? undefined : limit).map((session, index) => (
            <SessionCard
              key={session.id}
              session={session}
              index={index}
              onResume={onResumeSession ? () => onResumeSession(session.id) : undefined}
              onViewFeedback={() => {/* Navigate to feedback view */}}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty filter result */}
      {filteredSessions.length === 0 && sessions.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No sessions match your filters</p>
        </div>
      )}
    </div>
  );
};

export default SessionHistory;
