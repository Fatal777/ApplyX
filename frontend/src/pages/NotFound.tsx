import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThreeBackground from "@/components/ThreeBackground";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0A1628] via-[#0F1E38] to-[#1A2942] p-4 relative overflow-hidden">
      <ThreeBackground />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl"
      >
        <motion.div
          animate={{ 
            rotate: [0, 10, -10, 10, 0],
          }}
          transition={{ 
            duration: 0.5,
            repeat: Infinity,
            repeatDelay: 3
          }}
          className="inline-block mb-8"
        >
          <AlertCircle className="w-24 h-24 text-[#c7ff6b]" />
        </motion.div>
        
        <h1 className="mb-4 text-8xl md:text-9xl font-black text-white">404</h1>
        <h2 className="mb-6 text-3xl md:text-4xl font-bold text-white">Page Not Found</h2>
        <p className="mb-12 text-xl text-white/70 leading-relaxed">
          Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/">
            <Button variant="premium" size="lg" className="group">
              <Home className="w-5 h-5" />
              Back to Home
            </Button>
          </Link>
          <Link to="/resume-builder">
            <Button variant="outline" size="lg" className="group border-white/30 text-white hover:bg-white/10">
              <Search className="w-5 h-5" />
              Build Resume
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
