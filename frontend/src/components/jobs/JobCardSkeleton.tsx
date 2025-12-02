/**
 * JobCardSkeleton - Loading skeleton for job cards
 * Provides visual feedback during search loading
 */

import { cn } from '@/lib/utils';

interface JobCardSkeletonProps {
  variant?: 'grid' | 'list';
  className?: string;
}

const JobCardSkeleton = ({ variant = 'grid', className }: JobCardSkeletonProps) => {
  if (variant === 'list') {
    return (
      <div className={cn(
        "flex items-start gap-4 p-4 rounded-xl bg-white/80 dark:bg-gray-900/80",
        "animate-pulse",
        className
      )}>
        {/* Company logo */}
        <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
        
        {/* Content */}
        <div className="flex-1 space-y-3">
          {/* Title */}
          <div className="h-5 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
          
          {/* Company & Location */}
          <div className="flex items-center gap-4">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          
          {/* Skills */}
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-6 w-14 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex flex-col items-end gap-2">
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  // Grid variant
  return (
    <div className={cn(
      "p-5 rounded-2xl bg-white/80 dark:bg-gray-900/80",
      "animate-pulse",
      className
    )}>
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
      
      {/* Location & Type */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      
      {/* Description */}
      <div className="space-y-2 mb-4">
        <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 w-5/6 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 w-4/6 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      
      {/* Skills */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="h-6 w-14 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="h-6 w-18 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    </div>
  );
};

interface JobListSkeletonProps {
  count?: number;
  variant?: 'grid' | 'list';
}

export const JobListSkeleton = ({ count = 6, variant = 'grid' }: JobListSkeletonProps) => {
  return (
    <div className={cn(
      variant === 'grid' 
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        : "space-y-3"
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <JobCardSkeleton key={i} variant={variant} />
      ))}
    </div>
  );
};

export default JobCardSkeleton;
