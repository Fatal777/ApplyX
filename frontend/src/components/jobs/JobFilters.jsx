/**
 * JobFilters Component  
 * Sidebar with all filters for job search
 * Includes: Location, Salary, Experience, Employment Type, Work Mode, Skills
 */

import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { ALL_INDIAN_CITIES, TECH_HUBS, INDIAN_STATES } from '../../data/indianCities';

const JobFilters = ({ filters, onFilterChange, onClearFilters }) => {
    const [expandedSections, setExpandedSections] = useState({
        location: true,
        salary: true,
        experience: true,
        employment: true,
        workMode: true,
        skills: false,
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const FilterSection = ({ title, sectionKey, children }) => (
        <div className="border-b border-gray-200 pb-4 mb-4">
            <button
                className="flex items-center justify-between w-full text-left mb-3"
                onClick={() => toggleSection(sectionKey)}
            >
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                {expandedSections[sectionKey] ? (
                    <ChevronUp size={16} className="text-gray-500" />
                ) : (
                    <ChevronDown size={16} className="text-gray-500" />
                )}
            </button>
            {expandedSections[sectionKey] && children}
        </div>
    );

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 sticky top-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-300">
                <h2 className="text-lg font-bold text-gray-900">Filters</h2>
                <button
                    onClick={onClearFilters}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                    Clear All
                </button>
            </div>

            {/* Location Filter */}
            <FilterSection title="Location" sectionKey="location">
                {/* Quick Tech Hubs */}
                <div className="mb-3">
                    <p className="text-xs font-medium text-gray-600 mb-2">Tech Hubs</p>
                    <div className="flex flex-wrap gap-1.5">
                        {TECH_HUBS.slice(0, 4).map(city => (
                            <button
                                key={city}
                                onClick={() => onFilterChange('city', filters.city === city ? '' : city)}
                                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${filters.city === city
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {city}
                            </button>
                        ))}
                    </div>
                </div>

                {/* City Dropdown */}
                <select
                    value={filters.city || ''}
                    onChange={(e) => onFilterChange('city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="">All Cities</option>
                    {ALL_INDIAN_CITIES.map(({ name }) => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>

                {/* State Dropdown */}
                <select
                    value={filters.state || ''}
                    onChange={(e) => onFilterChange('state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mt-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="">All States</option>
                    {INDIAN_STATES.map(state => (
                        <option key={state} value={state}>{state}</option>
                    ))}
                </select>
            </FilterSection>

            {/* Salary Filter */}
            <FilterSection title="Salary (Annual)" sectionKey="salary">
                <div className="space-y-2">
                    {[
                        { label: 'Any', value: '' },
                        { label: '₹3+ LPA', value: 300000 },
                        { label: '₹6+ LPA', value: 600000 },
                        { label: '₹10+ LPA', value: 1000000 },
                        { label: '₹15+ LPA', value: 1500000 },
                        { label: '₹20+ LPA', value: 2000000 },
                    ].map(({ label, value }) => (
                        <label key={label} className="flex items-center cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                            <input
                                type="radio"
                                name="salary"
                                checked={filters.salary_min === value}
                                onChange={() => onFilterChange('salary_min', value)}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">{label}</span>
                        </label>
                    ))}
                </div>
            </FilterSection>

            {/* Experience Filter */}
            <FilterSection title="Experience" sectionKey="experience">
                <div className="space-y-2">
                    {[
                        { label: 'Any Experience', level: '', max: null },
                        { label: 'Fresher (0-1 yrs)', level: 'fresher', max: 1 },
                        { label: 'Entry Level (1-3 yrs)', level: 'entry', max: 3 },
                        { label: 'Mid Level (3-7 yrs)', level: 'mid', max: 7 },
                        { label: 'Senior (7+ yrs)', level: 'senior', max: null },
                    ].map(({ label, level, max }) => (
                        <label key={label} className="flex items-center cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                            <input
                                type="radio"
                                name="experience"
                                checked={filters.experience_level === level}
                                onChange={() => {
                                    onFilterChange('experience_level', level);
                                    onFilterChange('experience_max', max);
                                }}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">{label}</span>
                        </label>
                    ))}
                </div>
            </FilterSection>

            {/* Employment Type Filter */}
            <FilterSection title="Employment Type" sectionKey="employment">
                <div className="space-y-2">
                    {[
                        { label: 'Any Type', value: '' },
                        { label: 'Full Time', value: 'full-time' },
                        { label: 'Part Time', value: 'part-time' },
                        { label: 'Contract', value: 'contract' },
                        { label: 'Internship', value: 'internship' },
                    ].map(({ label, value }) => (
                        <label key={label} className="flex items-center cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                            <input
                                type="radio"
                                name="employment_type"
                                checked={filters.employment_type === value}
                                onChange={() => onFilterChange('employment_type', value)}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">{label}</span>
                        </label>
                    ))}
                </div>
            </FilterSection>

            {/* Work Mode Filter */}
            <FilterSection title="Work Mode" sectionKey="workMode">
                <div className="space-y-2">
                    {[
                        { label: 'Any Mode', value: '' },
                        { label: 'Remote', value: 'remote' },
                        { label: 'On-site', value: 'onsite' },
                        { label: 'Hybrid', value: 'hybrid' },
                    ].map(({ label, value }) => (
                        <label key={label} className="flex items-center cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                            <input
                                type="radio"
                                name="work_location"
                                checked={filters.work_location === value}
                                onChange={() => onFilterChange('work_location', value)}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">{label}</span>
                        </label>
                    ))}
                </div>
            </FilterSection>

            {/* Skills Filter */}
            <FilterSection title="Skills" sectionKey="skills">
                <input
                    type="text"
                    value={filters.skills || ''}
                    onChange={(e) => onFilterChange('skills', e.target.value)}
                    placeholder="python, react, aws..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated</p>
            </FilterSection>
        </div>
    );
};

export default JobFilters;
