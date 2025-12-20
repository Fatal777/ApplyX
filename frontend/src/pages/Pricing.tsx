import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Zap, Crown, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link, useNavigate } from "react-router-dom";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  TiltCard,
  MagneticButton,
  CursorGlow,
  Spotlight
} from "@/components/effects";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { paymentService } from "@/services/paymentService";
import { useToast } from "@/hooks/use-toast";

const Pricing = () => {
  const [isYearly, setIsYearly] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { user } = useAuth();
  const { subscription, isPaid, refetch } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Handle plan purchase with Razorpay
  const handlePurchase = async (planName: string) => {
    if (!user) {
      navigate('/login', { state: { from: '/pricing', plan: planName } });
      return;
    }

    if (planName === 'Free') {
      navigate('/dashboard');
      return;
    }

    if (planName === 'Enterprise') {
      // TODO: Contact sales form
      window.location.href = 'mailto:enterprise@applyx.com?subject=Enterprise Plan Inquiry';
      return;
    }

    setIsProcessing(planName);
    try {
      const success = await paymentService.initiatePayment(
        planName.toLowerCase() as 'pro' | 'enterprise',
        (plan) => {
          toast({
            title: "Payment Successful!",
            description: `You're now on the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan.`,
          });
          refetch();
          navigate('/dashboard');
        },
        (error) => {
          toast({
            title: "Payment Failed",
            description: error,
            variant: "destructive",
          });
        }
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const plans = [
    {
      name: "Free",
      icon: Sparkles,
      description: "Perfect for getting started",
      monthlyPrice: 0,
      yearlyPrice: 0,
      inrMonthly: 0,
      inrYearly: 0,
      features: [
        "2 resume edits (lifetime)",
        "Basic ATS scoring",
        "Standard templates",
        "Email support",
        "Job board access"
      ],
      limitations: [
        "No interviews",
        "Limited edits",
        "No AI suggestions"
      ],
      cta: "Get Started Free",
      popular: false,
      color: "from-gray-500 to-gray-700"
    },
    {
      name: "Basic",
      icon: Sparkles,
      description: "Great for beginners",
      monthlyPrice: 99,
      yearlyPrice: 990,
      inrMonthly: 99,
      inrYearly: 990,
      features: [
        "10 resume edits/month",
        "1 AI interview/month",
        "AI-powered suggestions",
        "ATS optimization",
        "Live PDF editor",
        "Email support"
      ],
      limitations: [],
      cta: "Upgrade to Basic",
      popular: false,
      color: "from-blue-400 to-blue-600"
    },
    {
      name: "Pro",
      icon: Zap,
      description: "For serious job seekers",
      monthlyPrice: 499,
      yearlyPrice: 4990,
      inrMonthly: 499,
      inrYearly: 4990,
      features: [
        "Unlimited resume edits",
        "5 AI interviews/month",
        "Advanced ATS scoring",
        "AI-powered suggestions",
        "Live PDF editor",
        "50+ premium templates",
        "Priority support",
        "Cover letter generator"
      ],
      limitations: [],
      cta: "Upgrade to Pro",
      popular: true,
      color: "from-lime-400 to-green-500"
    },
    {
      name: "Pro+",
      icon: Crown,
      description: "Ultimate career accelerator",
      monthlyPrice: 5489,
      yearlyPrice: 54890,
      inrMonthly: 5489,
      inrYearly: 54890,
      features: [
        "Everything in Pro",
        "Unlimited AI interviews",
        "6-month job guarantee",
        "Resume recommendations",
        "Referral support",
        "Premium job postings",
        "Dedicated career coach",
        "Priority 24/7 support"
      ],
      limitations: [],
      cta: "Get Pro+",
      popular: false,
      color: "from-purple-500 to-pink-600"
    }
  ];

  const calculateSavings = (monthly: number, yearly: number) => {
    if (monthly === 0) return 0;
    const monthlyCost = monthly * 12;
    const savings = monthlyCost - yearly;
    const percentage = Math.round((savings / monthlyCost) * 100);
    return percentage;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-24 md:pt-28 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <FadeIn className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Choose the perfect plan for your career journey. All plans include a 14-day free trial.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className={`text-lg font-medium ${!isYearly ? 'text-black' : 'text-gray-500'}`}>
                Monthly
              </span>
              <Switch
                checked={isYearly}
                onCheckedChange={setIsYearly}
                className="data-[state=checked]:bg-lime-400"
              />
              <span className={`text-lg font-medium ${isYearly ? 'text-black' : 'text-gray-500'}`}>
                Yearly
              </span>
              {isYearly && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-lime-400 text-black px-3 py-1 rounded-full text-sm font-bold"
                >
                  Save up to 20%
                </motion.span>
              )}
            </div>
          </FadeIn>

          {/* Pricing Cards */}
          <StaggerContainer className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto" staggerDelay={0.15}>
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
              const savings = calculateSavings(plan.monthlyPrice, plan.yearlyPrice);

              return (
                <StaggerItem key={plan.name} className="relative">
                  {plan.popular && (
                    <div className="absolute -top-4 left-0 right-0 flex justify-center z-10">
                      <span className="bg-gradient-to-r from-lime-400 to-green-500 text-black px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <TiltCard
                    tiltAmount={plan.popular ? 8 : 5}
                    scale={plan.popular ? 1.02 : 1.01}
                    glare
                    glareOpacity={plan.popular ? 0.15 : 0.08}
                    className="h-full"
                  >
                    <Spotlight>
                      <Card className={`h-full ${plan.popular ? 'border-4 border-lime-400 shadow-2xl' : 'border-2'} hover:shadow-xl transition-all duration-300`}>
                        <CardHeader>
                          <motion.div
                            className={`w-12 h-12 rounded-lg bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.5 }}
                          >
                            <Icon className="w-6 h-6 text-white" />
                          </motion.div>
                          <CardTitle className="text-2xl">{plan.name}</CardTitle>
                          <CardDescription className="text-base">{plan.description}</CardDescription>

                          <div className="mt-4">
                            <div className="flex items-baseline gap-2">
                              <span className="text-5xl font-bold">₹{price}</span>
                              <span className="text-gray-500">
                                /{isYearly ? 'year' : 'month'}
                              </span>
                            </div>
                            {isYearly && savings > 0 && (
                              <p className="text-sm text-green-600 font-semibold mt-1">
                                Save {savings}% with yearly billing
                              </p>
                            )}
                            {!isYearly && plan.monthlyPrice > 0 && (
                              <p className="text-sm text-gray-500 mt-1">
                                ₹{plan.yearlyPrice}/year if billed annually
                              </p>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="flex-1">
                          <div className="space-y-3">
                            {plan.features.map((feature, i) => (
                              <motion.div
                                key={i}
                                className="flex items-start gap-3"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                              >
                                <Check className="w-5 h-5 text-lime-500 flex-shrink-0 mt-0.5" />
                                <span className="text-sm">{feature}</span>
                              </motion.div>
                            ))}
                          </div>
                        </CardContent>

                        <CardFooter>
                          <MagneticButton className="w-full" strength={0.2}>
                            <Button
                              className={`w-full ${plan.popular
                                ? 'bg-gradient-to-r from-lime-400 to-green-500 hover:from-lime-500 hover:to-green-600 text-black'
                                : 'bg-black hover:bg-gray-800 text-white'
                                } font-bold py-6 text-lg group`}
                              onClick={() => handlePurchase(plan.name)}
                              disabled={isProcessing !== null || (isPaid && plan.name === subscription?.plan)}
                            >
                              {isProcessing === plan.name ? (
                                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                              ) : isPaid && plan.name.toLowerCase() === subscription?.plan ? (
                                "Current Plan"
                              ) : (
                                <>{plan.cta}<ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" /></>
                              )}
                            </Button>
                          </MagneticButton>
                        </CardFooter>
                      </Card>
                    </Spotlight>
                  </TiltCard>
                </StaggerItem>
              );
            })}
          </StaggerContainer>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-20 max-w-4xl mx-auto"
          >
            <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>

            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Can I switch plans anytime?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    We accept all major credit cards, PayPal, and bank transfers for Enterprise plans.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Is there a free trial?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes! All paid plans come with a 14-day free trial. No credit card required to start.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Can I cancel anytime?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Absolutely. Cancel anytime with no questions asked. You'll have access until the end of your billing period.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Do you offer refunds?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes, we offer a 30-day money-back guarantee if you're not satisfied with our service.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What's included in Enterprise?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Enterprise includes everything in Pro plus custom features, dedicated support, and flexible deployment options.
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* CTA Section */}
          <FadeIn delay={0.4} className="mt-20 text-center">
            <CursorGlow
              glowColor="rgba(199, 255, 107, 0.2)"
              glowSize={400}
              className="rounded-2xl"
            >
              <Card className="bg-gradient-to-r from-black to-gray-900 text-white border-0 max-w-4xl mx-auto">
                <CardContent className="p-12">
                  <h2 className="text-4xl font-bold mb-4">Still have questions?</h2>
                  <p className="text-xl text-gray-300 mb-8">
                    Our team is here to help you choose the right plan for your needs.
                  </p>
                  <div className="flex gap-4 justify-center flex-wrap">
                    <Link to="/contact">
                      <MagneticButton strength={0.25}>
                        <Button size="lg" className="bg-lime-400 hover:bg-lime-500 text-black font-bold">
                          Contact Sales
                        </Button>
                      </MagneticButton>
                    </Link>
                    <Link to="/signup">
                      <MagneticButton strength={0.25}>
                        <Button size="lg" variant="outline" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-black">
                          Start Free Trial
                        </Button>
                      </MagneticButton>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </CursorGlow>
          </FadeIn>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Pricing;
