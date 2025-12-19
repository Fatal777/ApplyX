import { motion, AnimatePresence } from "framer-motion";
import { Crown, X, Check, Zap, Sparkles, FileText, Video, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface PaywallModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature: "interview" | "resume_analysis";
    usageInfo?: {
        used: number;
        limit: number;
    };
}

/**
 * PaywallModal - Displays when users hit feature limits
 * 
 * Features:
 * - interview: Pro/Enterprise required for AI Interview Platform
 * - resume_analysis: 2 free analyses, then subscription required
 */
const PaywallModal = ({ isOpen, onClose, feature, usageInfo }: PaywallModalProps) => {
    const navigate = useNavigate();

    const featureConfig = {
        interview: {
            title: "Unlock AI Interview Platform",
            description: "Practice with AI-powered mock interviews, get instant feedback, and ace your next interview.",
            icon: Video,
            gradient: "from-purple-500 to-pink-500",
            benefits: [
                "Unlimited mock interviews",
                "AI-powered interviewer personas",
                "Real-time feedback & scoring",
                "Interview recording & playback",
                "Industry-specific questions",
                "Weakness identification"
            ]
        },
        resume_analysis: {
            title: "Resume Analysis Limit Reached",
            description: usageInfo
                ? `You've used ${usageInfo.used} of ${usageInfo.limit} free analyses. Upgrade to continue improving your resume.`
                : "Upgrade to get unlimited resume analyses and take your resume to the next level.",
            icon: FileText,
            gradient: "from-lime-400 to-green-500",
            benefits: [
                "Unlimited resume analyses",
                "AI-powered suggestions",
                "ATS optimization score",
                "Keyword matching",
                "Section recommendations",
                "Live PDF editing"
            ]
        },
    };

    const config = featureConfig[feature];
    const Icon = config.icon;

    const handleUpgrade = () => {
        onClose();
        navigate("/pricing");
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
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="w-full max-w-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Card className="bg-white shadow-2xl border-0 overflow-hidden">
                            {/* Header with gradient */}
                            <div className={`bg-gradient-to-r ${config.gradient} p-6 relative`}>
                                <button
                                    onClick={onClose}
                                    className="absolute right-4 top-4 text-white/80 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.1, type: "spring" }}
                                    className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4"
                                >
                                    <Icon className="w-8 h-8 text-white" />
                                </motion.div>

                                <h2 className="text-2xl font-bold text-white mb-2">{config.title}</h2>
                                <p className="text-white/90">{config.description}</p>
                            </div>

                            <CardContent className="p-6 space-y-6">
                                {/* Usage indicator for resume analysis */}
                                {feature === "resume_analysis" && usageInfo && (
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-gray-600">Free analyses used</span>
                                            <span className="font-semibold">{usageInfo.used} / {usageInfo.limit}</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(usageInfo.used / usageInfo.limit) * 100}%` }}
                                                className="h-full bg-red-500 rounded-full"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Benefits list */}
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-lime-500" />
                                        What you'll unlock:
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {config.benefits.map((benefit, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 + i * 0.05 }}
                                                className="flex items-start gap-2"
                                            >
                                                <Check className="w-4 h-4 text-lime-500 flex-shrink-0 mt-0.5" />
                                                <span className="text-sm text-gray-700">{benefit}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {/* Pricing highlight */}
                                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-4 text-white">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Crown className="w-5 h-5 text-lime-400" />
                                                <span className="font-semibold">Pro Plan</span>
                                            </div>
                                            <p className="text-sm text-gray-400">Everything you need to land your dream job</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold">₹499</div>
                                            <div className="text-xs text-gray-400">/month</div>
                                        </div>
                                    </div>
                                </div>

                                {/* CTAs */}
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={onClose}
                                    >
                                        Maybe Later
                                    </Button>
                                    <Button
                                        className="flex-1 bg-gradient-to-r from-lime-400 to-green-500 text-black font-bold hover:from-lime-500 hover:to-green-600 shadow-lg"
                                        onClick={handleUpgrade}
                                    >
                                        <Zap className="w-4 h-4 mr-2" />
                                        Upgrade Now
                                    </Button>
                                </div>

                                {/* Trust badge */}
                                <div className="text-center text-xs text-gray-500 flex items-center justify-center gap-1">
                                    <Star className="w-3 h-3 text-yellow-500" />
                                    <span>30-day money-back guarantee</span>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PaywallModal;
