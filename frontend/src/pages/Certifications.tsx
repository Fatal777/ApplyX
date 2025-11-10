import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Award, CheckCircle, TrendingUp, Users, Clock, ArrowRight, Sparkles, BookOpen, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ThreeBackground from "@/components/ThreeBackground";

const Certifications = () => {
  const features = [
    {
      icon: Award,
      title: "Industry Recognized",
      description: "Earn certificates that employers value and recognize across industries",
    },
    {
      icon: BookOpen,
      title: "Expert Content",
      description: "Learn from industry experts with curated, up-to-date course materials",
    },
    {
      icon: TrendingUp,
      title: "Career Boost",
      description: "Stand out in the job market with verified professional certifications",
    },
    {
      icon: Users,
      title: "Community Support",
      description: "Join a community of learners and get help when you need it",
    },
  ];

  const certificationTracks = [
    {
      title: "Full Stack Development",
      duration: "12 weeks",
      level: "Beginner to Advanced",
      icon: "💻",
      modules: 8,
    },
    {
      title: "Data Science & Analytics",
      duration: "10 weeks",
      level: "Intermediate",
      icon: "📊",
      modules: 6,
    },
    {
      title: "Cloud Architecture",
      duration: "8 weeks",
      level: "Advanced",
      icon: "☁️",
      modules: 7,
    },
    {
      title: "Product Management",
      duration: "6 weeks",
      level: "All Levels",
      icon: "📱",
      modules: 5,
    },
    {
      title: "Digital Marketing",
      duration: "8 weeks",
      level: "Beginner",
      icon: "📈",
      modules: 6,
    },
    {
      title: "Cybersecurity",
      duration: "10 weeks",
      level: "Intermediate",
      icon: "🔒",
      modules: 8,
    },
  ];

  const benefits = [
    "Lifetime access to course materials",
    "Hands-on projects and real-world scenarios",
    "Industry-recognized certificates",
    "Career guidance and mentorship",
    "Job placement assistance",
    "Flexible learning schedule",
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
              <span className="text-accent font-semibold text-sm">Industry-Recognized Certifications</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-white mb-6"
            >
              Earn Certificates That Open Doors
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-white/90 mb-8 leading-relaxed"
            >
              Gain industry-recognized certifications to boost your career, showcase your expertise, and stand out to employers.
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
              Why Choose Our Certifications?
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Quality education with certificates that matter
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

      {/* Certification Tracks */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Certification Programs
            </h2>
            <p className="text-xl text-muted-foreground">
              Choose from industry-leading certification tracks
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {certificationTracks.map((track, index) => (
              <motion.div
                key={track.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-2 hover:border-primary">
                  <CardContent className="p-6">
                    <div className="text-5xl mb-4">{track.icon}</div>
                    <h3 className="text-xl font-bold mb-3">{track.title}</h3>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{track.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <GraduationCap className="w-4 h-4" />
                        <span>{track.level}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="w-4 h-4" />
                        <span>{track.modules} modules</span>
                      </div>
                    </div>
                    <Button className="w-full bg-primary hover:bg-primary/90">
                      Learn More
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              What You Get
            </h2>
            <p className="text-xl text-white/80">
              Everything you need to succeed
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl p-6"
              >
                <CheckCircle className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
                <span className="text-lg">{benefit}</span>
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
              Start Your Learning Journey
            </h2>
            <p className="text-xl text-white/80 mb-10">
              Join thousands earning professional certifications
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

export default Certifications;
