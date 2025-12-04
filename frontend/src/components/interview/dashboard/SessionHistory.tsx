/**
 * Session History Component
 * Clean, minimal session cards - Notion/Wellfound inspired
 * Aligned with ApplyX light theme design system
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  Clock,
  ChevronRight,
  Search,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trophy,
  Brain,
  MessageSquare,
  Star,
  Eye,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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

// Status badge configuration - Light theme colors
const statusConfig: Record<InterviewStatus, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Completed' },
  in_progress: { icon: Play, color: 'text-blue-600', bg: 'bg-blue-50', label: 'In Progress' },
  scheduled: { icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Scheduled' },
  cancelled: { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Cancelled' },
  failed: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Failed' },
};

// Interview type labels and icons
const typeConfig: Record<string, { label: string; icon: React.ElementType; bg: string; color: string }> = {
  behavioral: { label: 'Behavioral', icon: MessageSquare, bg: 'bg-blue-100', color: 'text-blue-600' },
  technical_theory: { label: 'Technical', icon: Brain, bg: 'bg-purple-100', color: 'text-purple-600' },
  mixed: { label: 'Mixed', icon: Star, bg: 'bg-lime-100', color: 'text-lime-600' },
  custom: { label: 'Custom', icon: Trophy, bg: 'bg-orange-100', color: 'text-orange-600' },
};

// Session Card Component - Light Theme
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
  const typeInfo = typeConfig[session.interview_type] || typeConfig.mixed;
  const TypeIcon = typeInfo.icon;
  const score = config?.feedback?.overall_score || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className="border border-gray-200 rounded-xl hover:shadow-md hover:border-gray-300 transition-all group">
        <CardContent className="p-5">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Type Icon */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeInfo.bg}`}>
                <TypeIcon className={`w-5 h-5 ${typeInfo.color}`} />
              </div>
              
              <div>
                <h3 className="text-gray-900 font-medium">
                  {typeInfo.label} Interview
                </h3>
                <p className="text-gray-500 text-sm">
                  {config?.job_role || 'General Practice'}
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {status.label}
            </div>
          </div>

          {/* Info Row */}
          <div className="flex items-center gap-5 text-sm text-gray-500 mb-4">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              {format(new Date(session.created_at), 'MMM d, yyyy')}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-400" />
              {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
            </div>
            {config?.num_questions && (
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                {config.num_questions} questions
              </div>
            )}
          </div>

          {/* Score and Actions */}
          <div className="flex items-center justify-between">
            {/* Score Display */}
            {score !== null ? (
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11">
                  <svg className="w-11 h-11 transform -rotate-90">
                    <circle
                      cx="22"
                      cy="22"
                      r="18"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="3"
                    />
                    <circle
                      cx="22"
                      cy="22"
                      r="18"
                      fill="none"
                      stroke={score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${(score / 100) * 113} 113`}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-gray-900 font-bold text-sm">
                    {score}
                  </span>
                </div>
                <div>
                  <p className="text-gray-900 font-medium text-sm">Score</p>
                  <p className="text-gray-500 text-xs">
                    {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Practice'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-sm">
                {session.status === 'in_progress' ? 'In progress...' : 'No score available'}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {session.status === 'in_progress' && onResume && (
                <Button
                  size="sm"
                  onClick={onResume}
                  className="bg-black text-white hover:bg-gray-800 gap-1.5"
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
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  View
                </Button>
              )}
              {(session.status === 'cancelled' || session.status === 'failed') && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
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
            className="h-32 rounded-xl bg-gray-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border border-gray-200 rounded-xl">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-gray-900 font-medium mb-2">Failed to load sessions</h3>
          <p className="text-gray-500 text-sm">Please try again later</p>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!sessions?.length) {
    return (
      <Card className="border-2 border-dashed border-gray-200 rounded-xl">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-lime-100 flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-lime-600" />
          </div>
          <h3 className="text-gray-900 font-semibold text-lg mb-2">No interviews yet</h3>
          <p className="text-gray-500 mb-6">Start your first mock interview to see your history here</p>
          <Button className="bg-black hover:bg-gray-900 text-white">
            Start Interview
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters (only show in full view) */}
      {showAll && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by job role..."
              className="pl-10 border-gray-200"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] border-gray-200">
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
              <SelectTrigger className="w-[140px] border-gray-200">
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

      {/* Sessions List */}
      <div className="space-y-3">
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
          <p className="text-gray-500">No sessions match your filters</p>
        </div>
      )}
    </div>
  );
};

export default SessionHistory;
