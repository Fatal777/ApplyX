import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Sparkles, Zap, Crown, ArrowRight, AlertCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link, useNavigate } from "react-router-dom";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/effects";
import { useAuth } from "@/contexts/AuthContext";

const Pricing = () => {
  const [isYearly, setIsYearly] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const plans = [
    {
      name: "Free",
      icon: Sparkles,
      description: "Get started with basic features",
      monthlyPrice: 0,
      yearlyPrice: 0,
      cta: "Get Started",
      popular: false,
      color: "from-gray-500 to-gray-700"
    },
    {
      name: "Basic",
      icon: Sparkles,
      description: "Great for active job seekers",
      monthlyPrice: 99,
      yearlyPrice: 990,
      cta: "Start Basic",
      popular: false,
      color: "from-blue-400 to-blue-600"
    },
    {
      name: "Pro",
      icon: Zap,
      description: "For serious career growth",
      monthlyPrice: 499,
      yearlyPrice: 4990,
      cta: "Go Pro",
      popular: true,
      color: "from-lime-400 to-green-500"
    },
    {
      name: "Pro+",
      icon: Crown,
      description: "Ultimate career accelerator",
      monthlyPrice: 999,
      yearlyPrice: 9990,
      cta: "Get Pro+",
      popular: false,
      color: "from-purple-500 to-pink-600"
    }
  ];

  // Feature comparison data
  const featureCategories = [
    {
      name: "Resume Features",
      features: [
        { name: "Resume Uploads", free: "2 total", basic: "10/month", pro: "Unlimited", proPlus: "Unlimited" },
        { name: "ATS Score Analysis", free: true, basic: true, pro: true, proPlus: true },
        { name: "AI Resume Suggestions", free: false, basic: true, pro: true, proPlus: true },
        { name: "Live PDF Editor", free: false, basic: true, pro: true, proPlus: true },
        { name: "Premium Templates", free: "3", basic: "15", pro: "50+", proPlus: "50+" },
        { name: "Cover Letter Generator", free: false, basic: false, pro: true, proPlus: true },
      ]
    },
    {
      name: "AI Interview Practice",
      features: [
        { name: "Mock Interviews", free: false, basic: "1/month", pro: "5/month", proPlus: "Unlimited" },
        { name: "Interview Feedback", free: false, basic: true, pro: true, proPlus: true },
        { name: "Custom Interview Topics", free: false, basic: false, pro: true, proPlus: true },
        { name: "Industry-specific Questions", free: false, basic: false, pro: true, proPlus: true },
      ]
    },
    {
      name: "Job Search",
      features: [
        { name: "Job Board Access", free: true, basic: true, pro: true, proPlus: true },
        { name: "AI Job Matching", free: "Limited", basic: true, pro: true, proPlus: true },
        { name: "Application Tracking", free: "5 jobs", basic: "50 jobs", pro: "Unlimited", proPlus: "Unlimited" },
        { name: "Premium Job Listings", free: false, basic: false, pro: true, proPlus: true },
        { name: "Referral Support", free: false, basic: false, pro: false, proPlus: true },
      ]
    },
    {
      name: "Support & Extras",
      features: [
        { name: "Email Support", free: true, basic: true, pro: true, proPlus: true },
        { name: "Priority Support", free: false, basic: false, pro: true, proPlus: true },
        { name: "24/7 Chat Support", free: false, basic: false, pro: false, proPlus: true },
        { name: "Career Coach Access", free: false, basic: false, pro: false, proPlus: true },
        { name: "Job Guarantee", free: false, basic: false, pro: false, proPlus: "6 months" },
      ]
    }
  ];

  const handlePlanClick = (planName: string) => {
    if (!user) {
      navigate('/login', { state: { from: '/pricing', plan: planName } });
      return;
    }
    navigate('/dashboard');
  };

  const renderFeatureValue = (value: boolean | string) => {
    if (value === true) {
      return <Check className="w-5 h-5 text-green-500 mx-auto" />;
    }
    if (value === false) {
      return <X className="w-5 h-5 text-gray-300 mx-auto" />;
    }
    return <span className="text-sm font-medium text-gray-700">{value}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 md:pt-28 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <FadeIn className="text-center mb-8 md:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 md:mb-8 max-w-2xl mx-auto px-4">
              Choose the perfect plan for your career journey. Upgrade or downgrade anytime.
            </p>

            {/* Payment Notice */}
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-full text-sm mb-6">
              <AlertCircle className="w-4 h-4" />
              <span>Payments will be enabled soon. All features currently free during beta!</span>
            </div>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3 md:gap-4 flex-wrap">
              <span className={`text-base md:text-lg font-medium ${!isYearly ? 'text-black' : 'text-gray-500'}`}>
                Monthly
              </span>
              <Switch
                checked={isYearly}
                onCheckedChange={setIsYearly}
                className="data-[state=checked]:bg-lime-400"
              />
              <span className={`text-base md:text-lg font-medium ${isYearly ? 'text-black' : 'text-gray-500'}`}>
                Yearly
              </span>
              {isYearly && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-lime-400 text-black px-3 py-1 rounded-full text-xs md:text-sm font-bold"
                >
                  Save 17%
                </motion.span>
              )}
            </div>
          </FadeIn>

          {/* Pricing Cards - Mobile First */}
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto mb-16" staggerDelay={0.1}>
            {plans.map((plan) => {
              const Icon = plan.icon;
              const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;

              return (
                <StaggerItem key={plan.name} className="relative">
                  {plan.popular && (
                    <div className="absolute -top-3 left-0 right-0 flex justify-center z-10">
                      <span className="bg-gradient-to-r from-lime-400 to-green-500 text-black px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                        <Star className="w-3 h-3" /> Most Popular
                      </span>
                    </div>
                  )}

                  <Card className={`h-full ${plan.popular ? 'border-2 border-lime-400 shadow-xl' : 'border'} hover:shadow-lg transition-all duration-300`}>
                    <CardHeader className="pb-4">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br ${plan.color} flex items-center justify-center mb-3`}>
                        <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      </div>
                      <CardTitle className="text-xl md:text-2xl">{plan.name}</CardTitle>
                      <CardDescription className="text-sm">{plan.description}</CardDescription>

                      <div className="mt-3">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl md:text-4xl font-bold">₹{price}</span>
                          <span className="text-gray-500 text-sm">
                            /{isYearly ? 'year' : 'month'}
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardFooter className="pt-0">
                      <Button
                        className={`w-full ${plan.popular
                          ? 'bg-gradient-to-r from-lime-400 to-green-500 hover:from-lime-500 hover:to-green-600 text-black'
                          : 'bg-black hover:bg-gray-800 text-white'
                          } font-bold py-5 text-sm md:text-base group`}
                        onClick={() => handlePlanClick(plan.name)}
                      >
                        {plan.cta}
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardFooter>
                  </Card>
                </StaggerItem>
              );
            })}
          </StaggerContainer>

          {/* Feature Comparison Table */}
          <FadeIn delay={0.2} className="max-w-7xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Compare All Features</h2>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse bg-white rounded-2xl shadow-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left p-4 font-semibold text-gray-600 w-1/3">Features</th>
                    {plans.map((plan) => (
                      <th key={plan.name} className={`p-4 text-center font-bold ${plan.popular ? 'bg-lime-50' : ''}`}>
                        <div className="flex flex-col items-center gap-1">
                          <span className={plan.popular ? 'text-green-600' : ''}>{plan.name}</span>
                          <span className="text-2xl">₹{isYearly ? plan.yearlyPrice : plan.monthlyPrice}</span>
                          <span className="text-xs text-gray-500 font-normal">/{isYearly ? 'year' : 'month'}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {featureCategories.map((category, catIdx) => (
                    <>
                      <tr key={category.name} className="bg-gray-100">
                        <td colSpan={5} className="p-3 font-bold text-gray-800 text-sm uppercase tracking-wide">
                          {category.name}
                        </td>
                      </tr>
                      {category.features.map((feature, idx) => (
                        <tr key={feature.name} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          <td className="p-4 text-gray-700">{feature.name}</td>
                          <td className="p-4 text-center">{renderFeatureValue(feature.free)}</td>
                          <td className="p-4 text-center">{renderFeatureValue(feature.basic)}</td>
                          <td className={`p-4 text-center ${plans[2].popular ? 'bg-lime-50/50' : ''}`}>{renderFeatureValue(feature.pro)}</td>
                          <td className="p-4 text-center">{renderFeatureValue(feature.proPlus)}</td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td className="p-4"></td>
                    {plans.map((plan) => (
                      <td key={plan.name} className={`p-4 text-center ${plan.popular ? 'bg-lime-50' : ''}`}>
                        <Button
                          className={`${plan.popular
                            ? 'bg-gradient-to-r from-lime-400 to-green-500 hover:from-lime-500 hover:to-green-600 text-black'
                            : 'bg-black hover:bg-gray-800 text-white'
                            } font-bold`}
                          onClick={() => handlePlanClick(plan.name)}
                        >
                          {plan.cta}
                        </Button>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Feature Cards */}
            <div className="lg:hidden space-y-6">
              {featureCategories.map((category) => (
                <Card key={category.name} className="overflow-hidden">
                  <CardHeader className="bg-gray-100 py-3">
                    <CardTitle className="text-base font-bold uppercase tracking-wide">{category.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {category.features.map((feature, idx) => (
                      <div key={feature.name} className={`p-4 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b last:border-b-0`}>
                        <div className="font-medium text-gray-800 mb-3">{feature.name}</div>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Free</div>
                            {renderFeatureValue(feature.free)}
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Basic</div>
                            {renderFeatureValue(feature.basic)}
                          </div>
                          <div className="bg-lime-50 rounded-lg py-1">
                            <div className="text-xs text-green-600 mb-1 font-medium">Pro</div>
                            {renderFeatureValue(feature.pro)}
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Pro+</div>
                            {renderFeatureValue(feature.proPlus)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </FadeIn>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-16 md:mt-20 max-w-4xl mx-auto"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">Frequently Asked Questions</h2>

            <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base md:text-lg">Can I switch plans anytime?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm md:text-base">
                    Yes! Upgrade or downgrade anytime. Changes take effect immediately.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base md:text-lg">Is there a free trial?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm md:text-base">
                    Yes! All paid plans come with a 14-day free trial. No credit card required.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base md:text-lg">What payment methods?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm md:text-base">
                    UPI, credit/debit cards, and net banking via Razorpay.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base md:text-lg">Can I cancel anytime?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm md:text-base">
                    Absolutely. Cancel anytime with no questions asked.
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* CTA Section */}
          <FadeIn delay={0.4} className="mt-16 md:mt-20 text-center">
            <Card className="bg-gradient-to-r from-black to-gray-900 text-white border-0 max-w-4xl mx-auto">
              <CardContent className="p-8 md:p-12">
                <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">Ready to accelerate your career?</h2>
                <p className="text-base md:text-xl text-gray-300 mb-6 md:mb-8">
                  Join thousands of professionals landing their dream jobs with ApplyX.
                </p>
                <div className="flex gap-3 md:gap-4 justify-center flex-wrap">
                  <Link to="/signup">
                    <Button size="lg" className="bg-lime-400 hover:bg-lime-500 text-black font-bold">
                      Start Free Trial
                    </Button>
                  </Link>
                  <Link to="/contact">
                    <Button size="lg" variant="outline" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-black">
                      Contact Sales
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Pricing;
