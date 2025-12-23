import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Mail, Lock, User, ArrowRight, Sparkles, Rocket } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

const Signup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreedToTerms) {
      toast({
        title: "Terms required",
        description: "Please agree to the Terms of Service and Privacy Policy",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, fullName);
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account"
      });
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "Failed to create account",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl"
      >
        <Card className="p-8 md:p-12 bg-white shadow-2xl border-0">
          <div className="mb-8 text-center">
            <Link to="/" className="flex items-center mb-6 w-fit mx-auto">
              <img
                src="/Dark BG Logo.png"
                alt="ApplyX Logo"
                className="h-10 w-auto"
              />
            </Link>

            <div className="flex items-center justify-center gap-2 mb-4">
              <Rocket className="w-8 h-8 text-accent" />
              <h1 className="text-4xl font-bold">Start Your Journey</h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Create your account and unlock your career potential
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base font-semibold">Full Name</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="pl-12 h-14 text-base border-2 focus:border-accent transition-all"
                />
              </div>
            </div>

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
                  minLength={8}
                  className="pl-12 h-14 text-base border-2 focus:border-accent transition-all"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Must be at least 8 characters with letters and numbers
              </p>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-5 h-5 rounded border-2 border-accent mt-1"
              />
              <p className="text-sm text-muted-foreground">
                I agree to the{" "}
                <Link to="/terms" className="text-black font-semibold hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-black font-semibold hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="w-full group bg-accent hover:bg-accent/90 text-black font-bold"
            >
              {loading ? "Creating Account..." : "Create Account"}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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
            disabled={loading}
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
              Already have an account?{" "}
              <Link to="/login" className="text-black font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-8 border-t border-border">
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span>AI-Powered</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span>Free to Start</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span>No Credit Card</span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Signup;
