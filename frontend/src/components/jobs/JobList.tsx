/**
 * JobList Component - Premium job grid/list display
 * Features: View toggle, skeleton loading, empty states, smooth animations
 */

import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutGrid, 
  List, 
  Briefcase,
  Search,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Filter,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import JobCard from './JobCard';
import { Job } from '@/services/jobService';
import { useJobStore } from '@/stores/jobStore';
import { cn } from '@/lib/utils';

interface JobListProps {
  jobs: Job[];
  isLoading?: boolean;
  variant?: 'default' | 'recommendations';
  title?: string;
  subtitle?: string;
  showViewToggle?: boolean;
  showSorting?: boolean;
  emptyMessage?: string;
  emptyAction?: () => void;
  emptyActionLabel?: string;
  onJobSelect?: (job: Job) => void;
  selectedJobId?: string;
  className?: string;
}

const JobListSkeleton = ({ count = 6, viewMode }: { count?: number; viewMode: 'grid' | 'list' }) => {
  return (
    <div className={cn(
      viewMode === 'grid' 
        ? "grid md:grid-cols-2 xl:grid-cols-3 gap-5" 
        : "space-y-4"
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-5 animate-pulse"
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1">
              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded-full mb-3" />
              <div className="h-5 w-full bg-gray-200 dark:bg-gray-700 rounded-lg mb-1" />
              <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
            <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          </div>
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-lg mb-2" />
          <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4" />
          <div className="flex gap-2 mb-4">
            <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-7 w-14 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
        </motion.div>
      ))}
    </div>
  );
};

const EmptyState = ({ 
  variant, 
  message, 
  onAction, 
  actionLabel 
}: { 
  variant: 'search' | 'recommendations';
  message: string;
  onAction?: () => void;
  actionLabel?: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      {/* Animated illustration */}
      <div className="relative mb-8">
        <motion.div 
          className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          {variant === 'search' ? (
            <Search className="w-14 h-14 text-primary/50" />
          ) : (
            <Sparkles className="w-14 h-14 text-primary/50" />
          )}
        </motion.div>
        <motion.div 
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#c7ff6b]/20 flex items-center justify-center"
          animate={{ y: [0, -5, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Briefcase className="w-4 h-4 text-[#7fb832]" />
        </motion.div>
      </div>
      
      <h3 className="text-2xl font-bold text-foreground mb-3">
        {variant === 'search' ? 'No jobs found' : 'No recommendations yet'}
      </h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        {message}
      </p>
      
      {onAction && actionLabel && (
        <Button 
          onClick={onAction}
          className="bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 transition-colors duration-200"
        >
          {variant === 'search' ? (
            <RefreshCw className="w-4 h-4 mr-2" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
};

const JobList = ({
  jobs,
  isLoading = false,
  variant = 'default',
  title,
  subtitle,
  showViewToggle = true,
  showSorting = true,
  emptyMessage = 'Try adjusting your search terms or filters to find more opportunities.',
  emptyAction,
  emptyActionLabel = 'Clear filters',
  onJobSelect,
  selectedJobId,
  className,
}: JobListProps) => {
  const { viewMode, setViewMode } = useJobStore();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { 
        staggerChildren: 0.03,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.23, 1, 0.32, 1] as const
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      {(title || showViewToggle || showSorting) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            {title && (
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-foreground">{title}</h2>
                {jobs.length > 0 && (
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                    {jobs.length} jobs
                  </span>
                )}
              </div>
            )}
            {subtitle && (
              <p className="text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Sorting */}
            {showSorting && jobs.length > 0 && (
              <Select defaultValue="relevance">
                <SelectTrigger className="w-[160px] h-10 rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="Sort by" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="date">Most Recent</SelectItem>
                  <SelectItem value="salary">Highest Salary</SelectItem>
                  <SelectItem value="match">Best Match</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {/* View Toggle */}
            {showViewToggle && jobs.length > 0 && (
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded-lg transition-all duration-300",
                    viewMode === 'grid' 
                      ? "bg-primary text-white shadow-md" 
                      : "text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded-lg transition-all duration-300",
                    viewMode === 'list' 
                      ? "bg-primary text-white shadow-md" 
                      : "text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Loading State */}
      {isLoading && (
        <JobListSkeleton count={6} viewMode={viewMode} />
      )}
      
      {/* Empty State */}
      {!isLoading && jobs.length === 0 && (
        <EmptyState
          variant={variant === 'recommendations' ? 'recommendations' : 'search'}
          message={emptyMessage}
          onAction={emptyAction}
          actionLabel={emptyActionLabel}
        />
      )}
      
      {/* Job Cards */}
      {!isLoading && jobs.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={cn(
            viewMode === 'grid' 
              ? "grid md:grid-cols-2 xl:grid-cols-3 gap-5" 
              : "space-y-4"
          )}
        >
          <AnimatePresence mode="popLayout">
            {jobs.map((job, index) => (
              <motion.div
                key={job.job_id || `${job.title}-${job.company}-${index}`}
                variants={itemVariants}
                layout
              >
                <JobCard
                  job={job}
                  index={index}
                  variant={viewMode === 'list' ? 'list' : 'default'}
                  onSelect={onJobSelect}
                  isSelected={selectedJobId === job.job_id}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      
      {/* Load More Button */}
      {!isLoading && jobs.length >= 20 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center mt-10"
        >
          <Button
            variant="outline"
            size="lg"
            className="rounded-xl px-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-900 transition-all duration-300"
          >
            Load More Jobs
            <ChevronDown className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default JobList;
