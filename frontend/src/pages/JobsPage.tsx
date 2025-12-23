/**
 * Jobs Page - Premium job search platform
 * Features: Hero search, category browse, featured jobs, AI recommendations CTA
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Sparkles,
  TrendingUp,
  Star,
  Building2,
  ArrowRight,
  FileText,
  Zap,
  Target,
  Users,
  ChevronRight,
  Globe,
  Code,
  BarChart3,
  Palette,
  Server,
  Megaphone,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/use-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { JobSearch, JobList, JobCard, JobFilters, JobComparison } from '@/components/jobs';
import { useJobStore } from '@/stores/jobStore';
import { jobService, Job } from '@/services/jobService';
import { cn } from '@/lib/utils';

const JobsPage = () => {
  const [activeTab, setActiveTab] = useState<'search' | 'trending'>('search');
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const jobsPerPage = 25;
  const { toast } = useToast();

  const {
    searchResults,
    isSearching,
    searchError,
    searchQuery,
    searchJobs,
    filters,
    comparedJobs,
  } = useJobStore();

  // Load all jobs on mount
  useEffect(() => {
    const loadAllJobs = async () => {
      try {
        setIsInitialLoading(true);
        const response = await jobService.searchJobs({
          keywords: '',  // Empty to get all jobs
          location: 'India',
          limit: 100,  // Load 100 jobs
          skipAbort: true,
        });
        setAllJobs(response.jobs);
      } catch (error) {
        if ((error as Error).message === 'Search cancelled') {
          return;
        }
        console.error('Failed to load jobs:', error);
        toast({
          title: "Failed to load jobs",
          description: "Please refresh the page",
          variant: "destructive",
        });
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadAllJobs();
  }, []);

  // Pagination logic
  const totalPages = Math.ceil(allJobs.length / jobsPerPage);
  const paginatedJobs = allJobs.slice(
    (currentPage - 1) * jobsPerPage,
    currentPage * jobsPerPage
  );

  const stats = [
    { value: '500+', label: 'Active Jobs', icon: Briefcase },
    { value: '50+', label: 'Companies', icon: Building2 },
    { value: '5', label: 'Job Sources', icon: Globe },
    { value: '120+', label: 'Hired', icon: Users },
  ];

  const jobCategories = [
    { name: 'Software Engineering', count: '2,500+', icon: Code, query: 'software engineer', gradient: 'from-blue-500 to-indigo-600' },
    { name: 'Data Science', count: '1,800+', icon: BarChart3, query: 'data scientist', gradient: 'from-purple-500 to-pink-600' },
    { name: 'Product Management', count: '950+', icon: Target, query: 'product manager', gradient: 'from-green-500 to-emerald-600' },
    { name: 'Design', count: '720+', icon: Palette, query: 'ui ux designer', gradient: 'from-orange-500 to-red-600' },
    { name: 'DevOps', count: '1,200+', icon: Server, query: 'devops engineer', gradient: 'from-cyan-500 to-blue-600' },
    { name: 'Marketing', count: '890+', icon: Megaphone, query: 'digital marketing', gradient: 'from-rose-500 to-pink-600' },
  ];

  const handleCategoryClick = async (query: string) => {
    useJobStore.getState().setSearchQuery(query);
    toast({
      title: "Searching jobs",
      description: `Finding ${query} opportunities...`,
    });
    await searchJobs({ keywords: query });
  };

  const hasSearchResults = searchResults.length > 0 || isSearching;

  return (
    <div className="min-h-screen bg-gray-50 font-outfit">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden pt-20 bg-gradient-to-br from-primary via-primary to-[#4338ca] text-white">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -top-1/2 -right-1/2 w-full h-full bg-[#c7ff6b]/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.1, 0.15, 0.1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-white/10 rounded-full blur-3xl"
          />

          {/* Floating elements */}
          <motion.div
            animate={{ y: [-20, 20, -20], rotate: [0, 5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/4 left-[10%] w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center"
          >
            <Briefcase className="w-8 h-8 text-[#c7ff6b]" />
          </motion.div>
          <motion.div
            animate={{ y: [20, -20, 20], rotate: [0, -5, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/3 right-[15%] w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center"
          >
            <Sparkles className="w-7 h-7 text-[#c7ff6b]" />
          </motion.div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full mb-6"
            >
              <Sparkles className="w-4 h-4 text-[#c7ff6b]" />
              <span className="text-[#c7ff6b] font-semibold text-sm">Real Jobs from Adzuna, LinkedIn, Indeed & More</span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-white mb-6"
            >
              Find Your <span className="text-[#c7ff6b]">Dream Job</span>
              <br />in India
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl text-white/80 mb-10 leading-relaxed max-w-2xl mx-auto"
            >
              Search across multiple job portals instantly. Get AI-powered recommendations matched to your skills.
            </motion.p>

            {/* Search */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <JobSearch variant="hero" />
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-8 border-t border-white/10"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <stat.icon className="w-5 h-5 text-[#c7ff6b]" />
                    <span className="text-3xl md:text-4xl font-bold text-[#c7ff6b]">{stat.value}</span>
                  </div>
                  <span className="text-white/60 text-sm">{stat.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute -bottom-1 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-16">
            <path d="M0 80L60 70C120 60 240 40 360 30C480 20 600 20 720 25C840 30 960 40 1080 45C1200 50 1320 50 1380 50L1440 50V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0V80Z" fill="#f9fafb" />
          </svg>
        </div>
      </section>

      {/* Search Results Section */}
      <AnimatePresence>
        {hasSearchResults && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-12 bg-gray-50"
          >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex gap-8">
                {/* Filters Sidebar - Desktop */}
                <div className="hidden lg:block w-80 flex-shrink-0">
                  <div className="sticky top-24">
                    <JobFilters />
                  </div>
                </div>

                {/* Results */}
                <div className="flex-1 min-w-0">
                  {/* Mobile Filters Button */}
                  <div className="lg:hidden mb-4">
                    <Sheet open={showFilters} onOpenChange={setShowFilters}>
                      <SheetTrigger asChild>
                        <Button variant="outline" className="w-full justify-start gap-2">
                          <SlidersHorizontal className="w-4 h-4" />
                          Filters
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-[320px] p-0">
                        <JobFilters variant="sheet" onClose={() => setShowFilters(false)} />
                      </SheetContent>
                    </Sheet>
                  </div>

                  <JobList
                    jobs={searchResults}
                    isLoading={isSearching}
                    title={searchQuery ? `Results for "${searchQuery}"` : 'Search Results'}
                    subtitle={`${searchResults.length} jobs found in ${filters.location}`}
                    emptyMessage="No jobs match your search. Try different keywords or adjust your filters."
                  />
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Job Categories - Only show when no search results */}
      {!hasSearchResults && (
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
                Browse by Category
              </h2>
              <p className="text-xl text-muted-foreground">
                Find opportunities in your field
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {jobCategories.map((category, index) => (
                <motion.div
                  key={category.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleCategoryClick(category.query)}
                  className="group cursor-pointer"
                >
                  <div className={cn(
                    "relative p-6 rounded-2xl transition-all duration-500 overflow-hidden",
                    "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl",
                    "hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)]",
                    "hover:-translate-y-1"
                  )}>
                    {/* Gradient background on hover */}
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500",
                      category.gradient
                    )} />

                    <div className="relative flex items-center gap-4">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 bg-gradient-to-br",
                        category.gradient,
                        "group-hover:scale-110 group-hover:shadow-lg"
                      )}>
                        <category.icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-muted-foreground text-sm">{category.count} jobs</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Jobs Section - Show when no search results */}
      {!hasSearchResults && (
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-4"
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#c7ff6b] to-[#a8e063] flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-black" />
                  </div>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                    All Jobs
                  </h2>
                </div>
                <p className="text-lg md:text-xl text-muted-foreground mt-2">
                  {allJobs.length} opportunities available
                </p>
              </div>

              {/* Pagination Info */}
              {allJobs.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * jobsPerPage) + 1}-{Math.min(currentPage * jobsPerPage, allJobs.length)} of {allJobs.length}
                </div>
              )}
            </motion.div>

            {/* Jobs Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {isInitialLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 animate-pulse border"
                  >
                    <div className="w-16 h-16 bg-gray-200 rounded-2xl mb-5" />
                    <div className="h-6 bg-gray-200 rounded-lg w-3/4 mb-3" />
                    <div className="space-y-2 mb-5">
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                    </div>
                    <div className="flex gap-2 mb-5">
                      <div className="h-7 w-16 bg-gray-200 rounded-full" />
                      <div className="h-7 w-20 bg-gray-200 rounded-full" />
                    </div>
                    <div className="flex justify-between pt-5 border-t border-gray-100">
                      <div className="h-7 w-24 bg-gray-200 rounded-full" />
                      <div className="h-10 w-20 bg-gray-200 rounded-xl" />
                    </div>
                  </motion.div>
                ))
              ) : paginatedJobs.length > 0 ? (
                paginatedJobs.map((job, index) => (
                  <motion.div
                    key={job.job_id || index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <JobCard job={job} index={index} variant="featured" />
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-xl text-muted-foreground">No jobs found. Check back later!</p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl"
                >
                  Previous
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Show first, last, and pages around current
                    return page === 1 || page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1);
                  })
                  .map((page, idx, arr) => (
                    <div key={page} className="flex items-center">
                      {idx > 0 && arr[idx - 1] !== page - 1 && (
                        <span className="px-2 text-muted-foreground">...</span>
                      )}
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "rounded-xl min-w-[44px]",
                          currentPage === page && "bg-primary text-white"
                        )}
                      >
                        {page}
                      </Button>
                    </div>
                  ))
                }

                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-xl"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* AI Recommendations CTA */}
      <section className="py-24 bg-gradient-to-br from-primary via-primary to-[#4338ca] text-white relative overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
          }}
          className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#c7ff6b]/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
          }}
          className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-3xl"
        />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full mb-6">
                <Target className="w-4 h-4 text-[#c7ff6b]" />
                <span className="text-[#c7ff6b] font-semibold text-sm">AI-Powered Matching</span>
              </div>

              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Get Personalized Job <br />
                <span className="text-[#c7ff6b]">Recommendations</span>
              </h2>
              <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">
                Upload your resume and let our AI find the perfect jobs matched to your skills, experience, and career goals.
              </p>

              <Link to="/resume-builder">
                <Button
                  size="lg"
                  className="bg-[#c7ff6b] hover:bg-[#b8f55a] text-black font-bold text-lg px-10 py-7 rounded-2xl transition-colors duration-200"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Upload Your Resume
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>

              {/* Features */}
              <div className="grid md:grid-cols-3 gap-8 mt-20">
                {[
                  { icon: Zap, title: 'Instant Analysis', desc: 'AI scans your resume in seconds' },
                  { icon: Target, title: 'Smart Matching', desc: 'Jobs ranked by skill fit' },
                  { icon: TrendingUp, title: 'Better Results', desc: '3x more interview callbacks' },
                ].map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="w-8 h-8 text-[#c7ff6b]" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                    <p className="text-white/60">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground">
              Find your next opportunity in 3 simple steps
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: '01',
                title: 'Search or Upload',
                desc: 'Search jobs directly or upload your resume for AI matching',
                icon: '1',
                gradient: 'from-blue-500 to-indigo-600'
              },
              {
                step: '02',
                title: 'Get Matched',
                desc: 'Our AI analyzes your skills and finds the best opportunities',
                icon: '2',
                gradient: 'from-purple-500 to-pink-600'
              },
              {
                step: '03',
                title: 'Apply & Succeed',
                desc: 'Apply with one click and track your applications',
                icon: '3',
                gradient: 'from-[#c7ff6b] to-[#a8e063]'
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative"
              >
                <div className={cn(
                  "h-full p-8 rounded-3xl transition-all duration-500",
                  "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl",
                  "shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]",
                  "hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)]",
                  "hover:-translate-y-2"
                )}>
                  <div className="text-center">
                    <div className={cn(
                      "w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6",
                      item.gradient
                    )}>{item.icon}</div>
                    <div className={cn(
                      "inline-block bg-gradient-to-r text-white font-bold text-sm px-4 py-1.5 rounded-full mb-4",
                      item.gradient
                    )}>
                      Step {item.step}
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-foreground">{item.title}</h3>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                </div>

                {/* Connector line */}
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 border-t-2 border-dashed border-primary/20" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />

      {/* Floating Comparison Button */}
      <AnimatePresence>
        {comparedJobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-8 right-8 z-50"
          >
            <Button
              onClick={() => setShowComparison(true)}
              size="lg"
              className="rounded-full bg-gradient-to-r from-indigo-600 to-primary hover:from-indigo-700 hover:to-primary/90 pl-6 pr-8 py-6 text-lg font-bold transition-colors duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-white font-bold">{comparedJobs.length}</span>
                </div>
                <span>Compare Jobs</span>
              </div>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Job Comparison Panel */}
      <JobComparison
        isOpen={showComparison}
        onClose={() => setShowComparison(false)}
      />
    </div>
  );
};

export default JobsPage;
