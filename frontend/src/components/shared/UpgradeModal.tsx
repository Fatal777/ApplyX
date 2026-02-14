/**
 * UpgradeModal — Reusable Freemium Upgrade Prompt
 * =================================================
 * Shown whenever a user hits a usage limit. Tells them *which* limit
 * they've hit and nudges them to the pricing page.
 *
 * Usage:
 *   <UpgradeModal
 *     isOpen={showModal}
 *     onClose={() => setShowModal(false)}
 *     featureKey="interviews"            // "resume_edits" | "resume_analyses" | "interviews"
 *     plan="free"                         // current plan
 *   />
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, ArrowRight, FileText, Brain, Upload, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import type { CreditType } from '@/services/paymentService';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureKey?: CreditType;
    plan?: string;
    /** Optional custom message override */
    message?: string;
}

const FEATURE_META: Record<CreditType, { label: string; icon: React.ElementType; color: string; description: string }> = {
    resume_edits: {
        label: 'Resume Uploads',
        icon: Upload,
        color: 'from-blue-500 to-cyan-500',
        description: 'Upload more resumes and get AI-powered optimization.',
    },
    resume_analyses: {
        label: 'Resume Analyses',
        icon: FileText,
        color: 'from-emerald-500 to-teal-500',
        description: 'Get detailed ATS scoring and improvement suggestions.',
    },
    interviews: {
        label: 'Mock Interviews',
        icon: Brain,
        color: 'from-violet-500 to-purple-500',
        description: 'Practice with our AI interviewer and sharpen your skills.',
    },
};

const PLAN_LABELS: Record<string, string> = {
    free: 'Free',
    basic: 'Basic',
    pro: 'Pro',
    pro_plus: 'Pro+',
};

const UpgradeModal = ({
    isOpen,
    onClose,
    featureKey = 'resume_edits',
    plan = 'free',
    message,
}: UpgradeModalProps) => {
    const navigate = useNavigate();
    const meta = FEATURE_META[featureKey];
    const Icon = meta.icon;

    const handleUpgrade = () => {
        onClose();
        navigate('/pricing');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header Gradient Band */}
                        <div className={`relative bg-gradient-to-r ${meta.color} px-8 pt-8 pb-10 text-center`}>
                            {/* Close */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                            >
                                <X className="w-4 h-4 text-white" />
                            </button>

                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.1, type: 'spring' }}
                                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4"
                            >
                                <Icon className="w-8 h-8 text-white" />
                            </motion.div>

                            <h2 className="text-2xl font-bold text-white mb-1">
                                Limit Reached
                            </h2>
                            <p className="text-white/80 text-sm">
                                {message
                                    ? message
                                    : `You've used all your ${meta.label.toLowerCase()} on the ${PLAN_LABELS[plan] ?? plan} plan.`}
                            </p>
                        </div>

                        {/* Body */}
                        <div className="px-8 py-6 space-y-5">
                            {/* Feature highlight */}
                            <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                                <Sparkles className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-sm text-gray-900 dark:text-white">
                                        Upgrade for more {meta.label.toLowerCase()}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {meta.description}
                                    </p>
                                </div>
                            </div>

                            {/* Quick comparison */}
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    What you get with an upgrade
                                </p>
                                <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        Up to <strong>unlimited</strong> resume uploads
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        Up to <strong>unlimited</strong> ATS analyses
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        Up to <strong>unlimited</strong> mock interviews
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        Premium templates & priority support
                                    </li>
                                </ul>
                            </div>

                            {/* CTA */}
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={onClose}
                                >
                                    Maybe Later
                                </Button>
                                <Button
                                    className="flex-1 bg-gradient-to-r from-[#c7ff6b] to-[#a8e063] text-black font-semibold hover:brightness-110 transition-all"
                                    onClick={handleUpgrade}
                                >
                                    View Plans
                                    <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default UpgradeModal;
