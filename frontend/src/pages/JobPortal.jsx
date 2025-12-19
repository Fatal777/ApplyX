/**
 * JobPortal - Main Job Portal Page - PREMIUM DESIGN
 * Engineering Jobs with App's Blue-Purple Gradient Theme
 * Features: Glassmorphism, modern gradients, premium UI
 */

import React, { useState, useEffect } from 'react';
import { Search, Loader2, Briefcase, Sparkles, TrendingUp } from 'lucide-react';
import JobCard from '../components/jobs/JobCard';
import JobFilters from '../components/jobs/JobFilters';
import AdvancedJobSearch from '../components/jobs/AdvancedJobSearch';
import Navbar from '@/components/Navbar';
import axios from 'axios';

const JobPortal = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        city: '',
        state: '',
        salary_min: '',
        experience_level: '',
        experience_max: null,
        employment_type: '',
        work_location: '',
        skills: '',
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 0,
    });

    const fetchJobs = async (page = 1) => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: pagination.limit,
                ...(filters.city && { city: filters.city }),
                ...(filters.state && { state: filters.state }),
                ...(filters.salary_min && { salary_min: filters.salary_min }),
                ...(filters.experience_level && { experience_level: filters.experience_level }),
                ...(filters.experience_max && { experience_max: filters.experience_max }),
                ...(filters.employment_type && { employment_type: filters.employment_type }),
                ...(filters.work_location && { work_location: filters.work_location }),
                ...(filters.skills && { skills: filters.skills }),
            };

            Object.keys(params).forEach(key =>
                (params[key] === '' || params[key] === null) && delete params[key]
            );

            const response = await axios.get('/api/v1/jobs/search', { params });

            setJobs(response.data.jobs || []);
            setPagination({
                page: response.data.page,
                limit: response.data.limit,
                total: response.data.total,
                total_pages: response.data.total_pages,
            });
        } catch (error) {
            console.error('Error fetching jobs:', error);
            setJobs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const handleAdvancedSearch = ({ category, query }) => {
        // Map category to appropriate filter
        const filterMap = {
            location: 'city',
            role: 'q',
            field: 'q',
            language: 'skills',
            stack: 'skills',
        };

        const filterKey = filterMap[category];
        if (filterKey === 'city') {
            setFilters(prev => ({ ...prev, city: query }));
        } else if (filterKey === 'skills') {
            setFilters(prev => ({ ...prev, skills: query }));
        }
        fetchJobs(1);
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchJobs(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [filters]);

    const clearFilters = () => {
        setFilters({
            city: '',
            state: '',
            salary_min: '',
            experience_level: '',
            experience_max: null,
            employment_type: '',
            work_location: '',
            skills: '',
        });
    };

    const goToPage = (page) => {
        fetchJobs(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-primary/5">
            {/* Use same Navbar as landing page */}
            <Navbar />

            {/* Hero Section with Search - Consistent with app design */}
            <section className="pt-24 pb-12 bg-white dark:bg-gray-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-full mb-4">
                            <Sparkles className="w-4 h-4" />
                            <span className="font-semibold text-sm">Engineering Jobs</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                            Find Your Dream Engineering Role
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2">
                            <TrendingUp size={18} className="text-primary" />
                            <span className="font-bold text-primary">{pagination.total.toLocaleString()}</span>
                            premium opportunities across India
                        </p>
                    </div>

                    {/* Advanced Search Component */}
                    <div className="max-w-4xl mx-auto">
                        <AdvancedJobSearch onSearch={handleAdvancedSearch} />
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Filters Sidebar */}
                    <div className="lg:col-span-1">
                        <JobFilters
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onClearFilters={clearFilters}
                        />
                    </div>

                    {/* Jobs List */}
                    <div className="lg:col-span-3">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-primary/10">
                                <Loader2 className="animate-spin text-primary mb-4" size={48} />
                                <p className="text-gray-600 dark:text-gray-300 font-medium">Finding the best jobs for you...</p>
                            </div>
                        ) : jobs.length === 0 ? (
                            <div className="text-center py-20 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700">
                                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full flex items-center justify-center">
                                    <Briefcase size={40} className="text-primary" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No jobs found</h3>
                                <p className="text-gray-600 dark:text-gray-400">Try adjusting your filters or search query</p>
                            </div>
                        ) : (
                            <>
                                {/* Jobs Grid */}
                                <div className="space-y-5">
                                    {jobs.map(job => (
                                        <JobCard
                                            key={job.id}
                                            job={job}
                                            onClick={(job) => window.open(job.source_url, '_blank')}
                                        />
                                    ))}
                                </div>

                                {/* Premium Pagination */}
                                {pagination.total_pages > 1 && (
                                    <div className="mt-10 flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => goToPage(pagination.page - 1)}
                                            disabled={pagination.page === 1}
                                            className="px-5 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gradient-to-r hover:from-primary hover:to-indigo-600 hover:text-white hover:border-transparent disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-700 dark:disabled:hover:text-gray-200 transition-all duration-200"
                                        >
                                            Previous
                                        </button>

                                        {[...Array(Math.min(5, pagination.total_pages))].map((_, idx) => {
                                            const pageNum = pagination.page - 2 + idx;
                                            if (pageNum < 1 || pageNum > pagination.total_pages) return null;
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => goToPage(pageNum)}
                                                    className={`min-w-[44px] px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${pagination.page === pageNum
                                                        ? 'bg-gradient-to-r from-primary to-indigo-600 text-white shadow-lg shadow-primary/30'
                                                        : 'border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-primary hover:text-primary'
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}

                                        <button
                                            onClick={() => goToPage(pagination.page + 1)}
                                            disabled={pagination.page === pagination.total_pages}
                                            className="px-5 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gradient-to-r hover:from-primary hover:to-indigo-600 hover:text-white hover:border-transparent disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-700 dark:disabled:hover:text-gray-200 transition-all duration-200"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobPortal;
