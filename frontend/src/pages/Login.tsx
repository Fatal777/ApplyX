import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Mail, Lock, ArrowRight, Loader2, Sparkles, Target, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user, signIn, signInWithGoogle, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/resume-builder";
  const { toast } = useToast();

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
        description: "Please enter both email and password",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      await signIn(email, password);
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in"
      });
      // Navigation will be handled by the useEffect above when user state updates
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Sign in failed",
        description: error.message || "Failed to sign in. Please check your credentials.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Login Form */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="p-8 md:p-12 bg-white shadow-2xl border-0">
            <div className="mb-8">
              <Link to="/" className="flex items-center mb-8 w-fit">
                <img
                  src="/Dark BG Logo.png"
                  alt="ApplyX Logo"
                  className="h-10 w-auto"
                />
              </Link>

              <h1 className="text-4xl font-bold mb-2">Welcome Back</h1>
              <p className="text-muted-foreground text-lg">
                Sign in to continue your journey
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-semibold">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-12 h-14 text-base border-2 focus:border-accent transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-semibold">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-12 h-14 text-base border-2 focus:border-accent transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-2 border-primary" />
                  <span className="text-sm text-muted-foreground">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-primary hover:underline font-semibold">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading || isAuthLoading}
                size="lg"
                className="w-full group bg-accent hover:bg-accent/90 text-black font-bold"
              >
                {isLoading || isAuthLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign In <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full h-14 border-2 hover:bg-gray-50 font-semibold"
              onClick={signInWithGoogle}
              disabled={isLoading || isAuthLoading}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="text-black font-semibold hover:underline">
                  Sign up for free
                </Link>
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Right Side - Benefits */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="hidden lg:block"
        >
          <div className="space-y-8">
            <div>
              <h2 className="text-5xl font-bold text-white mb-4">
                Your Career,<br />
                <span className="text-accent">Supercharged</span>
              </h2>
              <p className="text-white/80 text-xl">
                Join thousands of students landing their dream jobs
              </p>
            </div>

            <div className="space-y-6">
              {[
                { icon: Sparkles, title: "AI-Powered Resume Analysis", desc: "Get instant feedback to perfect your resume" },
                { icon: Target, title: "Smart Job Matching", desc: "Find opportunities that match your skills" },
                { icon: Zap, title: "Interview Preparation", desc: "Practice with AI-powered mock interviews" },
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-start gap-4 p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg mb-1">{item.title}</h3>
                    <p className="text-white/70">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
