/**
 * JobSearch Component - Premium search bar with advanced filters
 * Features: Glassmorphism search bar, animated filters, suggestions, recent searches
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  X,
  Clock,
  Sparkles,
  ChevronDown,
  Briefcase,
  Globe,
  Building2,
  Loader2,
  TrendingUp,
  Zap,
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useJobStore, ExperienceLevel, Portal } from '@/stores/jobStore';
import { cn } from '@/lib/utils';

interface JobSearchProps {
  variant?: 'hero' | 'compact' | 'inline';
  onSearch?: () => void;
  showFilters?: boolean;
  placeholder?: string;
  className?: string;
}

const popularSearches = [
  { label: 'Python Developer', icon: 'PY' },
  { label: 'React Frontend', icon: 'RE' },
  { label: 'Data Scientist', icon: 'DS' },
  { label: 'Full Stack', icon: 'FS' },
  { label: 'Machine Learning', icon: 'ML' },
  { label: 'DevOps Engineer', icon: 'DO' },
];

const jobSuggestions = [
  'Software Engineer', 'Senior Software Engineer', 'Frontend Developer',
  'Backend Developer', 'Full Stack Developer', 'React Developer', 'Node.js Developer',
  'Data Scientist', 'Data Analyst', 'Machine Learning Engineer', 'AI Engineer',
  'Product Manager', 'Senior Product Manager', 'Technical Product Manager',
  'UI/UX Designer', 'Graphic Designer', 'Product Designer',
  'DevOps Engineer', 'Cloud Engineer', 'Site Reliability Engineer',
  'QA Engineer', 'Test Engineer', 'Automation Engineer',
  'Business Analyst', 'Financial Analyst', 'Marketing Manager',
  'Content Writer', 'Technical Writer', 'Copywriter',
  'Sales Executive', 'Account Manager', 'Customer Success Manager',
];

const locations = [
  { value: 'India', label: 'India' },
  { value: 'Bangalore', label: 'Bangalore' },
  { value: 'Mumbai', label: 'Mumbai' },
  { value: 'Delhi', label: 'Delhi NCR' },
  { value: 'Hyderabad', label: 'Hyderabad' },
  { value: 'Chennai', label: 'Chennai' },
  { value: 'Pune', label: 'Pune' },
  { value: 'Remote', label: 'Remote Only' },
];

const JobSearch = ({
  variant = 'hero',
  onSearch,
  showFilters = true,
  placeholder = 'Job title, skills, or company...',
  className
}: JobSearchProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    searchQuery,
    setSearchQuery,
    searchJobs,
    isSearching,
    filters,
    setFilters,
    resetFilters,
    recentSearches,
    clearRecentSearches,
  } = useJobStore();

  // Filter suggestions based on query
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matches = jobSuggestions
        .filter(suggestion => suggestion.toLowerCase().includes(query))
        .slice(0, 5);
      setFilteredSuggestions(matches);
    } else {
      setFilteredSuggestions([]);
    }
  }, [searchQuery]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setShowSuggestions(false);
    await searchJobs();
    onSearch?.();
  }, [searchQuery, searchJobs, onSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = async (query: string) => {
    setSearchQuery(query);
    setShowSuggestions(false);
    await searchJobs({ keywords: query });
    onSearch?.();
  };

  const activeFiltersCount = [
    filters.experienceLevel !== 'all',
    filters.portal !== 'all',
    filters.remoteOnly,
  ].filter(Boolean).length;

  // Hero variant - large search for landing/hero sections
  if (variant === 'hero') {
    return (
      <div ref={containerRef} className={cn("w-full max-w-4xl mx-auto", className)}>
        {/* Main Search Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          {/* Glow effect */}
          <div className={cn(
            "absolute -inset-1 rounded-3xl opacity-0 transition-opacity duration-500 blur-xl",
            "bg-gradient-to-r from-[#c7ff6b]/40 via-primary/30 to-[#c7ff6b]/40",
            isFocused && "opacity-100"
          )} />

          {/* Search bar */}
          <div className={cn(
            "relative rounded-2xl transition-all duration-500",
            "bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl",
            "shadow-[0_8px_40px_-8px_rgba(0,0,0,0.15)]",
            isFocused && "shadow-[0_20px_60px_-15px_rgba(99,102,241,0.3)]"
          )}>
            <div className="flex flex-col md:flex-row">
              {/* Job Search Input */}
              <div className="flex-1 p-2 md:p-3">
                <div className="flex items-center gap-3 px-4 py-3">
                  <Search className={cn(
                    "w-5 h-5 transition-colors duration-300",
                    isFocused ? "text-primary" : "text-gray-400"
                  )} />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={placeholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => { setIsFocused(true); setShowSuggestions(true); }}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent text-lg font-medium text-foreground placeholder:text-gray-400 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px bg-gray-200 dark:bg-gray-700 my-4" />

              {/* Location Select */}
              <div className="flex-shrink-0 p-2 md:p-3 border-t md:border-t-0 border-gray-100 dark:border-gray-800">
                <Select
                  value={filters.location}
                  onValueChange={(value) => setFilters({ location: value })}
                >
                  <SelectTrigger className="w-full md:w-[200px] h-[52px] border-0 bg-transparent shadow-none focus:ring-0 text-base font-medium">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-primary" />
                      <SelectValue placeholder="Location" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {locations.map((loc) => (
                      <SelectItem
                        key={loc.value}
                        value={loc.value}
                        className="py-3 cursor-pointer"
                      >
                        <span>{loc.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Button */}
              <div className="p-2 md:p-3">
                <Button
                  onClick={handleSearch}
                  disabled={isSearching}
                  size="lg"
                  className={cn(
                    "w-full md:w-auto h-[52px] px-8 rounded-xl font-bold text-base",
                    "bg-gradient-to-r from-primary to-indigo-600",
                    "hover:from-primary/90 hover:to-indigo-600/90",
                    "transition-colors duration-200"
                  )}
                >
                  {isSearching ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Search Jobs
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Suggestions dropdown */}
          <AnimatePresence>
            {showSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 right-0 mt-3 p-5 rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] z-50"
              >
                {/* Autocomplete Suggestions */}
                {searchQuery && filteredSuggestions.length > 0 && (
                  <div className="mb-5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                      <Zap className="w-3.5 h-3.5" />
                      Suggestions
                    </span>
                    <div className="space-y-1">
                      {filteredSuggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-primary/10 transition-all duration-200 group"
                        >
                          <Search className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="flex-1 text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                            {suggestion}
                          </span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Searches */}
                {!searchQuery && recentSearches.length > 0 && (
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        Recent Searches
                      </span>
                      <button
                        onClick={clearRecentSearches}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.slice(0, 5).map((search, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(search)}
                          className="px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-300"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular Searches */}
                {!searchQuery && (
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Popular Searches
                    </span>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {popularSearches.map((item, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(item.label)}
                          className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-primary/10 transition-all duration-300 group"
                        >
                          <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{item.icon}</span>
                          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Filter Pills */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-3 mt-6"
          >
            {/* Experience Filter */}
            <Select
              value={filters.experienceLevel}
              onValueChange={(value) => setFilters({ experienceLevel: value as ExperienceLevel })}
            >
              <SelectTrigger className={cn(
                "w-auto h-10 rounded-full px-4 gap-2",
                "bg-white/20 backdrop-blur-md border-white/30",
                "text-white hover:bg-white/30 transition-all",
                filters.experienceLevel !== 'all' && "bg-white/40 border-accent/50"
              )}>
                <Briefcase className="w-4 h-4" />
                <SelectValue placeholder="Experience" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="fresher">Entry Level (0-2 yrs)</SelectItem>
                <SelectItem value="mid">Mid Level (2-5 yrs)</SelectItem>
                <SelectItem value="senior">Senior (5+ yrs)</SelectItem>
              </SelectContent>
            </Select>

            {/* Portal Filter */}
            <Select
              value={filters.portal}
              onValueChange={(value) => setFilters({ portal: value as Portal })}
            >
              <SelectTrigger className={cn(
                "w-auto h-10 rounded-full px-4 gap-2",
                "bg-white/20 backdrop-blur-md border-white/30",
                "text-white hover:bg-white/30 transition-all",
                filters.portal !== 'all' && "bg-white/40 border-accent/50"
              )}>
                <Building2 className="w-4 h-4" />
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="adzuna">Adzuna</SelectItem>
                <SelectItem value="jsearch">JSearch</SelectItem>
                <SelectItem value="remotive">Remotive</SelectItem>
                <SelectItem value="greenhouse">Greenhouse</SelectItem>
                <SelectItem value="lever">Lever</SelectItem>
                <SelectItem value="workday">Workday</SelectItem>
                <SelectItem value="smartrecruiters">SmartRecruiters</SelectItem>
                <SelectItem value="ashby">Ashby</SelectItem>
              </SelectContent>
            </Select>

            {/* Remote Toggle */}
            <button
              onClick={() => setFilters({ remoteOnly: !filters.remoteOnly })}
              className={cn(
                "h-10 px-4 rounded-full flex items-center gap-2 transition-all",
                "bg-white/20 backdrop-blur-md border border-white/30",
                "text-white hover:bg-white/30",
                filters.remoteOnly && "bg-[#c7ff6b]/30 border-[#c7ff6b]/50 text-[#c7ff6b]"
              )}
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">Remote Only</span>
            </button>

            {/* Reset Filters */}
            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="h-10 px-4 rounded-full flex items-center gap-2 bg-white/10 text-white/80 hover:text-white hover:bg-white/20 transition-all"
              >
                <X className="w-4 h-4" />
                <span className="text-sm">Clear ({activeFiltersCount})</span>
              </button>
            )}
          </motion.div>
        )}
      </div>
    );
  }

  // Compact variant - for headers/sidebars
  if (variant === 'compact') {
    return (
      <div ref={containerRef} className={cn("relative", className)}>
        <div className={cn(
          "flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-300",
          "bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm",
          "focus-within:bg-white dark:focus-within:bg-gray-900",
          "focus-within:shadow-lg focus-within:ring-2 focus-within:ring-primary/20"
        )}>
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm font-medium placeholder:text-muted-foreground focus:outline-none"
          />
          {isSearching ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Inline variant - for page headers
  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      <div className={cn(
        "flex flex-col lg:flex-row gap-4 p-4 rounded-2xl transition-all duration-300",
        "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl",
        "shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]"
      )}>
        {/* Search Input */}
        <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-100/80 dark:bg-gray-800/80">
          <Search className={cn(
            "w-5 h-5",
            isFocused ? "text-primary" : "text-muted-foreground"
          )} />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent font-medium placeholder:text-muted-foreground focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Location Select */}
        <Select
          value={filters.location}
          onValueChange={(value) => setFilters({ location: value })}
        >
          <SelectTrigger className="w-full lg:w-[180px] h-12 rounded-xl bg-gray-100/80 dark:bg-gray-800/80 border-0">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <SelectValue placeholder="Location" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc.value} value={loc.value}>
                <span>{loc.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* More Filters Toggle */}
        <Button
          variant="outline"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={cn(
            "h-12 rounded-xl gap-2",
            showAdvancedFilters && "bg-primary/10 border-primary/30"
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFiltersCount > 0 && (
            <span className="ml-1 w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>

        {/* Search Button */}
        <Button
          onClick={handleSearch}
          disabled={isSearching}
          className="h-12 px-6 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 transition-colors duration-200"
        >
          {isSearching ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Search className="w-5 h-5 mr-2" />
              Search
            </>
          )}
        </Button>
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-4 p-4 mt-3 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
              {/* Experience Level */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Experience:</span>
                <Select
                  value={filters.experienceLevel}
                  onValueChange={(value) => setFilters({ experienceLevel: value as ExperienceLevel })}
                >
                  <SelectTrigger className="w-[160px] h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="fresher">Entry Level</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Portal */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Source:</span>
                <Select
                  value={filters.portal}
                  onValueChange={(value) => setFilters({ portal: value as Portal })}
                >
                  <SelectTrigger className="w-[160px] h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="adzuna">Adzuna</SelectItem>
                    <SelectItem value="jsearch">JSearch</SelectItem>
                    <SelectItem value="remotive">Remotive</SelectItem>
                    <SelectItem value="greenhouse">Greenhouse</SelectItem>
                    <SelectItem value="lever">Lever</SelectItem>
                    <SelectItem value="workday">Workday</SelectItem>
                    <SelectItem value="smartrecruiters">SmartRecruiters</SelectItem>
                    <SelectItem value="ashby">Ashby</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Remote Toggle */}
              <div className="flex items-center gap-3">
                <Switch
                  id="remote-only"
                  checked={filters.remoteOnly}
                  onCheckedChange={(checked) => setFilters({ remoteOnly: checked })}
                />
                <Label htmlFor="remote-only" className="text-sm font-medium cursor-pointer">
                  Remote Only
                </Label>
              </div>

              {/* Reset */}
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4 mr-1" />
                  Reset filters
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JobSearch;
