import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  Target,
  Zap,
  Users,
  TrendingUp,
  FileText,
  MessageSquare,
  Award,
  Briefcase,
  Building2,
  Video,
  GraduationCap,
  Code,
  Clock,
  Sparkles,
  Mic,
  Play,
  Brain,
  Search,
  Quote,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ThreeBackground from "@/components/ThreeBackground";
import { TestimonialCard, testimonials } from "@/components/ui/TestimonialCard";
import TestimonialsSection from "@/components/ui/testimonials-section";
import { TrustLogosText } from "@/components/ui/TrustLogos";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  TiltCard,
  TextReveal,
  CountUp,
  MagneticButton,
  CursorGlow,
  GradientText,
  Spotlight
} from "@/components/effects";

const Landing = () => {
  const stats = [
    { value: "500+", label: "Top Employers" },
    { value: "100+", label: "Academic Institutes" },
    { value: "20K+", label: "Jobs Posted" },
    { value: "15K+", label: "Students Placed" },
  ];

  const features = [
    {
      icon: FileText,
      title: "AI Resume Analysis",
      description: "Get instant feedback on your resume with our advanced AI scoring system",
      badge: "AI Assessment",
    },
    {
      icon: Target,
      title: "Smart Job Matching",
      description: "Our AI matches you with perfect opportunities based on your profile",
      badge: "AI Job Match",
    },
    {
      icon: MessageSquare,
      title: "Interview Preparation",
      description: "Practice with AI-powered interview simulations tailored to your field",
      badge: "AI Interview",
    },
  ];

  const benefits = [
    "AI-powered resume scoring and feedback",
    "Real-time interview preparation",
    "Direct employer connections",
    "Personalized career roadmaps",
    "Exclusive job opportunities",
    "24/7 career support",
  ];

  const comingSoonFeatures = [
    {
      icon: Video,
      title: "Mock Interview Platform",
      description: "Practice interviews with AI-powered feedback and industry-specific questions",
      color: "from-blue-500 to-cyan-500",
      badge: "Beta",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=interview&backgroundColor=b6e3f4",
    },
    {
      icon: Briefcase,
      title: "Job Hiring Portal",
      description: "Direct connections with top employers and exclusive job opportunities",
      color: "from-purple-500 to-pink-500",
      badge: "Active",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=jobs&backgroundColor=c0aede",
    },
    {
      icon: Award,
      title: "Professional Certifications",
      description: "Earn industry-recognized certifications to boost your career",
      color: "from-green-500 to-emerald-500",
      badge: "New",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=cert&backgroundColor=d1f4dd",
    },
    {
      icon: Building2,
      title: "College Hiring Solutions",
      description: "Campus recruitment platform for colleges and universities",
      color: "from-orange-500 to-red-500",
      badge: "Active",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=college&backgroundColor=ffd5cd",
    },
    {
      icon: Code,
      title: "Technical Assessment",
      description: "Codility-style coding challenges and skill assessments",
      color: "from-indigo-500 to-violet-500",
      badge: "Beta",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=code&backgroundColor=dcd3ff",
    },
    {
      icon: Users,
      title: "Employer Solutions",
      description: "Complete hiring platform for companies to find top talent",
      color: "from-teal-500 to-cyan-500",
      badge: "Active",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=employer&backgroundColor=ccf5f5",
    },
  ];

  return (
    <div className="min-h-screen bg-white font-outfit relative overflow-hidden">
      <ThreeBackground />
      <Navbar />

      {/* Hero Section - Resume Focused */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 bg-gradient-to-br from-primary via-primary to-[#4338ca]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
            {/* Left Side - Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-left"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-accent/20 border border-accent/30 px-4 py-2 rounded-full mb-6"
              >
                <Zap className="w-4 h-4 text-accent" />
                <span className="text-accent font-semibold text-sm">AI-Powered Resume Analysis</span>
              </motion.div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-white mb-6">
                Build a Resume That Gets You{" "}
                <span className="text-accent">Hired</span>
              </h1>

              <p className="text-xl text-white/90 mb-8 leading-relaxed">
                Create, analyze, and perfect your resume with AI. Get instant feedback, professional templates, and land your dream job faster.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link to="/resume">
                  <Button
                    size="lg"
                    className="bg-accent hover:bg-accent/90 text-black font-bold text-lg px-10 py-7 transition-colors duration-200"
                  >
                    Start Building Now
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/20">
                <div>
                  <div className="text-3xl font-bold text-accent mb-1">92%</div>
                  <div className="text-sm text-white/70">Success Rate</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-accent mb-1">15K+</div>
                  <div className="text-sm text-white/70">Resumes Built</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-accent mb-1">500+</div>
                  <div className="text-sm text-white/70">Companies</div>
                </div>
              </div>
            </motion.div>

            {/* Right Side - Resume Preview with AI Analysis */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="relative"
            >
              {/* Main Resume Card */}
              <div className="bg-white rounded-2xl shadow-lg p-8 relative">
                {/* Resume Header */}
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <div className="h-3 bg-gray-300 rounded w-2/3 mb-3"></div>
                  <div className="h-2 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-2 bg-gray-200 rounded w-1/3"></div>
                </div>

                {/* Resume Sections */}
                <div className="space-y-4">
                  {/* Experience Section with AI Badge */}
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-2.5 bg-primary rounded w-24"></div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.8 }}
                        className="absolute -right-2 -top-2"
                      >
                        <div className="bg-accent text-black text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Strong
                        </div>
                      </motion.div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 bg-gray-300 rounded w-full"></div>
                      <div className="h-2 bg-gray-300 rounded w-5/6"></div>
                      <div className="h-2 bg-gray-300 rounded w-4/6"></div>
                    </div>
                  </div>

                  {/* Skills Section */}
                  <div className="relative">
                    <div className="h-2.5 bg-primary rounded w-20 mb-2"></div>
                    <div className="flex gap-2 flex-wrap">
                      <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                      <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                      <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                      <div className="h-6 bg-gray-200 rounded-full w-24"></div>
                    </div>
                  </div>

                  {/* Education Section */}
                  <div>
                    <div className="h-2.5 bg-primary rounded w-24 mb-2"></div>
                    <div className="space-y-2">
                      <div className="h-2 bg-gray-300 rounded w-4/6"></div>
                      <div className="h-2 bg-gray-300 rounded w-3/6"></div>
                    </div>
                  </div>
                </div>

                {/* AI Score Badge - Top Right */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 1, type: "spring" }}
                  className="absolute -top-4 -right-4 bg-gradient-to-br from-accent to-accent/80 text-black rounded-2xl p-4 shadow-lg"
                >
                  <div className="text-center">
                    <div className="text-3xl font-bold">92</div>
                    <div className="text-xs font-semibold">AI Score</div>
                  </div>
                </motion.div>
              </div>

              {/* Floating Analysis Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-md p-4 border-2 border-accent/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">47 Job Matches</p>
                    <p className="text-xs text-muted-foreground">Based on your profile</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.4 }}
                className="absolute -top-4 -left-6 bg-primary text-white rounded-xl shadow-md p-3 hidden lg:block"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-semibold">ATS Optimized</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section - White Background */}
      <section id="features" className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              AI-Powered Resume Tools
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Everything you need to create the perfect resume and land your dream job
            </p>
          </FadeIn>

          <StaggerContainer className="grid md:grid-cols-3 gap-8" staggerDelay={0.15}>
            {features.map((feature, index) => (
              <StaggerItem key={feature.title}>
                <TiltCard className="h-full" tiltAmount={8} scale={1.02} glare glareOpacity={0.1}>
                  <Spotlight className="h-full">
                    <Card className="group hover:shadow-md transition-shadow duration-200 border-2 hover:border-primary/50 h-full bg-white">
                      <CardContent className="p-8">
                        <motion.div
                          className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors"
                          whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.5 } }}
                        >
                          <feature.icon className="w-8 h-8 text-primary" />
                        </motion.div>
                        <div className="inline-flex items-center gap-2 bg-accent/10 text-accent border border-accent/20 px-4 py-1.5 rounded-full text-sm font-bold mb-4">
                          <Zap className="w-4 h-4" />
                          {feature.badge}
                        </div>
                        <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                      </CardContent>
                    </Card>
                  </Spotlight>
                </TiltCard>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* How It Works Section - Black Background */}
      <section id="how-it-works" className="py-24 bg-black text-white">
        <CursorGlow
          className="w-full"
          glowColor="rgba(91, 104, 245, 0.15)"
          glowSize={500}
          glowBlur={100}
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn className="text-center mb-16">
              <h2 className="text-5xl md:text-6xl font-bold mb-6">How It Works</h2>
              <p className="text-xl text-white/70">Simple steps to your dream job</p>
            </FadeIn>

            <StaggerContainer className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto" staggerDelay={0.1}>
              {[
                { step: "01", title: "Upload Resume", desc: "Share your current resume with us" },
                { step: "02", title: "AI Analysis", desc: "Get instant feedback and scoring" },
                { step: "03", title: "Improve", desc: "Apply suggestions to enhance your resume" },
                { step: "04", title: "Apply", desc: "Get matched with perfect job opportunities" },
              ].map((item, index) => (
                <StaggerItem key={item.step} className="text-center group">
                  <motion.div
                    className="text-6xl font-bold text-accent/20 mb-4 transition-colors duration-300 group-hover:text-accent/40"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {item.step}
                  </motion.div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-accent transition-colors">{item.title}</h3>
                  <p className="text-white/70">{item.desc}</p>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <FadeIn delay={0.4} className="text-center mt-16">
              <Link to="/resume">
                <MagneticButton strength={0.3}>
                  <Button
                    size="lg"
                    className="bg-accent hover:bg-accent/90 text-black font-bold text-lg px-10 py-7"
                  >
                    Get Started Now
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </MagneticButton>
              </Link>
            </FadeIn>
          </div>
        </CursorGlow>
      </section>

      {/* Benefits Section - White Background */}
      <section id="about" className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeIn direction="left">
              <h2 className="text-5xl md:text-6xl font-bold mb-8">
                Why Choose <GradientText colors={['#5B68F5', '#c7ff6b', '#5B68F5']}>ApplyX</GradientText>?
              </h2>
              <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
                We combine cutting-edge AI technology with personalized career guidance to give you the competitive edge in today's job market.
              </p>
              <StaggerContainer className="space-y-4" staggerDelay={0.08}>
                {benefits.map((benefit, index) => (
                  <StaggerItem
                    key={benefit}
                    className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/30 transition-colors cursor-default"
                  >
                    <motion.div
                      className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5"
                      whileHover={{ scale: 1.2, rotate: 360 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CheckCircle className="w-4 h-4 text-accent" />
                    </motion.div>
                    <span className="text-lg">{benefit}</span>
                  </StaggerItem>
                ))}
              </StaggerContainer>
              <FadeIn delay={0.5}>
                <Link to="/resume">
                  <MagneticButton className="mt-10">
                    <Button
                      size="lg"
                      className="bg-primary hover:bg-primary/90 text-white text-lg px-8 py-6"
                    >
                      Get Started Now
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </MagneticButton>
                </Link>
              </FadeIn>
            </FadeIn>

            <FadeIn direction="right" delay={0.2}>
              <TiltCard tiltAmount={10} scale={1.02} glare glareOpacity={0.15}>
                <div className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-12 shadow-lg">
                  <div className="space-y-6">
                    <motion.div
                      className="bg-white/10 rounded-2xl p-6 border border-white/20"
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                          <Award className="w-6 h-6 text-black" />
                        </div>
                        <div>
                          <p className="text-white font-semibold text-lg">Resume Score</p>
                          <p className="text-white/70 text-sm">AI Analysis Complete</p>
                        </div>
                      </div>
                      <div className="flex items-end gap-2">
                        <span className="text-6xl font-bold text-white">
                          <CountUp to={92} duration={2.5} />
                        </span>
                        <span className="text-2xl text-white/70 mb-2">/100</span>
                      </div>
                    </motion.div>

                    <motion.div
                      className="bg-white/10 rounded-2xl p-6 border border-white/20"
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <p className="text-white font-semibold mb-3">Job Matches</p>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-accent/20 rounded-lg p-3 text-center">
                          <p className="text-3xl font-bold text-accent">
                            <CountUp to={47} duration={2} delay={0.3} />
                          </p>
                          <p className="text-xs text-white/70 mt-1">Active</p>
                        </div>
                        <div className="flex-1 bg-white/10 rounded-lg p-3 text-center">
                          <p className="text-3xl font-bold text-white">
                            <CountUp to={12} duration={1.5} delay={0.5} />
                          </p>
                          <p className="text-xs text-white/70 mt-1">Applied</p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </TiltCard>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* All Features Section - Gradient Background */}
      <section className="py-24 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-6 text-base px-6 py-2 bg-accent text-black font-bold">
              <Sparkles className="w-4 h-4 mr-2" />
              All Features
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Comprehensive tools and resources to accelerate your career journey
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {comingSoonFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Card className="group hover:shadow-md transition-shadow duration-200 bg-white hover:bg-white border-gray-200 h-full">
                  <CardContent className="p-6 space-y-4">
                    {/* Header with icon and badge */}
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <Badge className="bg-lime-400 text-black font-semibold px-3 py-1 text-xs">
                        {feature.badge}
                      </Badge>
                    </div>

                    {/* Title and description */}
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-black group-hover:text-primary transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>

                    {/* Action hint */}
                    <div className="pt-2">
                      <span className="text-sm text-primary font-medium group-hover:text-lime-500 transition-colors inline-flex items-center gap-1">
                        Learn more
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mock Interview & Job Board Section */}
      <section className="py-24 bg-black text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-6 text-base px-6 py-2 bg-accent text-black font-bold">
              <Zap className="w-4 h-4 mr-2" />
              Core Features
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Your Complete Career Toolkit
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Practice interviews, find jobs, and land your dream role
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Mock Interview Card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Link to="/interview/dashboard">
                <Card className="group h-full hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border-purple-500/20 hover:border-purple-500/50 cursor-pointer">
                  <CardContent className="p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Video className="w-8 h-8 text-white" />
                      </div>
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                        AI Powered
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">
                      Mock Interview Platform
                    </h3>
                    <p className="text-gray-400 mb-6 leading-relaxed">
                      Practice with our AI interviewer. Get real-time feedback, improve your answers, and ace your next interview.
                    </p>
                    <ul className="space-y-3 mb-6">
                      {['AI Voice Interviewer', 'Instant Feedback', 'STAR Method Training', 'Technical & Behavioral'].map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-gray-300">
                          <CheckCircle className="w-5 h-5 text-purple-400" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold transition-colors duration-200">
                      <Play className="w-5 h-5 mr-2" />
                      Start Practice Interview
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            {/* Job Board Card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Link to="/job-search">
                <Card className="group h-full hover:shadow-2xl hover:shadow-accent/20 transition-all duration-500 bg-gradient-to-br from-emerald-900/50 to-teal-900/50 border-accent/20 hover:border-accent/50 cursor-pointer">
                  <CardContent className="p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Briefcase className="w-8 h-8 text-black" />
                      </div>
                      <Badge className="bg-accent/20 text-accent border-accent/30">
                        20K+ Jobs
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-accent transition-colors">
                      Job Search Portal
                    </h3>
                    <p className="text-gray-400 mb-6 leading-relaxed">
                      Search across multiple job portals. Get AI-powered job recommendations matched to your resume.
                    </p>
                    <ul className="space-y-3 mb-6">
                      {['Real Jobs from Adzuna & LinkedIn', 'AI Job Matching', 'One-Click Apply', 'Save & Compare Jobs'].map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-gray-300">
                          <CheckCircle className="w-5 h-5 text-accent" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full bg-gradient-to-r from-accent to-emerald-500 hover:from-accent/90 hover:to-emerald-600 text-black font-bold transition-colors duration-200">
                      <Search className="w-5 h-5 mr-2" />
                      Find Jobs Now
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Logos Section */}
      <TrustLogosText title="Students placed at top companies" />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary via-primary to-indigo-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        </div>
        <CursorGlow
          className="w-full relative z-10"
          glowColor="rgba(199, 255, 107, 0.2)"
          glowSize={600}
          glowBlur={120}
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn className="text-center max-w-4xl mx-auto">
              <h2 className="text-5xl md:text-6xl font-bold mb-6">
                Ready to Launch Your Career?
              </h2>
              <p className="text-xl text-white/80 mb-10 leading-relaxed">
                Join thousands of successful students who have landed their dream jobs with ApplyX
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/resume">
                  <MagneticButton strength={0.25}>
                    <Button
                      size="lg"
                      className="bg-accent hover:bg-accent/90 text-black font-bold text-lg px-10 py-7 transition-colors duration-200"
                    >
                      Start Building Your Resume
                      <TrendingUp className="ml-2 w-5 h-5" />
                    </Button>
                  </MagneticButton>
                </Link>
                <Link to="/interview/dashboard">
                  <MagneticButton strength={0.25}>
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10 font-bold text-lg px-10 py-7 transition-colors duration-200"
                    >
                      <Video className="mr-2 w-5 h-5" />
                      Practice Interview
                    </Button>
                  </MagneticButton>
                </Link>
              </div>
            </FadeIn>
          </div>
        </CursorGlow>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
