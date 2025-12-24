/**
 * AuthCallback - Handles OAuth callback redirects
 * This component processes the OAuth tokens from URL hash and redirects appropriately
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Check for hash parameters (OAuth tokens)
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');

                if (accessToken) {
                    // Set the session manually if tokens are in hash
                    const { data, error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken || '',
                    });

                    if (error) {
                        console.error('Error setting session:', error);
                        setError(error.message);
                        return;
                    }

                    if (data.session) {
                        console.log('Session set successfully:', data.session.user?.email);
                        // Redirect to the stored return path or home
                        const returnTo = sessionStorage.getItem('auth_return_to') || '/';
                        sessionStorage.removeItem('auth_return_to');
                        navigate(returnTo, { replace: true });
                        return;
                    }
                }

                // Check for code parameter (authorization code flow)
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');

                if (code) {
                    // Exchange code for session
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

                    if (error) {
                        console.error('Error exchanging code:', error);
                        setError(error.message);
                        return;
                    }

                    if (data.session) {
                        console.log('Session from code exchange:', data.session.user?.email);
                        const returnTo = sessionStorage.getItem('auth_return_to') || '/';
                        sessionStorage.removeItem('auth_return_to');
                        navigate(returnTo, { replace: true });
                        return;
                    }
                }

                // If no tokens or code, just redirect to home
                const returnTo = sessionStorage.getItem('auth_return_to') || '/';
                sessionStorage.removeItem('auth_return_to');
                navigate(returnTo, { replace: true });

            } catch (err) {
                console.error('Auth callback error:', err);
                setError('Authentication failed. Please try again.');
            }
        };

        handleCallback();
    }, [navigate]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center p-8">
                    <h2 className="text-xl font-semibold text-red-600 mb-4">Authentication Error</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-gray-600">Completing sign in...</p>
            </div>
        </div>
    );
};

export default AuthCallback;
