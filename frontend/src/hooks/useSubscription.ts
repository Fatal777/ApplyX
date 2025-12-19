import { useState, useEffect, useCallback } from 'react';
import { paymentService, SubscriptionStatus } from '@/services/paymentService';
import { useAuth } from '@/contexts/AuthContext';

/**
 * useSubscription Hook
 * =====================
 * Provides subscription status and access control for features.
 * 
 * Usage:
 * ```tsx
 * const { subscription, isLoading, canAccessInterview, canAnalyzeResume, refetch } = useSubscription();
 * 
 * if (!canAccessInterview) {
 *   // Show paywall modal
 * }
 * ```
 */
export function useSubscription() {
    const { user } = useAuth();
    const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSubscription = useCallback(async () => {
        if (!user) {
            setSubscription(null);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const status = await paymentService.getSubscriptionStatus();
            setSubscription(status);
        } catch (err: any) {
            console.error('Failed to fetch subscription status:', err);
            setError(err.message || 'Failed to fetch subscription status');
            // Set default free subscription on error
            setSubscription({
                plan: 'free',
                status: 'active',
                expires_at: null,
                resume_analysis_count: 0,
                resume_analysis_limit: 2,
                resume_analysis_remaining: 2,
                can_access_interview: false,
                can_analyze_resume: true,
                tier: 'free',
                is_paid: false,
            });
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchSubscription();
    }, [fetchSubscription]);

    return {
        subscription,
        isLoading,
        error,

        // Convenience getters
        isPaid: subscription?.is_paid ?? false,
        plan: subscription?.plan ?? 'free',
        tier: subscription?.tier ?? 'free',

        // Feature access
        canAccessInterview: subscription?.can_access_interview ?? false,
        canAnalyzeResume: subscription?.can_analyze_resume ?? true,

        // Resume analysis tracking
        resumeAnalysisCount: subscription?.resume_analysis_count ?? 0,
        resumeAnalysisLimit: subscription?.resume_analysis_limit ?? 2,
        resumeAnalysisRemaining: subscription?.resume_analysis_remaining ?? 2,

        // Refetch function
        refetch: fetchSubscription,
    };
}

export default useSubscription;
