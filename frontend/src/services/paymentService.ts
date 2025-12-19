/**
 * Payment Service
 * ================
 * Frontend service for Razorpay payment integration.
 * 
 * Features:
 * - Subscription status checking
 * - Order creation
 * - Payment verification
 * - Razorpay checkout integration
 */

import axios from 'axios';
import { supabase } from '@/lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance for payment requests
const api = axios.create({
    baseURL: API_BASE_URL,
});

// Add auth interceptor
api.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
});

// Declare Razorpay on window
declare global {
    interface Window {
        Razorpay: any;
    }
}

export interface SubscriptionStatus {
    plan: "free" | "basic" | "pro" | "pro_plus";
    status: string;
    expires_at: string | null;
    resume_analysis_count: number;
    resume_analysis_limit: number;
    resume_analysis_remaining: number;
    can_access_interview: boolean;
    can_analyze_resume: boolean;
    tier: string;
    is_paid: boolean;
    // Usage tracking
    resume_edits_used?: number;
    resume_edits_limit?: number;
    interviews_used?: number;
    interviews_limit?: number;
}

export interface PaymentOrder {
    order_id: string;
    amount: number;
    currency: string;
    key_id: string;
    name: string;
    description: string;
    prefill: {
        email: string;
        name: string;
        contact: string;
    };
    theme: {
        color: string;
    };
}

export interface InterviewAccessCheck {
    allowed: boolean;
    error?: string;
    message?: string;
    upgrade_url?: string;
    current_plan?: string;
}

export interface ResumeAccessCheck {
    allowed: boolean;
    unlimited?: boolean;
    used?: number;
    limit?: number;
    remaining?: number;
    error?: string;
    message?: string;
    upgrade_url?: string;
}

/**
 * Load Razorpay script dynamically
 */
const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }

        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export const paymentService = {
    /**
     * Get current user's subscription status
     */
    async getSubscriptionStatus(): Promise<SubscriptionStatus> {
        const response = await api.get("/api/v1/payment/subscription-status");
        return response.data;
    },

    /**
     * Check if user can access interview platform
     */
    async checkInterviewAccess(): Promise<InterviewAccessCheck> {
        const response = await api.get("/api/v1/payment/check-interview-access");
        return response.data;
    },

    /**
     * Check if user can perform resume analysis
     */
    async checkResumeAccess(): Promise<ResumeAccessCheck> {
        const response = await api.get("/api/v1/payment/check-resume-access");
        return response.data;
    },

    /**
     * Create a payment order for any paid plan
     */
    async createOrder(plan: "basic" | "pro" | "pro_plus"): Promise<PaymentOrder> {
        const response = await api.post("/api/v1/payment/create-order", { plan });
        return response.data;
    },

    /**
     * Verify payment after successful checkout
     */
    async verifyPayment(
        razorpay_order_id: string,
        razorpay_payment_id: string,
        razorpay_signature: string
    ): Promise<{ success: boolean; plan: string; expires_at?: string }> {
        const response = await api.post("/api/v1/payment/verify", {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        });
        return response.data;
    },

    /**
     * Get payment history
     */
    async getPaymentHistory(limit: number = 10): Promise<{ payments: any[]; total: number }> {
        const response = await api.get(`/api/v1/payment/history?limit=${limit}`);
        return response.data;
    },

    /**
     * Initiate Razorpay payment flow
     * 
     * This opens the Razorpay checkout modal and handles the payment process.
     * 
     * @param plan - The plan to purchase ("basic", "pro", or "pro_plus")
     * @param onSuccess - Callback on successful payment
     * @param onFailure - Callback on payment failure
     */
    async initiatePayment(
        plan: "basic" | "pro" | "pro_plus",
        onSuccess?: (plan: string) => void,
        onFailure?: (error: string) => void
    ): Promise<boolean> {
        // Load Razorpay script
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
            onFailure?.("Failed to load payment gateway");
            return false;
        }

        try {
            // Create order
            const order = await this.createOrder(plan);

            return new Promise((resolve) => {
                const options = {
                    key: order.key_id,
                    amount: order.amount,
                    currency: order.currency,
                    name: order.name,
                    description: order.description,
                    order_id: order.order_id,
                    handler: async (response: any) => {
                        try {
                            // Verify payment
                            const result = await this.verifyPayment(
                                response.razorpay_order_id,
                                response.razorpay_payment_id,
                                response.razorpay_signature
                            );

                            if (result.success) {
                                onSuccess?.(result.plan);
                                resolve(true);
                            } else {
                                onFailure?.("Payment verification failed");
                                resolve(false);
                            }
                        } catch (error: any) {
                            onFailure?.(error.message || "Payment verification failed");
                            resolve(false);
                        }
                    },
                    prefill: order.prefill,
                    theme: order.theme,
                    modal: {
                        ondismiss: () => {
                            onFailure?.("Payment cancelled");
                            resolve(false);
                        },
                    },
                };

                const razorpay = new window.Razorpay(options);
                razorpay.on("payment.failed", (response: any) => {
                    onFailure?.(response.error?.description || "Payment failed");
                    resolve(false);
                });
                razorpay.open();
            });
        } catch (error: any) {
            onFailure?.(error.response?.data?.detail || error.message || "Failed to create order");
            return false;
        }
    },

    /**
     * Check if user has active paid subscription
     */
    async isPaidUser(): Promise<boolean> {
        try {
            const status = await this.getSubscriptionStatus();
            return status.is_paid;
        } catch {
            return false;
        }
    },

    /**
     * Get remaining free resume analyses
     */
    async getRemainingResumeAnalyses(): Promise<number> {
        try {
            const status = await this.getSubscriptionStatus();
            if (status.is_paid) return -1; // Unlimited
            return status.resume_analysis_remaining;
        } catch {
            return 2; // Default to full free limit
        }
    },
};

export default paymentService;
