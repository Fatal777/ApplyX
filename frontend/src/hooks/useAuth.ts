/**
 * useAuth Hook
 * Re-exports from AuthContext for consistent auth state across the app
 */

import { useAuth as useAuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  const context = useAuthContext();

  return {
    user: context.user,
    loading: context.isLoading,
    isAuthenticated: context.isAuthenticated,
    signIn: context.signIn,
    signUp: context.signUp,
    signOut: context.signOut,
    signInWithGoogle: context.signInWithGoogle,
  };
}
