/**
 * JobComparison Component - Side-by-side job comparison
 * Features: Compare up to 3 jobs, highlight differences, easy decision making
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Building2,
  MapPin,
  DollarSign,
  Briefcase,
  Clock,
  Globe,
  ExternalLink,
  X,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Job } from '@/services/jobService';
import { jobService } from '@/services/jobService';
import { useJobStore } from '@/stores/jobStore';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface JobComparisonProps {
  isOpen: boolean;
  onClose: () => void;
}

const JobComparison = ({ isOpen, onClose }: JobComparisonProps) => {
  const { comparedJobs, removeFromCompare, clearComparedJobs } = useJobStore();
  const { toast } = useToast();

  const handleApply = (job: Job) => {
    window.open(job.redirect_url, '_blank', 'noopener,noreferrer');
    toast({
      title: "Opening job portal",
      description: `Redirecting to ${job.company} application page`
    });
  };

  const handleRemove = (jobKey: string, jobTitle: string) => {
    removeFromCompare(jobKey);
    toast({
      title: "Removed from comparison",
      description: `${jobTitle} has been removed from the comparison`
    });
  };

  const handleClearAll = () => {
    clearComparedJobs();
    toast({
      title: "Comparison cleared",
      description: "All jobs have been removed from comparison"
    });
  };

  const formatSalary = (job: Job) => {
    return jobService.formatSalary(job.salary_min, job.salary_max);
  };

  const getExperienceColor = (experience?: string) => {
    return jobService.getExperienceColor(experience);
  };

  const getPortalInfo = (portal: string) => {
    return jobService.getPortalInfo(portal);
  };

  if (comparedJobs.length === 0) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Job Comparison
            </SheetTitle>
            <SheetDescription>
              Compare multiple jobs to make the best decision
            </SheetDescription>
          </SheetHeader>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Sparkles className="w-12 h-12 text-primary/50" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No Jobs to Compare</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              Click the compare icon on job cards to add them here for side-by-side comparison
            </p>
          </motion.div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-6xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                Job Comparison
              </SheetTitle>
              <SheetDescription>
                Comparing {comparedJobs.length} job{comparedJobs.length > 1 ? 's' : ''}
              </SheetDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="text-destructive hover:text-destructive"
            >
              Clear All
            </Button>
          </div>
        </SheetHeader>

        {/* Comparison Grid */}
        <div className={cn(
          "grid gap-4",
          comparedJobs.length === 1 && "grid-cols-1",
          comparedJobs.length === 2 && "grid-cols-1 md:grid-cols-2",
          comparedJobs.length === 3 && "grid-cols-1 md:grid-cols-3"
        )}>
          {comparedJobs.map((job, index) => {
            const jobKey = job.job_id || `${job.title}-${job.company}`;
            const salary = formatSalary(job);
            const portalInfo = getPortalInfo(job.portal);
            const experienceColor = getExperienceColor(job.experience);
            const isRemote = job.is_remote || job.location?.toLowerCase().includes('remote');

            return (
              <motion.div
                key={jobKey}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800"
              >
                {/* Remove Button */}
                <button
                  onClick={() => handleRemove(jobKey, job.title)}
                  className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm flex items-center justify-center hover:bg-destructive hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Job Header */}
                <div className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-start gap-4 mb-4">
                    {job.employer_logo && (
                      <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
                        <img src={job.employer_logo} alt={job.company} className="w-10 h-10 object-contain" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-primary uppercase tracking-wide">
                        {portalInfo.name}
                      </span>
                      <h3 className="text-lg font-bold text-foreground mt-1 line-clamp-2">
                        {job.title}
                      </h3>
                    </div>
                  </div>

                  {job.match_score && job.match_score > 0 && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#c7ff6b] to-[#a8e063] text-black text-sm font-bold">
                      <Sparkles className="w-4 h-4" />
                      {Math.round(job.match_score)}% Match
                    </div>
                  )}
                </div>

                {/* Job Details */}
                <div className="p-5 space-y-4">
                  {/* Company */}
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-xs text-muted-foreground">Company</span>
                      <p className="font-semibold text-foreground">{job.company}</p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-xs text-muted-foreground">Location</span>
                      <p className="font-semibold text-foreground">{job.location}</p>
                      {isRemote && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium mt-1">
                          <Globe className="w-3 h-3" />
                          Remote
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Salary */}
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-[#c7ff6b] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-xs text-muted-foreground">Salary</span>
                      <p className="font-bold text-[#7fb832] dark:text-[#c7ff6b]">
                        {salary}
                      </p>
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-xs text-muted-foreground">Experience</span>
                      <p className={cn("font-semibold inline-block px-3 py-1 rounded-full text-sm mt-1", experienceColor)}>
                        {job.experience || 'Any level'}
                      </p>
                    </div>
                  </div>

                  {/* Posted Date */}
                  {job.posted_date && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-xs text-muted-foreground">Posted</span>
                        <p className="font-semibold text-foreground">{job.posted_date}</p>
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {job.skills && job.skills.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground mb-2 block">Skills Required</span>
                      <div className="flex flex-wrap gap-1.5">
                        {job.skills.slice(0, 6).map((skill, i) => (
                          <span
                            key={i}
                            className={cn(
                              "text-xs px-2.5 py-1 rounded-full font-medium",
                              job.skill_matches?.map(s => s.toLowerCase()).includes(skill.toLowerCase())
                                ? "bg-[#c7ff6b]/20 text-[#7fb832] dark:text-[#c7ff6b] flex items-center gap-1"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                            )}
                          >
                            {job.skill_matches?.map(s => s.toLowerCase()).includes(skill.toLowerCase()) && (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            {skill}
                          </span>
                        ))}
                        {job.skills.length > 6 && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                            +{job.skills.length - 6}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Apply Button */}
                <div className="p-5 border-t border-gray-100 dark:border-gray-800">
                  <Button
                    onClick={() => handleApply(job)}
                    className="w-full bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 transition-colors duration-200"
                  >
                    Apply Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Add More Jobs */}
        {comparedJobs.length < 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-center"
          >
            <p className="text-sm text-muted-foreground">
              You can compare up to 3 jobs. Add {3 - comparedJobs.length} more job{3 - comparedJobs.length > 1 ? 's' : ''} for comparison.
            </p>
          </motion.div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default JobComparison;
