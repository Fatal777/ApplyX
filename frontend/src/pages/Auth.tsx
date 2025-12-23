import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { user, signIn, signUp, signInWithGoogle, isLoading: isAuthLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/";
    const { toast } = useToast();

    // Check if we came from signup route
    useEffect(() => {
        if (location.pathname === "/signup") {
            setIsLogin(false);
        }
    }, [location.pathname]);

    // Redirect if already authenticated
    useEffect(() => {
        if (user) {
            navigate(from, { replace: true });
        }
    }, [user, navigate, from]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            toast({
                title: "Missing credentials",
                description: "Please fill in all required fields",
                variant: "destructive"
            });
            return;
        }

        if (!isLogin && password.length < 8) {
            toast({
                title: "Password too short",
                description: "Password must be at least 8 characters",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);

        try {
            if (isLogin) {
                await signIn(email, password);
                toast({
                    title: "Welcome back!",
                    description: "You have successfully signed in"
                });
            } else {
                await signUp(email, password, fullName);
                toast({
                    title: "Account created!",
                    description: "Please check your email to verify your account"
                });
                setIsLogin(true);
            }
        } catch (error: any) {
            toast({
                title: isLogin ? "Sign in failed" : "Sign up failed",
                description: error.message || "Please try again",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            await signInWithGoogle(from);
        } catch (error: any) {
            toast({
                title: "Google sign in failed",
                description: error.message || "Please try again",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <Link to="/" className="flex justify-center mb-6">
                    <img
                        src="/Dark BG Logo.png"
                        alt="ApplyX Logo"
                        className="h-12 w-auto"
                    />
                </Link>

                {/* Auth Card */}
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    {/* Toggle Tabs */}
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 py-4 text-center font-semibold transition-all ${isLogin
                                ? "text-black border-b-2 border-accent bg-gray-50"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-4 text-center font-semibold transition-all ${!isLogin
                                ? "text-black border-b-2 border-accent bg-gray-50"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Form Content */}
                    <div className="p-6">
                        <AnimatePresence mode="wait">
                            <motion.form
                                key={isLogin ? "login" : "signup"}
                                initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                                transition={{ duration: 0.2 }}
                                onSubmit={handleSubmit}
                                className="space-y-4"
                            >
                                {/* Name field - only for signup */}
                                {!isLogin && (
                                    <div className="space-y-1">
                                        <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <Input
                                                id="name"
                                                type="text"
                                                placeholder="John Doe"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                required={!isLogin}
                                                className="pl-10 h-11"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Email field */}
                                <div className="space-y-1">
                                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="pl-10 h-11"
                                        />
                                    </div>
                                </div>

                                {/* Password field */}
                                <div className="space-y-1">
                                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            minLength={isLogin ? undefined : 8}
                                            className="pl-10 pr-10 h-11"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {!isLogin && (
                                        <p className="text-xs text-gray-500">Min 8 characters</p>
                                    )}
                                </div>

                                {/* Forgot password - login only */}
                                {isLogin && (
                                    <div className="text-right">
                                        <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                                            Forgot password?
                                        </Link>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <Button
                                    type="submit"
                                    disabled={isLoading || isAuthLoading}
                                    className="w-full h-11 bg-accent hover:bg-accent/90 text-black font-bold"
                                >
                                    {isLoading || isAuthLoading ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {isLogin ? "Signing in..." : "Creating account..."}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            {isLogin ? "Sign In" : "Create Account"}
                                            <ArrowRight className="w-4 h-4" />
                                        </span>
                                    )}
                                </Button>
                            </motion.form>
                        </AnimatePresence>

                        {/* Divider */}
                        <div className="relative my-5">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-3 bg-white text-gray-500">or</span>
                            </div>
                        </div>

                        {/* Google Sign In */}
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full h-11 font-medium"
                            onClick={handleGoogleSignIn}
                            disabled={isLoading || isAuthLoading}
                        >
                            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </Button>

                        {/* Terms */}
                        <p className="text-xs text-gray-500 text-center mt-4">
                            By continuing, you agree to our{" "}
                            <Link to="/terms" className="text-primary hover:underline">Terms</Link>
                            {" "}and{" "}
                            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Auth;
