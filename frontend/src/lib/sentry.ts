/**
 * Sentry Error Tracking & Performance Monitoring
 * ===============================================
 * 
 * Provides:
 * - Error tracking with context
 * - Performance monitoring
 * - Session replay on errors
 * - User context for debugging
 */

import * as Sentry from "@sentry/react";

// Sentry DSN from environment
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const SENTRY_ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT || "development";
const IS_PRODUCTION = import.meta.env.PROD;

/**
 * Initialize Sentry SDK
 * Call this at the very start of your application
 */
export function initSentry(): void {
  if (!SENTRY_DSN) {
    console.log("[Sentry] No DSN configured, skipping initialization");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: `applyx-frontend@${import.meta.env.VITE_APP_VERSION || "1.0.0"}`,

    // Performance Monitoring
    tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0, // 10% in prod, 100% in dev
    
    // Session Replay - captures user sessions to replay errors
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% when error occurs

    integrations: [
      // Browser tracing for performance
      Sentry.browserTracingIntegration(),
      
      // Session replay for debugging
      Sentry.replayIntegration({
        // Privacy settings
        maskAllText: false, // Don't mask - we need to see form content
        maskAllInputs: true, // Mask input values
        blockAllMedia: false,
        // Mask sensitive elements by class
        mask: [".sensitive", ".password", ".credit-card"],
      }),
    ],

    // Configure which URLs to trace
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/api\.applyx\./,
      /^https:\/\/.*\.applyx\./,
    ],

    // Don't send errors from localhost in production builds
    beforeSend(event, hint) {
      // Filter out localhost errors in production
      if (IS_PRODUCTION && window.location.hostname === "localhost") {
        return null;
      }

      // Filter out known non-critical errors
      const error = hint.originalException;
      if (error instanceof Error) {
        // Ignore network errors from extensions
        if (error.message?.includes("chrome-extension://")) {
          return null;
        }
        // Ignore ResizeObserver errors (browser quirk)
        if (error.message?.includes("ResizeObserver loop")) {
          return null;
        }
        // Ignore cancelled requests
        if (error.message?.includes("AbortError")) {
          return null;
        }
      }

      return event;
    },

    // Filter transactions (performance)
    beforeSendTransaction(event) {
      // Don't track health check transactions
      if (event.transaction?.includes("/health")) {
        return null;
      }
      return event;
    },
  });

  // Set default tags
  Sentry.setTag("app", "applyx-frontend");
  
  console.log(`[Sentry] Initialized for ${SENTRY_ENVIRONMENT}`);
}

/**
 * Error Boundary Component
 * Wrap your app with this to catch React errors
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * Capture an exception manually
 * Use for try/catch blocks where you want to report errors
 */
export function captureError(
  error: Error | unknown,
  context?: Record<string, unknown>
): void {
  if (!SENTRY_DSN) return;

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message/event
 * Use for logging important events that aren't errors
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: Record<string, unknown>
): void {
  if (!SENTRY_DSN) return;

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context
 * Call after login to associate errors with users
 */
export function setUser(user: {
  id: string;
  email?: string;
  username?: string;
}): void {
  if (!SENTRY_DSN) return;

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Clear user context
 * Call on logout
 */
export function clearUser(): void {
  if (!SENTRY_DSN) return;
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 * Breadcrumbs appear in error reports showing what happened before the error
 */
export function addBreadcrumb(
  message: string,
  category: string = "app",
  data?: Record<string, unknown>
): void {
  if (!SENTRY_DSN) return;

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: "info",
  });
}

/**
 * Start a performance transaction
 * Use to measure custom operations
 */
export function startTransaction(
  name: string,
  op: string = "custom"
): Sentry.Span | undefined {
  if (!SENTRY_DSN) return undefined;

  return Sentry.startInactiveSpan({
    name,
    op,
  });
}

/**
 * Set a tag for filtering in Sentry
 */
export function setTag(key: string, value: string): void {
  if (!SENTRY_DSN) return;
  Sentry.setTag(key, value);
}

/**
 * Set extra context data
 */
export function setContext(name: string, context: Record<string, unknown>): void {
  if (!SENTRY_DSN) return;
  Sentry.setContext(name, context);
}

/**
 * Wrapper for async operations with error tracking
 */
export async function withSentry<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    const result = await operation();
    return result;
  } catch (error) {
    captureError(error, {
      operation: operationName,
      ...context,
    });
    throw error;
  }
}

/**
 * React hook for error reporting in components
 */
export function useSentryError() {
  return {
    captureError,
    captureMessage,
    addBreadcrumb,
    setContext,
  };
}
