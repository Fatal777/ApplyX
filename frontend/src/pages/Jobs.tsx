import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Briefcase, Search, TrendingUp, Star, Building2, MapPin, DollarSign, Clock, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import Footer from "@/components/Footer";
import ThreeBackground from "@/components/ThreeBackground";

const Jobs = () => {
  const features = [
    {
      icon: Search,
      title: "Smart Job Matching",
      description: "AI analyzes your profile to find the perfect opportunities tailored to your skills",
    },
    {
      icon: Star,
      title: "Exclusive Listings",
      description: "Access jobs from top companies that aren't available on other platforms",
    },
    {
      icon: TrendingUp,
      title: "Career Growth",
      description: "Track your application progress and get insights on career advancement",
    },
    {
      icon: Building2,
      title: "Top Companies",
      description: "Connect with leading employers across industries actively hiring",
    },
  ];

  const jobCategories = [
    { name: "Software Engineering", count: "2,500+", icon: "💻" },
    { name: "Data Science", count: "1,800+", icon: "📊" },
    { name: "Product Management", count: "950+", icon: "📱" },
    { name: "Design", count: "720+", icon: "🎨" },
    { name: "Marketing", count: "1,200+", icon: "📈" },
    { name: "Sales", count: "890+", icon: "💼" },
  ];

  const companies = [
    "Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix", 
    "Uber", "Airbnb", "Spotify", "Tesla", "Twitter", "LinkedIn"
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
              <span className="text-accent font-semibold text-sm">20K+ Active Job Listings</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-white mb-6"
            >
              Find Your Dream Job with AI
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-white/90 mb-8 leading-relaxed"
            >
              Discover opportunities from top companies, get personalized job recommendations, and land your next role faster.
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
                  Join Waitlist
                  <ArrowRight className="ml-2 w-5 h-5" />
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
                <div className="text-4xl font-bold text-accent mb-2">20K+</div>
                <div className="text-white/70">Active Jobs</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-accent mb-2">500+</div>
                <div className="text-white/70">Companies</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-accent mb-2">15K+</div>
                <div className="text-white/70">Hired</div>
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
              Your Job Search, Simplified
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Advanced tools to help you find and land your perfect role
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

      {/* Job Categories */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Browse by Category
            </h2>
            <p className="text-xl text-muted-foreground">
              Find opportunities in your field
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {jobCategories.map((category, index) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">{category.icon}</div>
                        <div>
                          <h3 className="font-bold text-lg">{category.name}</h3>
                          <p className="text-muted-foreground">{category.count} jobs</p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-primary" />
                    </div>
                  </CardContent>
                </Card>
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
              Top Companies Hiring
            </h2>
            <p className="text-xl text-white/80">
              Join thousands at leading tech companies
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {companies.map((company, index) => (
              <motion.div
                key={company}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl p-6 text-center hover:bg-white/20 transition-all duration-300"
              >
                <p className="font-bold text-lg">{company}</p>
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
            <Briefcase className="w-16 h-16 text-accent mx-auto mb-6" />
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Ready to Find Your Dream Job?
            </h2>
            <p className="text-xl text-white/80 mb-10">
              Join our waitlist for early access to exclusive opportunities
            </p>
            <Link to="/signup">
              <Button 
                size="lg"
                className="bg-accent hover:bg-accent/90 text-black font-bold text-lg px-10 py-7"
              >
                Join Waitlist
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

export default Jobs;
