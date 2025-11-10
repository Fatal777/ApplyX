import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { GraduationCap, Users, BarChart, Calendar, Target, CheckCircle, Clock, ArrowRight, Sparkles, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ThreeBackground from "@/components/ThreeBackground";

const CollegeSolutions = () => {
  const features = [
    {
      icon: Calendar,
      title: "Campus Recruitment",
      description: "Streamline your placement drives with automated scheduling and management",
    },
    {
      icon: Users,
      title: "Student Database",
      description: "Centralized student profiles with skills, projects, and academic records",
    },
    {
      icon: BarChart,
      title: "Analytics Dashboard",
      description: "Track placement rates, student performance, and employer engagement metrics",
    },
    {
      icon: Target,
      title: "Employer Matching",
      description: "AI-powered matching to connect students with the right opportunities",
    },
  ];

  const benefits = [
    "Automated placement drive management",
    "Centralized student data platform",
    "Real-time analytics and reporting",
    "Seamless employer communication",
    "Resume database and search",
    "Interview scheduling automation",
    "Placement tracking and reports",
    "Alumni network integration",
  ];

  const colleges = [
    { name: "IIT Delhi", students: "2,500+" },
    { name: "IIT Bombay", students: "3,000+" },
    { name: "BITS Pilani", students: "2,200+" },
    { name: "NIT Trichy", students: "1,800+" },
    { name: "IIIT Hyderabad", students: "1,500+" },
    { name: "VIT Vellore", students: "4,000+" },
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
              <span className="text-accent font-semibold text-sm">For Colleges & Universities</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-white mb-6"
            >
              Campus Recruitment Made Simple
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-white/90 mb-8 leading-relaxed"
            >
              Complete platform for colleges to manage placements, connect with employers, and help students succeed in their careers.
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
                <div className="text-4xl font-bold text-accent mb-2">100+</div>
                <div className="text-white/70">Colleges</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-accent mb-2">500+</div>
                <div className="text-white/70">Companies</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-accent mb-2">15K+</div>
                <div className="text-white/70">Placements</div>
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
              Everything Your Placement Cell Needs
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Powerful tools designed for modern campus recruitment
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

      {/* Benefits Section */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Comprehensive Platform Features
            </h2>
            <p className="text-xl text-muted-foreground">
              All the tools you need in one place
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 bg-white border-2 rounded-xl p-4"
              >
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm font-medium">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner Colleges */}
      <section className="py-24 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Trusted by Top Institutions
            </h2>
            <p className="text-xl text-white/80">
              Join leading colleges using our platform
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {colleges.map((college, index) => (
              <motion.div
                key={college.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-white/10 backdrop-blur-sm border-2 border-white/20 hover:bg-white/20 transition-all duration-300">
                  <CardContent className="p-6">
                    <Building2 className="w-8 h-8 text-accent mb-3" />
                    <h3 className="text-xl font-bold text-white mb-2">{college.name}</h3>
                    <p className="text-white/70">{college.students} students</p>
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
            <GraduationCap className="w-16 h-16 text-accent mx-auto mb-6" />
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Transform Your Campus Placements
            </h2>
            <p className="text-xl text-white/80 mb-10">
              Request a demo and see how we can help your institution
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

export default CollegeSolutions;
