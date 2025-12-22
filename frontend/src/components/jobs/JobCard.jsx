/**
 * JobCard Component - PREMIUM DESIGN
 * Matches ApplyX color palette: Blue-Purple gradient theme
 * Features: Glassmorphism, subtle shadows, hover effects
 */

import React from 'react';
import {
    Briefcase, MapPin, DollarSign, Clock, Building2,
    Laptop, TrendingUp, ExternalLink, Sparkles
} from 'lucide-react';

const JobCard = ({ job, onClick = () => { } }) => {
    const formatSalary = () => {
        if (job.salary_display) return job.salary_display;
        if (job.salary_min && job.salary_max) {
            const currency = job.salary_currency === 'INR' ? '₹' : '$';
            return `${currency}${(job.salary_min / 100000).toFixed(1)}-${(job.salary_max / 100000).toFixed(1)} LPA`;
        }
        return null;
    };

    const formatExperience = () => {
        // Check for valid numbers (not null, not undefined, not NaN)
        const hasMin = job.experience_min !== null && job.experience_min !== undefined && !isNaN(job.experience_min);
        const hasMax = job.experience_max !== null && job.experience_max !== undefined && !isNaN(job.experience_max);

        if (hasMin && hasMax) {
            return `${job.experience_min}-${job.experience_max} years`;
        }
        if (hasMin) {
            return `${job.experience_min}+ years`;
        }
        if (hasMax) {
            return `0-${job.experience_max} years`;
        }
        if (job.experience_level && job.experience_level !== 'undefined') {
            return job.experience_level.charAt(0).toUpperCase() + job.experience_level.slice(1);
        }
        if (job.experience && job.experience !== 'undefined-undefined years') {
            return job.experience;
        }
        return null;
    };

    const salary = formatSalary();
    const experience = formatExperience();

    return (
        <div
            className="group relative bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden"
            onClick={() => onClick?.(job)}
        >
            {/* Background Gradient Effect on Hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            {/* Content */}
            <div className="relative z-10">
                {/* Header: Title & Company */}
                <div className="mb-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors duration-200 line-clamp-2 flex-1">
                            {job.title}
                        </h3>
                        {job.source === 'linkedin' && (
                            <span className="flex-shrink-0 px-2 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-semibold rounded-md flex items-center gap-1">
                                <Sparkles size={10} />
                                Premium
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                        <Building2 size={18} className="text-primary/70" />
                        <span className="font-semibold">{job.company}</span>
                    </div>
                </div>

                {/* Key Info Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {/* Location - Always shown */}
                    {job.location && (
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                            <MapPin size={14} className="text-primary" />
                            <span>{job.location}</span>
                        </div>
                    )}

                    {/* Salary - Only if exists */}
                    {salary && (
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg text-sm font-semibold text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700">
                            <DollarSign size={14} />
                            <span>{salary}</span>
                        </div>
                    )}

                    {/* Experience - Only if exists */}
                    {experience && (
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700">
                            <Clock size={14} />
                            <span>{experience}</span>
                        </div>
                    )}
                </div>

                {/* Employment Type & Work Mode - Only if exists */}
                {(job.employment_type || job.work_location) && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {job.employment_type && (
                            <span className="px-3 py-1 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-400 text-xs font-semibold rounded-full border border-purple-200 dark:border-purple-700">
                                {job.employment_type.replace('-', ' ').toUpperCase()}
                            </span>
                        )}

                        {job.work_location && (
                            <span className="px-3 py-1 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 text-orange-700 dark:text-orange-400 text-xs font-semibold rounded-full border border-orange-200 dark:border-orange-700 flex items-center gap-1.5">
                                <Laptop size={11} />
                                {job.work_location.charAt(0).toUpperCase() + job.work_location.slice(1)}
                            </span>
                        )}
                    </div>
                )}

                {/* Skills - Only if exists and has items */}
                {job.skills_required && job.skills_required.length > 0 && (
                    <div className="mb-4">
                        <div className="flex flex-wrap gap-1.5">
                            {job.skills_required.slice(0, 6).map((skill, idx) => (
                                <span
                                    key={idx}
                                    className="px-2.5 py-1 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-600 border border-gray-200 dark:border-gray-500 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-md hover:border-primary hover:text-primary transition-all duration-200"
                                >
                                    {skill}
                                </span>
                            ))}
                            {job.skills_required.length > 6 && (
                                <span className="px-2.5 py-1 text-primary font-bold text-xs bg-primary/10 rounded-md border border-primary/20">
                                    +{job.skills_required.length - 6} more
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Description Preview */}
                {job.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-4 leading-relaxed">
                        {job.description}
                    </p>
                )}

                {/* Footer: Posted Date, Source & Apply Button */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        {job.posted_date && (
                            <span className="flex items-center gap-1">
                                <TrendingUp size={12} />
                                {job.posted_date}
                            </span>
                        )}
                        {job.source && (
                            <span className="capitalize font-semibold text-gray-600 dark:text-gray-300">
                                via <span className="text-primary">{job.source}</span>
                            </span>
                        )}
                    </div>

                    <button
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-primary/30 group"
                        onClick={(e) => {
                            e.stopPropagation();
                            const url = job.redirect_url || job.apply_url || job.source_url || job.url;
                            if (url) {
                                window.open(url, '_blank');
                            }
                        }}
                    >
                        Apply Now
                        <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JobCard;
