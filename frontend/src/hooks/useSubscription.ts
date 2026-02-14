import { useState, useEffect, useCallback } from 'react';
import { paymentService, UsageData, CreditType } from '@/services/paymentService';
import { useAuth } from '@/contexts/AuthContext';

/**
 * useSubscription Hook — Freemium Edition
 * =========================================
 * Provides plan info, per-feature usage limits, and a credit-consuming helper.
 *
 * Usage:
 * ```tsx
 * const { usage, isLoading, isLimitReached, consumeCredit, refetch } = useSubscription();
 *
 * if (isLimitReached('interviews')) showUpgradeModal('interviews');
 * // after successful action:
 * await consumeCredit('interviews');
 * ```
 */
export function useSubscription() {
    const { user } = useAuth();
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsage = useCallback(async () => {
        if (!user) {
            setUsage(null);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const data = await paymentService.getUsage();
            setUsage(data);
        } catch (err: any) {
            console.error('Failed to fetch usage:', err);
            setError(err.message || 'Failed to fetch usage');
            // Fallback: assume free with everything at limit so UX blocks gracefully
            setUsage({
                plan: 'free',
                status: 'active',
                resume_edits: { used: 0, limit: 1, remaining: 1 },
                resume_analyses: { used: 0, limit: 1, remaining: 1 },
                interviews: { used: 0, limit: 1, remaining: 1 },
                is_limit_reached: {
                    resume_edits: false,
                    resume_analyses: false,
                    interviews: false,
                },
                is_paid: false,
            });
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchUsage();
    }, [fetchUsage]);

    /** Check whether a specific credit type has hit its limit */
    const isLimitReached = useCallback(
        (type: CreditType): boolean => {
            if (!usage) return false;
            return usage.is_limit_reached[type] ?? false;
        },
        [usage],
    );

    /** Remaining credits for a type (-1 = unlimited) */
    const remaining = useCallback(
        (type: CreditType): number => {
            if (!usage) return 0;
            return usage[type]?.remaining ?? 0;
        },
        [usage],
    );

    /** Consume a credit after a successful action & update local state */
    const consumeCredit = useCallback(
        async (type: CreditType) => {
            try {
                const result = await paymentService.consumeCredit(type);
                if (result.usage) {
                    setUsage(result.usage);
                }
                return result;
            } catch (err: any) {
                // If 402 — limit just got reached (race condition). Refetch to sync UI.
                if (err.response?.status === 402) {
                    await fetchUsage();
                }
                throw err;
            }
        },
        [fetchUsage],
    );

    return {
        usage,
        isLoading,
        error,

        // Plan helpers
        plan: usage?.plan ?? 'free',
        isPaid: usage?.is_paid ?? false,

        // Per-feature limit checks
        isLimitReached,
        remaining,

        // Legacy compat aliases
        canAccessInterview: !usage?.is_limit_reached.interviews,
        canAnalyzeResume: !usage?.is_limit_reached.resume_analyses,
        canUploadResume: !usage?.is_limit_reached.resume_edits,

        // Actions
        consumeCredit,
        refetch: fetchUsage,
    };
}

export default useSubscription;
