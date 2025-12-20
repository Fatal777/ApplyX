/**
 * SubscriptionModal Component - Premium Subscription Prompt
 * Shows when user tries to use paid features without subscription
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Crown,
    Sparkles,
    Check,
    Zap,
    MessageSquare,
    FileText,
    Star,
    ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature?: string;
}

const plans = [
    {
        name: 'Starter',
        price: 99,
        period: 'month',
        credits: 5,
        description: 'Perfect for getting started',
        features: [
            '5 Mock Interviews/month',
            'Basic AI Feedback',
            'Resume Analysis',
            'Email Support',
        ],
        gradient: 'from-blue-500 to-indigo-600',
        popular: false,
    },
    {
        name: 'Pro',
        price: 249,
        period: 'month',
        credits: 20,
        description: 'Best for active job seekers',
        features: [
            '20 Mock Interviews/month',
            'Advanced AI Feedback',
            'Resume Analysis + Optimization',
            'Priority Support',
            'Interview Recording',
        ],
        gradient: 'from-[#c7ff6b] to-[#a8e063]',
        popular: true,
    },
    {
        name: 'Unlimited',
        price: 499,
        period: 'month',
        credits: -1,
        description: 'For serious professionals',
        features: [
            'Unlimited Mock Interviews',
            'Premium AI Feedback',
            'Full Resume Suite',
            'Dedicated Support',
            'Interview Recording + Analysis',
            'Custom Interview Prep',
        ],
        gradient: 'from-purple-500 to-pink-600',
        popular: false,
    },
];

const SubscriptionModal = ({ isOpen, onClose, feature = 'Mock Interview' }: SubscriptionModalProps) => {
    const navigate = useNavigate();

    const handleSelectPlan = (planName: string) => {
        onClose();
        navigate('/pricing', { state: { selectedPlan: planName } });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 
                       md:w-[90vw] md:max-w-4xl md:max-h-[85vh] overflow-auto
                       bg-white dark:bg-gray-900 rounded-3xl shadow-2xl z-50"
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 dark:bg-gray-800 
                         hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Header */}
                        <div className="relative px-8 pt-8 pb-6 text-center overflow-hidden">
                            {/* Background decoration */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-[#c7ff6b]/5" />

                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.1, type: 'spring' }}
                                className="relative inline-flex items-center justify-center w-20 h-20 rounded-full 
                           bg-gradient-to-br from-[#c7ff6b] to-[#a8e063] mb-4"
                            >
                                <Crown className="w-10 h-10 text-black" />
                            </motion.div>

                            <motion.h2
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                className="relative text-2xl md:text-3xl font-bold text-foreground mb-2"
                            >
                                Unlock {feature}
                            </motion.h2>

                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="relative text-gray-600 dark:text-gray-400 max-w-md mx-auto"
                            >
                                Get access to AI-powered mock interviews, detailed feedback, and more with a subscription
                            </motion.p>
                        </div>

                        {/* Plans */}
                        <div className="px-6 pb-8">
                            <div className="grid md:grid-cols-3 gap-4">
                                {plans.map((plan, index) => (
                                    <motion.div
                                        key={plan.name}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.25 + index * 0.1 }}
                                        className={`relative p-5 rounded-2xl border-2 transition-all duration-300 
                               ${plan.popular
                                                ? 'border-[#c7ff6b] bg-[#c7ff6b]/5'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}
                                    >
                                        {/* Popular badge */}
                                        {plan.popular && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full 
                                       bg-gradient-to-r from-[#c7ff6b] to-[#a8e063] 
                                       text-black text-xs font-bold">
                                                    <Star className="w-3 h-3" />
                                                    MOST POPULAR
                                                </span>
                                            </div>
                                        )}

                                        {/* Plan header */}
                                        <div className="text-center mb-4 pt-2">
                                            <h3 className="text-lg font-bold text-foreground mb-1">{plan.name}</h3>
                                            <p className="text-xs text-gray-500 mb-3">{plan.description}</p>
                                            <div className="flex items-baseline justify-center gap-1">
                                                <span className="text-3xl font-bold text-foreground">₹{plan.price}</span>
                                                <span className="text-gray-500 text-sm">/{plan.period}</span>
                                            </div>
                                            {plan.credits > 0 && (
                                                <p className="text-xs text-primary mt-1 font-medium">
                                                    {plan.credits} interviews/month
                                                </p>
                                            )}
                                            {plan.credits === -1 && (
                                                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">
                                                    Unlimited interviews
                                                </p>
                                            )}
                                        </div>

                                        {/* Features */}
                                        <ul className="space-y-2 mb-5">
                                            {plan.features.map((feature, i) => (
                                                <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <Check className={`w-4 h-4 flex-shrink-0 ${plan.popular ? 'text-[#7fb832]' : 'text-primary'}`} />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        {/* CTA Button */}
                                        <Button
                                            onClick={() => handleSelectPlan(plan.name)}
                                            className={`w-full h-11 font-bold transition-all duration-200 ${plan.popular
                                                    ? 'bg-gradient-to-r from-[#c7ff6b] to-[#a8e063] hover:from-[#b8f55a] hover:to-[#98d052] text-black'
                                                    : 'bg-primary hover:bg-primary/90 text-white'
                                                }`}
                                        >
                                            Get Started
                                            <ArrowRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Footer note */}
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="text-center text-xs text-gray-500 mt-6"
                            >
                                All plans include a 7-day money-back guarantee • Cancel anytime
                            </motion.p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default SubscriptionModal;
