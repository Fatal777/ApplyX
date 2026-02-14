import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Building2, Users, Target, BarChart, CheckCircle, Clock, ArrowRight, Sparkles, Search, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import Footer from "@/components/Footer";
import ThreeBackground from "@/components/ThreeBackground";

const Employers = () => {
  const features = [
    {
      icon: Search,
      title: "Smart Candidate Search",
      description: "AI-powered search to find candidates with the exact skills you need",
    },
    {
      icon: Users,
      title: "Talent Pool Access",
      description: "Connect with thousands of pre-vetted, qualified candidates",
    },
    {
      icon: Target,
      title: "Precision Matching",
      description: "Get matched with candidates that fit your company culture and requirements",
    },
    {
      icon: BarChart,
      title: "Hiring Analytics",
      description: "Track your hiring pipeline and optimize your recruitment process",
    },
  ];

  const benefits = [
    "Access to 15,000+ verified candidates",
    "AI-powered candidate matching",
    "Technical assessment tools",
    "Automated interview scheduling",
    "Integrated video interviews",
    "Campus recruitment portal",
    "Real-time hiring analytics",
    "Dedicated account manager",
  ];

  const companies = [
    { name: "TechCorp", employees: "500-1000", industry: "Technology" },
    { name: "FinServe Inc", employees: "1000+", industry: "Finance" },
    { name: "HealthPlus", employees: "100-500", industry: "Healthcare" },
    { name: "EduTech Solutions", employees: "50-100", industry: "Education" },
    { name: "RetailMax", employees: "1000+", industry: "Retail" },
    { name: "ConsultPro", employees: "500-1000", industry: "Consulting" },
  ];

  const hiringFeatures = [
    { title: "Job Posting", description: "Post unlimited jobs and reach qualified candidates" },
    { title: "Candidate Database", description: "Search through our extensive talent pool" },
    { title: "Assessment Tools", description: "Built-in technical and skill assessments" },
    { title: "Interview Scheduling", description: "Automated scheduling and reminders" },
    { title: "Analytics Dashboard", description: "Track metrics and optimize hiring" },
    { title: "Campus Recruitment", description: "Direct access to college talent" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-4 md:px-8 py-4">
          <img src="/Dark BG Logo.png" alt="ApplyX Logo" className="h-10 md:h-12 w-auto" />
          <a href="/resume-builder" className="text-sm font-medium text-black">Upload Resume</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 bg-gradient-to-br from-primary via-primary to-[#4338ca] text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-accent/20 backdrop-blur-sm border border-accent/30 px-4 py-2 rounded-full mb-6"
            >
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-accent font-semibold text-sm">For Employers & Recruiters</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-white mb-6"
            >
              Hire Top Talent Faster
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-white/90 mb-8 leading-relaxed"
            >
              Complete hiring platform to find, assess, and hire the best candidates. Streamline your recruitment with AI-powered tools.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Badge className="mb-8 bg-[#c7ff6b] text-black border-2 border-black font-bold text-lg px-6 py-3">
                <Sparkles className="w-5 h-5 mr-2" />
                Now Available
              </Badge>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link to="/signup">
                <Button 
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-black font-bold text-lg px-10 py-7"
                >
                  Request Demo
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/landing">
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white hover:text-primary font-bold text-lg px-10 py-7"
                >
                  Learn More
                </Button>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-white/20"
            >
              <div>
                <div className="text-4xl font-bold text-accent mb-2">15K+</div>
                <div className="text-white/70">Candidates</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-accent mb-2">500+</div>
                <div className="text-white/70">Companies</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-accent mb-2">95%</div>
                <div className="text-white/70">Success Rate</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Complete Hiring Solution
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Everything you need to find and hire the best talent
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-2 rounded-xl md:rounded-2xl">
                  <CardContent className="p-6">
                    <div className="w-14 h-14 rounded-xl bg-black flex items-center justify-center mb-4">
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-black">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Hiring Features */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Powerful Recruitment Tools
            </h2>
            <p className="text-xl text-muted-foreground">
              All the features you need in one platform
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {hiringFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-2">
                  <CardContent className="p-6">
                    <CheckCircle className="w-8 h-8 text-primary mb-4" />
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Why Choose Us
            </h2>
            <p className="text-xl text-muted-foreground">
              Benefits that help you hire faster and better
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 bg-gray-50 border-2 rounded-xl p-4"
              >
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm font-medium">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Companies Section */}
      <section className="py-24 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Trusted by Leading Companies
            </h2>
            <p className="text-xl text-white/80">
              Join companies already hiring with us
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {companies.map((company, index) => (
              <motion.div
                key={company.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-white/10 backdrop-blur-sm border-2 border-white/20 hover:bg-white/20 transition-all duration-300">
                  <CardContent className="p-6">
                    <Building2 className="w-8 h-8 text-accent mb-3" />
                    <h3 className="text-xl font-bold text-white mb-2">{company.name}</h3>
                    <p className="text-white/70 text-sm mb-1">{company.employees} employees</p>
                    <p className="text-white/60 text-sm">{company.industry}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-black text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-4xl mx-auto"
          >
            <Award className="w-16 h-16 text-accent mx-auto mb-6" />
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Ready to Transform Your Hiring?
            </h2>
            <p className="text-xl text-white/80 mb-10">
              Request a demo and see how we can help you find top talent
            </p>
            <Link to="/signup">
              <Button 
                size="lg"
                className="bg-accent hover:bg-accent/90 text-black font-bold text-lg px-10 py-7"
              >
                Request Demo
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Employers;
