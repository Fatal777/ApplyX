/**
 * JobCard Component - Premium job listing card
 * Features: Glassmorphism, subtle gradients, smooth animations, no harsh borders
 */

import { motion } from 'framer-motion';
import { useState } from 'react';
import { 
  MapPin, 
  Building2, 
  Clock, 
  ExternalLink, 
  Briefcase,
  Sparkles,
  DollarSign,
  Globe,
  Bookmark,
  ArrowUpRight,
  CheckCircle2,
  Zap,
  GitCompare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Job } from '@/services/jobService';
import { jobService } from '@/services/jobService';
import { useJobStore } from '@/stores/jobStore';
import QuickApplyModal from './QuickApplyModal';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface JobCardProps {
  job: Job;
  index?: number;
  variant?: 'default' | 'compact' | 'featured' | 'list';
  onSelect?: (job: Job) => void;
  isSelected?: boolean;
}

const JobCard = ({ job, index = 0, variant = 'default', onSelect, isSelected }: JobCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showQuickApply, setShowQuickApply] = useState(false);
  const { toggleSaveJob, isJobSaved, addToCompare, removeFromCompare, isJobCompared } = useJobStore();
  const { toast } = useToast();
  
  const jobKey = job.job_id || `${job.title}-${job.company}`;
  const isBookmarked = isJobSaved(jobKey);
  const isCompared = isJobCompared(jobKey);
  
  const portalInfo = jobService.getPortalInfo(job.portal);
  const experienceColor = jobService.getExperienceColor(job.experience);
  const salary = jobService.formatSalary(job.salary_min, job.salary_max);
  
  const isRemote = job.is_remote || job.location?.toLowerCase().includes('remote');
  
  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        delay: index * 0.03,
        duration: 0.4,
        ease: [0.23, 1, 0.32, 1] as const
      }
    }
  };

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(job.redirect_url, '_blank', 'noopener,noreferrer');
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    const wasBookmarked = isBookmarked;
    toggleSaveJob(job);
    toast({
      title: wasBookmarked ? "Job removed from saved" : "Job saved!",
      description: wasBookmarked 
        ? `${job.title} at ${job.company} has been removed from your saved jobs`
        : `${job.title} at ${job.company} has been saved to your list`
    });
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCompared) {
      removeFromCompare(jobKey);
      toast({
        title: "Removed from comparison",
        description: `${job.title} removed from job comparison`
      });
    } else {
      addToCompare(job);
      toast({
        title: "Added to comparison",
        description: `${job.title} added to comparison list`
      });
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return 'from-[#c7ff6b] to-[#a8e063]';
    if (score >= 60) return 'from-blue-400 to-indigo-500';
    if (score >= 40) return 'from-amber-400 to-orange-500';
    return 'from-gray-300 to-gray-400';
  };

  // Compact variant for sidebars and lists
  if (variant === 'compact') {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        onClick={() => onSelect?.(job)}
        className="cursor-pointer group"
      >
        <div className={cn(
          "relative p-4 rounded-2xl transition-all duration-500",
          "bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl",
          "hover:bg-white dark:hover:bg-gray-900",
          "hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)]",
          isSelected && "bg-primary/5 ring-2 ring-primary/20"
        )}>
          <div className="flex items-start gap-3">
            {/* Company Icon */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
              {job.employer_logo ? (
                <img src={job.employer_logo} alt={job.company} className="w-6 h-6 rounded object-contain" />
              ) : (
                <Building2 className="w-5 h-5 text-primary" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground truncate text-sm group-hover:text-primary transition-colors">
                {job.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">{job.company}</p>
              <div className="flex items-center gap-2 mt-2">
                {isRemote && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">
                    Remote
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">{job.location}</span>
              </div>
            </div>
            
            {job.match_score && (
              <div className={cn(
                "w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center",
                getMatchColor(job.match_score)
              )}>
                <span className="text-[10px] font-bold text-white drop-shadow-sm">
                  {Math.round(job.match_score)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // List variant - horizontal card
  if (variant === 'list') {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={() => onSelect?.(job)}
        className="cursor-pointer"
      >
        <div className={cn(
          "relative p-5 rounded-2xl transition-all duration-500",
          "bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl",
          "hover:bg-white dark:hover:bg-gray-900",
          "shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]",
          "hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]",
          isSelected && "ring-2 ring-primary/30 bg-primary/5"
        )}>
          <div className="flex items-start gap-5">
            {/* Company Logo */}
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-500",
              "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900",
              isHovered && "shadow-lg scale-105"
            )}>
              {job.employer_logo ? (
                <img src={job.employer_logo} alt={job.company} className="w-10 h-10 rounded-lg object-contain" />
              ) : (
                <Building2 className="w-8 h-8 text-primary/70" />
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {portalInfo.name}
                    </span>
                    {isRemote && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 text-purple-600 dark:text-purple-400 font-medium">
                        <Globe className="w-3 h-3" />
                        Remote
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {job.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" />
                      {job.company}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </span>
                    {salary !== 'Not specified' && (
                      <span className="flex items-center gap-1.5 text-[#7fb832] dark:text-[#c7ff6b] font-semibold">
                        <DollarSign className="w-4 h-4" />
                        {salary}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Match Score & Actions */}
                <div className="flex items-center gap-3">
                  {job.match_score && job.match_score > 0 && (
                    <div className={cn(
                      "w-14 h-14 rounded-2xl bg-gradient-to-br flex flex-col items-center justify-center shadow-lg",
                      getMatchColor(job.match_score)
                    )}>
                      <Sparkles className="w-3.5 h-3.5 text-white/80 mb-0.5" />
                      <span className="text-sm font-bold text-white">{Math.round(job.match_score)}%</span>
                    </div>
                  )}
                  
                  <button 
                    onClick={handleBookmark}
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                      "bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700",
                      "hover:scale-110 active:scale-95",
                      isBookmarked && "bg-primary/10 text-primary"
                    )}
                  >
                    <motion.div
                      initial={false}
                      animate={{ 
                        scale: isBookmarked ? [1, 1.3, 1] : 1,
                        rotate: isBookmarked ? [0, -10, 0] : 0
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <Bookmark className={cn("w-5 h-5", isBookmarked && "fill-primary")} />
                    </motion.div>
                  </button>
                </div>
              </div>
              
              {/* Skills */}
              {job.skills && job.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {job.skills.slice(0, 6).map((skill, i) => (
                    <span 
                      key={i}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-300",
                        job.skill_matches?.map(s => s.toLowerCase()).includes(skill.toLowerCase())
                          ? "bg-[#c7ff6b]/20 text-[#7fb832] dark:text-[#c7ff6b]"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      )}
                    >
                      {skill}
                    </span>
                  ))}
                  {job.skills.length > 6 && (
                    <span className="text-xs px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                      +{job.skills.length - 6} more
                    </span>
                  )}
                </div>
              )}
              
              {/* Footer */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-xs px-3 py-1.5 rounded-full font-medium",
                    experienceColor
                  )}>
                    {job.experience || 'Any level'}
                  </span>
                  {job.posted_date && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {job.posted_date}
                    </span>
                  )}
                </div>
                
                <Button 
                  onClick={handleApply}
                  className="bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white transition-colors duration-200"
                >
                  Apply Now
                  <ArrowUpRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Featured variant - highlighted cards
  if (variant === 'featured') {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className="h-full"
      >
        <div className={cn(
          "relative h-full rounded-3xl overflow-hidden transition-all duration-500",
          "bg-gradient-to-br from-white via-white to-primary/5 dark:from-gray-900 dark:via-gray-900 dark:to-primary/10",
          "shadow-[0_8px_30px_-6px_rgba(0,0,0,0.08)]",
          "hover:shadow-[0_30px_60px_-15px_rgba(99,102,241,0.25)]",
          "group"
        )}>
          {/* Premium badge */}
          <div className="absolute top-0 right-0 overflow-hidden">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#c7ff6b] to-[#a8e063] blur-sm opacity-60" />
              <div className="relative bg-gradient-to-r from-[#c7ff6b] to-[#a8e063] text-black text-xs font-bold px-4 py-1.5 rounded-bl-2xl flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Featured
              </div>
            </div>
          </div>
          
          {/* Glow effect on hover */}
          <motion.div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 50% 0%, rgba(199, 255, 107, 0.1) 0%, transparent 50%)'
            }}
          />
          
          <div className="relative p-6 h-full flex flex-col">
            {/* Company logo */}
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all duration-500",
              "bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/5",
              isHovered && "scale-110 shadow-xl shadow-primary/10"
            )}>
              {job.employer_logo || job.company_logo ? (
                <img 
                  src={job.employer_logo || job.company_logo} 
                  alt={job.company}
                  className="w-10 h-10 object-contain rounded-lg"
                />
              ) : (
                <Building2 className="w-8 h-8 text-primary" />
              )}
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-bold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors duration-300">
                {job.title}
              </h3>
              
              <div className="space-y-2 mb-5">
                <p className="text-muted-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary/60" />
                  <span className="font-medium">{job.company}</span>
                </p>
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-primary/60" />
                  {job.location}
                  {isRemote && (
                    <span className="ml-2 px-2 py-0.5 text-[10px] rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-semibold">
                      Remote
                    </span>
                  )}
                </p>
                {salary !== 'Not specified' && (
                  <p className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-[#c7ff6b]" />
                    <span className="text-[#7fb832] dark:text-[#c7ff6b] font-bold">{salary}</span>
                  </p>
                )}
              </div>
              
              {/* Skills */}
              {job.skills && job.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {job.skills.slice(0, 4).map((skill, i) => (
                    <span 
                      key={i}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full font-medium",
                        job.skill_matches?.includes(skill.toLowerCase())
                          ? "bg-[#c7ff6b]/20 text-[#7fb832] dark:text-[#c7ff6b]"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      )}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between pt-5 border-t border-gray-100 dark:border-gray-800">
              <span className={cn(
                "text-xs px-3 py-1.5 rounded-full font-medium",
                experienceColor
              )}>
                <Briefcase className="w-3 h-3 inline mr-1" />
                {job.experience || 'Any level'}
              </span>
              
              <Button 
                onClick={handleApply}
                className="bg-gradient-to-r from-[#c7ff6b] to-[#a8e063] hover:from-[#b8f55a] hover:to-[#98d052] text-black font-bold transition-colors duration-200"
              >
                Apply
                <ExternalLink className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Default card variant - premium grid card
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => onSelect?.(job)}
      className="cursor-pointer h-full"
    >
      <div className={cn(
        "relative h-full rounded-2xl overflow-hidden transition-all duration-500",
        "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl",
        "shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]",
        "hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)]",
        "hover:-translate-y-1",
        "group",
        isSelected && "ring-2 ring-primary/30"
      )}>
        {/* Subtle gradient overlay on hover */}
        <motion.div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(199, 255, 107, 0.03) 100%)'
          }}
        />
        
        {/* Action buttons - absolute positioned */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <motion.button 
            onClick={handleCompare}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
              "bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm",
              "hover:bg-white dark:hover:bg-gray-800 hover:scale-110 active:scale-95",
              "shadow-lg hover:shadow-xl",
              isCompared && "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
            )}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              initial={false}
              animate={{ 
                scale: isCompared ? [1, 1.3, 1] : 1,
                rotate: isCompared ? [0, 10, 0] : 0
              }}
              transition={{ duration: 0.3 }}
            >
              <GitCompare className="w-5 h-5" />
            </motion.div>
          </motion.button>
          
          <motion.button 
            onClick={handleBookmark}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
              "bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm",
              "hover:bg-white dark:hover:bg-gray-800 hover:scale-110 active:scale-95",
              "shadow-lg hover:shadow-xl",
              isBookmarked && "bg-primary/10 text-primary"
            )}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              initial={false}
              animate={{ 
                scale: isBookmarked ? [1, 1.3, 1] : 1,
                rotate: isBookmarked ? [0, -10, 0] : 0
              }}
              transition={{ duration: 0.3 }}
            >
              <Bookmark className={cn("w-5 h-5", isBookmarked && "fill-primary")} />
            </motion.div>
          </motion.button>
        </div>
        
        <div className="relative p-5 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {portalInfo.name}
                </span>
                {isRemote && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 text-purple-600 dark:text-purple-400 font-semibold">
                    <Globe className="w-2.5 h-2.5" />
                    Remote
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-300">
                {job.title}
              </h3>
            </div>
            
            {/* Match score badge */}
            {job.match_score && job.match_score > 0 && (
              <motion.div 
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="flex-shrink-0"
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl bg-gradient-to-br flex flex-col items-center justify-center shadow-lg transition-all duration-300",
                  getMatchColor(job.match_score),
                  isHovered && "scale-110 shadow-xl"
                )}>
                  <Sparkles className="w-3.5 h-3.5 text-white/80 mb-0.5" />
                  <span className="text-sm font-bold text-white drop-shadow">{Math.round(job.match_score)}%</span>
                </div>
              </motion.div>
            )}
          </div>
          
          {/* Company & Location */}
          <div className="space-y-2 mb-4">
            <p className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                {job.employer_logo ? (
                  <img src={job.employer_logo} alt={job.company} className="w-5 h-5 rounded object-contain" />
                ) : (
                  <Building2 className="w-4 h-4 text-primary/70" />
                )}
              </span>
              <span className="font-semibold text-foreground text-sm">{job.company}</span>
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {job.location}
            </p>
            {salary !== 'Not specified' && (
              <p className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#c7ff6b]" />
                <span className="text-[#7fb832] dark:text-[#c7ff6b] font-bold">{salary}</span>
              </p>
            )}
          </div>
          
          {/* Description preview */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-grow">
            {job.description}
          </p>
          
          {/* Skills */}
          {job.skills && job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {job.skills.slice(0, 4).map((skill, i) => (
                <span 
                  key={i}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full font-medium transition-all duration-300",
                    job.skill_matches?.map(s => s.toLowerCase()).includes(skill.toLowerCase())
                      ? "bg-[#c7ff6b]/20 text-[#7fb832] dark:text-[#c7ff6b]"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  )}
                >
                  {job.skill_matches?.map(s => s.toLowerCase()).includes(skill.toLowerCase()) && (
                    <CheckCircle2 className="w-3 h-3 inline mr-1" />
                  )}
                  {skill}
                </span>
              ))}
              {job.skills.length > 4 && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                  +{job.skills.length - 4}
                </span>
              )}
            </div>
          )}
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-4 mt-auto border-t border-gray-100 dark:border-gray-800/50">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs px-2.5 py-1 rounded-full font-medium",
                experienceColor
              )}>
                {job.experience || 'Any level'}
              </span>
              {job.posted_date && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {job.posted_date}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQuickApply(true);
                }}
                size="sm"
                variant="outline"
                className={cn(
                  "font-semibold transition-all duration-300 group/quick",
                  "hover:bg-[#c7ff6b] hover:text-black hover:border-[#c7ff6b]"
                )}
              >
                <Zap className="w-3.5 h-3.5 mr-1.5 group-hover/quick:fill-black transition-all" />
                Quick
              </Button>
              <Button 
                onClick={handleApply}
                size="sm"
                className={cn(
                  "font-semibold transition-colors duration-200",
                  "bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90",
                  "text-white"
                )}
              >
                Apply
                <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Apply Modal */}
      <QuickApplyModal 
        isOpen={showQuickApply}
        onClose={() => setShowQuickApply(false)}
        job={job}
      />
    </motion.div>
  );
};

export default JobCard;
