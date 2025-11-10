import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Code, CheckCircle, Timer, TrendingUp, Award, Target, Clock, ArrowRight, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ThreeBackground from "@/components/ThreeBackground";

const Assessments = () => {
  const features = [
    {
      icon: Code,
      title: "Coding Challenges",
      description: "Practice with real-world coding problems from easy to advanced levels",
    },
    {
      icon: Timer,
      title: "Timed Assessments",
      description: "Simulate real interview conditions with time-bound challenges",
    },
    {
      icon: TrendingUp,
      title: "Skill Tracking",
      description: "Monitor your progress across different technologies and concepts",
    },
    {
      icon: Award,
      title: "Certifications",
      description: "Earn verified certificates to showcase your technical expertise",
    },
  ];

  const assessmentTypes = [
    { title: "Data Structures & Algorithms", icon: "🔢", count: "500+ problems" },
    { title: "System Design", icon: "🏗️", count: "100+ scenarios" },
    { title: "Frontend Development", icon: "🎨", count: "200+ challenges" },
    { title: "Backend Development", icon: "⚙️", count: "250+ problems" },
    { title: "Database Design", icon: "🗄️", count: "150+ questions" },
    { title: "Cloud & DevOps", icon: "☁️", count: "180+ tasks" },
  ];

  const languages = [
    "Python", "JavaScript", "Java", "C++", "TypeScript", "Go",
    "Ruby", "Rust", "Kotlin", "Swift", "SQL", "Shell"
  ];

  const companyStyle = [
    "Google", "Amazon", "Microsoft", "Meta", "Apple", "Netflix",
    "Uber", "Airbnb", "LinkedIn", "Twitter", "Stripe", "Shopify"
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
              <span className="text-accent font-semibold text-sm">1000+ Coding Challenges</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-white mb-6"
            >
              Master Technical Interviews
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-white/90 mb-8 leading-relaxed"
            >
              Practice coding challenges, system design, and technical assessments like Codility. Get ready for top tech companies.
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
                <div className="text-4xl font-bold text-accent mb-2">1000+</div>
                <div className="text-white/70">Problems</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-accent mb-2">12+</div>
                <div className="text-white/70">Languages</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-accent mb-2">50K+</div>
                <div className="text-white/70">Solved</div>
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
              Complete Technical Assessment Platform
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Everything you need to prepare for technical interviews
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

      {/* Assessment Types */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Assessment Categories
            </h2>
            <p className="text-xl text-muted-foreground">
              Practice across various technical domains
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {assessmentTypes.map((type, index) => (
              <motion.div
                key={type.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-primary">
                  <CardContent className="p-6">
                    <div className="text-4xl mb-4">{type.icon}</div>
                    <h3 className="text-xl font-bold mb-2">{type.title}</h3>
                    <p className="text-muted-foreground text-sm">{type.count}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Languages Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Multiple Programming Languages
            </h2>
            <p className="text-xl text-muted-foreground">
              Code in your preferred language
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
            {languages.map((lang, index) => (
              <motion.div
                key={lang}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <Badge variant="outline" className="text-lg px-6 py-3 border-2">
                  {lang}
                </Badge>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Style */}
      <section className="py-24 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Zap className="w-12 h-12 text-accent mx-auto mb-4" />
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Company-Style Problems
            </h2>
            <p className="text-xl text-white/80">
              Practice with questions asked by top tech companies
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {companyStyle.map((company, index) => (
              <motion.div
                key={company}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl p-4 text-center hover:bg-white/20 transition-all duration-300"
              >
                <p className="font-bold">{company}</p>
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
            <Code className="w-16 h-16 text-accent mx-auto mb-6" />
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Start Practicing Today
            </h2>
            <p className="text-xl text-white/80 mb-10">
              Join thousands preparing for technical interviews
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

export default Assessments;
