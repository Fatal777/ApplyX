/**
 * AdvancedJobSearch Component
 * Category-based search with instant autocomplete (<100ms)
 * Categories: Location, Job Role, Field, Language, Tech Stack
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Briefcase, Target, Code, Wrench, ChevronDown } from 'lucide-react';
import {
    SEARCH_CATEGORIES,
    getCategoryData,
    ALL_INDIAN_CITIES,
    JOB_ROLES,
    TECH_FIELDS,
    PROGRAMMING_LANGUAGES,
    TECH_STACK
} from '../../data/indianCities';
import { getAutocompleteTrie, initializeAutocomplete } from '../../utils/autocompleteTrie';

const AdvancedJobSearch = ({ onSearch }) => {
    const [selectedCategory, setSelectedCategory] = useState('location');
    const [searchInput, setSearchInput] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const searchRef = useRef(null);

    // Initialize autocomplete tries on mount
    useEffect(() => {
        initializeAutocomplete({
            location: ALL_INDIAN_CITIES,
            role: JOB_ROLES,
            field: TECH_FIELDS,
            language: PROGRAMMING_LANGUAGES,
            stack: TECH_STACK,
        });
    }, []);

    // Handle input change with instant autocomplete
    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchInput(value);
        setHighlightedIndex(-1);

        if (value.length === 0) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // Get autocomplete suggestions (< 5ms)
        const trie = getAutocompleteTrie(
            selectedCategory,
            getCategoryData(selectedCategory)
        );

        const results = trie.search(value, 10);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
    };

    // Handle suggestion selection
    const selectSuggestion = (suggestion) => {
        setSearchInput(suggestion);
        setShowSuggestions(false);
        handleSearch(suggestion);
    };

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        if (!showSuggestions) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                    selectSuggestion(suggestions[highlightedIndex]);
                } else {
                    handleSearch(searchInput);
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                break;
            default:
                break;
        }
    };

    // Handle search
    const handleSearch = (query = searchInput) => {
        if (!query.trim()) return;

        onSearch({
            category: selectedCategory,
            query: query.trim()
        });
        setShowSuggestions(false);
    };

    // Category icon mapping
    const getCategoryIcon = (category) => {
        const icons = {
            location: <MapPin size={18} />,
            role: <Briefcase size={18} />,
            field: <Target size={18} />,
            language: <Code size={18} />,
            stack: <Wrench size={18} />,
        };
        return icons[category] || <Search size={18} />;
    };

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="w-full" ref={searchRef}>
            <div className="flex gap-3">
                {/* Category Selector */}
                <div className="relative">
                    <select
                        value={selectedCategory}
                        onChange={(e) => {
                            setSelectedCategory(e.target.value);
                            setSearchInput('');
                            setSuggestions([]);
                            setShowSuggestions(false);
                        }}
                        className="h-12 px-4 pr-10 border border-gray-300 rounded-l-lg bg-white text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
                    >
                        {SEARCH_CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>
                                {cat.icon} {cat.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                        size={16}
                    />
                </div>

                {/* Search Input with Autocomplete */}
                <div className="flex-1 relative">
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                            {getCategoryIcon(selectedCategory)}
                        </div>

                        <input
                            type="text"
                            value={searchInput}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onFocus={() => searchInput && setShowSuggestions(suggestions.length > 0)}
                            placeholder={`Search by ${SEARCH_CATEGORIES.find(c => c.value === selectedCategory)?.label.toLowerCase()}...`}
                            className="w-full h-12 pl-12 pr-4 border border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />

                        {/* Autocomplete Suggestions Dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                                {suggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        onClick={() => selectSuggestion(suggestion)}
                                        onMouseEnter={() => setHighlightedIndex(index)}
                                        className={`px-4 py-3 cursor-pointer flex items-center gap-3 ${index === highlightedIndex
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        <span className="text-gray-400">
                                            {getCategoryIcon(selectedCategory)}
                                        </span>
                                        <span className="font-medium">{suggestion}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Search Button */}
                <button
                    onClick={() => handleSearch()}
                    className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-r-lg transition-colors flex items-center gap-2"
                >
                    <Search size={18} />
                    Search
                </button>
            </div>

            {/* Category hint */}
            <p className="text-xs text-gray-500 mt-2 ml-1">
                💡 Start typing to see instant suggestions in {SEARCH_CATEGORIES.find(c => c.value === selectedCategory)?.label.toLowerCase()}
            </p>
        </div>
    );
};

export default AdvancedJobSearch;
