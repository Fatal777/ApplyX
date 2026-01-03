/**
 * ResumeLanding Page
 * Entry point for resume features - create new or improve existing
 */

import { motion } from "framer-motion";
import { FileText, Upload, Sparkles, ArrowRight, User, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Footer from "@/components/Footer";

const ResumeLanding = () => {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navigation */}
            <nav className="border-b border-gray-800 bg-black sticky top-0 z-50">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between px-4 md:px-8 py-4">
                    <div className="flex items-center gap-8">
                        <img
                            src="/Dark BG Logo.png"
                            alt="ApplyX Logo"
                            className="h-10 md:h-12 w-auto cursor-pointer"
                            onClick={() => navigate('/')}
                        />
                        <div className="hidden md:flex items-center gap-6">
                            <button onClick={() => navigate('/')} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Home</button>
                            <button onClick={() => navigate('/jobs')} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Jobs</button>
                            <button onClick={() => navigate('/dashboard')} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Dashboard</button>
                            <button className="text-sm font-medium text-white">Resume</button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                            <Bell className="w-5 h-5 text-gray-400" />
                        </button>
                        <div className="w-9 h-9 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center text-white text-sm font-semibold cursor-pointer" onClick={() => navigate('/dashboard')}>
                            <User className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="max-w-[1000px] mx-auto px-4 md:px-8 py-12 md:py-20">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Sparkles className="w-10 h-10 text-blue-600" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
                        Resume Builder
                    </h1>
                    <p className="text-gray-600 text-lg max-w-xl mx-auto">
                        Create a standout resume or enhance your existing one with AI-powered suggestions
                    </p>
                </motion.div>

                {/* Choice Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    {/* Create from Scratch */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card
                            className="h-full border-2 border-gray-200 hover:border-black transition-all duration-300 cursor-pointer group"
                            onClick={() => navigate('/resume-editor')}
                        >
                            <CardContent className="p-8 md:p-10 flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <FileText className="w-10 h-10 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-black mb-3">
                                    Start Fresh
                                </h2>
                                <p className="text-gray-600 mb-6">
                                    Create a new resume from scratch using our professional templates and intuitive editor
                                </p>
                                <ul className="text-sm text-gray-500 space-y-2 mb-6 text-left">
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-black rounded-full" />
                                        Choose from premium templates
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-black rounded-full" />
                                        Live preview as you type
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-black rounded-full" />
                                        Export to PDF instantly
                                    </li>
                                </ul>
                                <Button className="bg-black hover:bg-gray-900 text-white w-full group-hover:translate-x-1 transition-transform">
                                    Create New Resume
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Improve Existing */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card
                            className="h-full border-2 border-gray-200 hover:border-blue-600 transition-all duration-300 cursor-pointer group"
                            onClick={() => navigate('/resume-builder')}
                        >
                            <CardContent className="p-8 md:p-10 flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Upload className="w-10 h-10 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-black mb-3">
                                    Improve Existing
                                </h2>
                                <p className="text-gray-600 mb-6">
                                    Upload your current resume to get AI analysis, suggestions, and edit it in our builder
                                </p>
                                <ul className="text-sm text-gray-500 space-y-2 mb-6 text-left">
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                                        AI-powered analysis & scoring
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                                        Smart section extraction
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                                        Edit and enhance suggestions
                                    </li>
                                </ul>
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full group-hover:translate-x-1 transition-transform">
                                    Upload Resume
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Bottom CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-center mt-12"
                >
                    <p className="text-gray-500 text-sm">
                        Already have resumes?{" "}
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="text-blue-600 hover:underline font-medium"
                        >
                            View your saved resumes →
                        </button>
                    </p>
                </motion.div>
            </div>

            <Footer />
        </div>
    );
};

export default ResumeLanding;
