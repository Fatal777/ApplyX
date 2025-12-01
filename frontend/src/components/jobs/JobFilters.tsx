/**
 * JobFilters Component - Premium filter sidebar
 * Features: Glassmorphism, animated toggles, skill chips, salary range
 */

import { motion, AnimatePresence } from 'framer-motion';
import { 
  SlidersHorizontal,
  Briefcase,
  MapPin,
  Globe,
  Building2,
  DollarSign,
  Clock,
  X,
  ChevronDown,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useJobStore, ExperienceLevel, Portal } from '@/stores/jobStore';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface JobFiltersProps {
  className?: string;
  variant?: 'sidebar' | 'sheet' | 'inline';
  onClose?: () => void;
}

const experienceLevels = [
  { value: 'all', label: 'All Levels', description: 'Show all jobs' },
  { value: 'fresher', label: 'Entry Level', description: '0-2 years' },
  { value: 'mid', label: 'Mid Level', description: '2-5 years' },
  { value: 'senior', label: 'Senior', description: '5+ years' },
];

const jobSources = [
  { value: 'all', label: 'All Sources', icon: '🌐' },
  { value: 'adzuna', label: 'Adzuna', icon: '🔍' },
  { value: 'jsearch', label: 'JSearch', icon: '💼' },
  { value: 'remotive', label: 'Remotive', icon: '🏠' },
];

const popularSkills = [
  'Python', 'JavaScript', 'React', 'Node.js', 'TypeScript',
  'Java', 'AWS', 'Docker', 'SQL', 'Machine Learning'
];

const JobFilters = ({ className, variant = 'sidebar', onClose }: JobFiltersProps) => {
  const { filters, setFilters, resetFilters } = useJobStore();
  const [expandedSections, setExpandedSections] = useState<string[]>(['experience', 'source', 'type']);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const activeFiltersCount = [
    filters.experienceLevel !== 'all',
    filters.portal !== 'all',
    filters.remoteOnly,
    selectedSkills.length > 0,
  ].filter(Boolean).length;

  const handleReset = () => {
    resetFilters();
    setSelectedSkills([]);
  };

  const FilterSection = ({ 
    id, 
    title, 
    icon: Icon, 
    children 
  }: { 
    id: string; 
    title: string; 
    icon: React.ElementType; 
    children: React.ReactNode 
  }) => {
    const isExpanded = expandedSections.includes(id);
    
    return (
      <div className="border-b border-gray-100 dark:border-gray-800/50 last:border-0">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between py-4 px-1 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground">{title}</span>
          </div>
          <ChevronDown className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-300",
            isExpanded && "rotate-180"
          )} />
        </button>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="pb-4 px-1">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className={cn(
      "rounded-2xl overflow-hidden",
      "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl",
      "shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Filters</h3>
            {activeFiltersCount > 0 && (
              <p className="text-xs text-muted-foreground">{activeFiltersCount} active</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          )}
          {variant === 'sheet' && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Filter Sections */}
      <div className="p-4">
        {/* Job Type / Remote */}
        <FilterSection id="type" title="Job Type" icon={Globe}>
          <div className="space-y-3">
            <div 
              onClick={() => setFilters({ remoteOnly: !filters.remoteOnly })}
              className={cn(
                "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300",
                filters.remoteOnly 
                  ? "bg-[#c7ff6b]/20 ring-2 ring-[#c7ff6b]/30"
                  : "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🏠</span>
                <div>
                  <p className="font-medium text-sm">Remote Only</p>
                  <p className="text-xs text-muted-foreground">Work from anywhere</p>
                </div>
              </div>
              <Switch 
                checked={filters.remoteOnly}
                onCheckedChange={(checked) => setFilters({ remoteOnly: checked })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {['Full-time', 'Part-time', 'Contract', 'Internship'].map((type) => (
                <button
                  key={type}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                    "bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400",
                    "hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </FilterSection>
        
        {/* Experience Level */}
        <FilterSection id="experience" title="Experience Level" icon={Briefcase}>
          <div className="space-y-2">
            {experienceLevels.map((level) => (
              <button
                key={level.value}
                onClick={() => setFilters({ experienceLevel: level.value as ExperienceLevel })}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl transition-all duration-300",
                  filters.experienceLevel === level.value
                    ? "bg-primary/10 ring-2 ring-primary/20"
                    : "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <div className="text-left">
                  <p className={cn(
                    "font-medium text-sm",
                    filters.experienceLevel === level.value ? "text-primary" : "text-foreground"
                  )}>
                    {level.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{level.description}</p>
                </div>
                {filters.experienceLevel === level.value && (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        </FilterSection>
        
        {/* Job Source */}
        <FilterSection id="source" title="Job Source" icon={Building2}>
          <div className="grid grid-cols-2 gap-2">
            {jobSources.map((source) => (
              <button
                key={source.value}
                onClick={() => setFilters({ portal: source.value as Portal })}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300",
                  filters.portal === source.value
                    ? "bg-primary/10 ring-2 ring-primary/20"
                    : "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <span className="text-2xl">{source.icon}</span>
                <span className={cn(
                  "text-xs font-medium",
                  filters.portal === source.value ? "text-primary" : "text-foreground"
                )}>
                  {source.label}
                </span>
              </button>
            ))}
          </div>
        </FilterSection>
        
        {/* Skills */}
        <FilterSection id="skills" title="Skills" icon={Sparkles}>
          <div className="flex flex-wrap gap-2">
            {popularSkills.map((skill) => (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
                  selectedSkills.includes(skill)
                    ? "bg-[#c7ff6b]/20 text-[#7fb832] dark:text-[#c7ff6b] ring-1 ring-[#c7ff6b]/30"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                {selectedSkills.includes(skill) && (
                  <CheckCircle2 className="w-3 h-3 inline mr-1" />
                )}
                {skill}
              </button>
            ))}
          </div>
          {selectedSkills.length > 0 && (
            <button
              onClick={() => setSelectedSkills([])}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear skills ({selectedSkills.length})
            </button>
          )}
        </FilterSection>
        
        {/* Salary Range */}
        <FilterSection id="salary" title="Salary Range" icon={DollarSign}>
          <div className="space-y-4">
            <div className="px-2">
              <Slider
                defaultValue={[filters.salaryMin / 100000, filters.salaryMax / 100000]}
                max={50}
                step={1}
                value={[filters.salaryMin / 100000, filters.salaryMax / 100000]}
                onValueChange={(value) => {
                  setFilters({
                    salaryMin: value[0] * 100000,
                    salaryMax: value[1] * 100000,
                  });
                }}
                className="w-full"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">Min: </span>
                <span className="font-semibold text-foreground">
                  ₹{(filters.salaryMin / 100000).toFixed(0)} LPA
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Max: </span>
                <span className="font-semibold text-foreground">
                  ₹{(filters.salaryMax / 100000).toFixed(0)}{filters.salaryMax >= 5000000 ? '+' : ''} LPA
                </span>
              </div>
            </div>
          </div>
        </FilterSection>
        
        {/* Posted Date */}
        <FilterSection id="date" title="Posted Date" icon={Clock}>
          <div className="space-y-2">
            {['Last 24 hours', 'Last 7 days', 'Last 30 days', 'Any time'].map((option, i) => (
              <button
                key={i}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-300",
                  i === 1 
                    ? "bg-primary/10 text-primary font-medium"
                    : "bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </FilterSection>
      </div>
      
      {/* Apply Filters Button (for sheet variant) */}
      {variant === 'sheet' && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-800/50">
          <Button
            onClick={onClose}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 font-bold"
          >
            Apply Filters
            {activeFiltersCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default JobFilters;
