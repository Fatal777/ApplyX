import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, Settings, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Check if we're on a dark section (hero section)
  const isDarkSection = () => {
    if (typeof window === 'undefined') return false;
    const scrollPosition = window.scrollY;
    // Hero section is dark (blue gradient), so navbar should use light elements
    return scrollPosition < 600; // Adjust based on hero section height
  };

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      setIsDark(isDarkSection());
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navLinks = [
    { name: "Jobs", path: "/job-search", section: null },
    { name: "Features", path: "/#features", section: "features" },
    { name: "How It Works", path: "/#how-it-works", section: "how-it-works" },
    { name: "Pricing", path: "/pricing", section: null },
  ];

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleNavClick = (e: React.MouseEvent, path: string, section?: string | null) => {
    e.preventDefault();
    
    // If it's a direct path (like /pricing), just navigate
    if (!section) {
      navigate(path);
      return;
    }
    
    // Handle section scrolling
    if (section) {
      if (location.pathname === '/') {
        // Already on home page, just scroll
        scrollToSection(section);
      } else {
        // Navigate to home first, then scroll
        navigate('/');
        setTimeout(() => {
          const element = document.getElementById(section);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${
        isScrolled
          ? "bg-white border-b border-gray-200 shadow-lg"
          : "bg-black border-b border-gray-800"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center group relative">
            <img 
              src={isScrolled ? "/Light BG Logo.png" : "/Dark BG Logo.png"}
              alt="ApplyX Logo"
              className="h-24 md:h-32 w-auto transition-all duration-500 ease-in-out hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link, index) => (
              <motion.div
                key={link.name}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <a
                  href={link.path}
                  onClick={(e) => handleNavClick(e, link.path, link.section)}
                  className={`relative font-medium transition-all duration-300 hover:text-lime-400 ${
                    isScrolled ? "text-gray-700 hover:text-black" : "text-white"
                  }`}
                >
                  {link.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-lime-400 group-hover:w-full transition-all duration-300" />
                </a>
              </motion.div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link to="/dashboard" className={`font-medium transition-all duration-300 ${
                  isScrolled ? "text-gray-700 hover:text-black" : "text-white hover:text-lime-400"
                }`}>
                  Dashboard
                </Link>
                <Link to="/ats-templates" className={`font-medium transition-all duration-300 ${
                  isScrolled ? "text-gray-700 hover:text-black" : "text-white hover:text-lime-400"
                }`}>
                  Templates
                </Link>
                
                {/* User Avatar with Profile Picture - Clickable for dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-lime-400 hover:ring-lime-500 transition-all duration-300">
                      <AvatarImage src={user.user_metadata?.avatar_url || user.user_metadata?.picture} alt={user.email} />
                      <AvatarFallback className="bg-lime-400 text-black font-bold">
                        {user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/settings#profile')}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button 
                    variant="ghost"
                    className={`transition-all duration-300 ${
                      isScrolled ? "text-gray-700 hover:text-black hover:bg-gray-100" : "text-white hover:text-lime-400 hover:bg-white/10"
                    }`}
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-lime-400 hover:bg-lime-500 text-black font-bold shadow-lg hover:shadow-lime-400/50 transition-all duration-300">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden p-2 rounded-lg transition-all duration-300 ${
              isScrolled ? "text-gray-700 hover:bg-gray-100" : "text-white hover:bg-white/10"
            }`}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden overflow-hidden rounded-2xl mt-2 border border-gray-200 shadow-xl bg-white"
            >
              <div className="p-6 space-y-4">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.path}
                    onClick={(e) => {
                      handleNavClick(e, link.path, link.section);
                      setIsMobileMenuOpen(false);
                    }}
                    className="block py-2 transition-colors font-medium text-gray-700 hover:text-black hover:text-lime-400"
                  >
                    {link.name}
                  </a>
                ))}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  {user ? (
                    <>
                      <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start">
                          Dashboard
                        </Button>
                      </Link>
                      <Link to="/ats-templates" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start">
                          Templates
                        </Button>
                      </Link>
                      <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Button>
                      </Link>
                      <Link to="/settings#profile" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-red-600"
                        onClick={() => {
                          handleSignOut();
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full">
                          Sign In
                        </Button>
                      </Link>
                      <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button className="w-full bg-lime-400 hover:bg-lime-500 text-black font-bold">
                          Get Started
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default Navbar;
