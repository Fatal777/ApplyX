/**
 * TestimonialCard Component
 * =========================
 * 
 * A premium testimonial card with:
 * - Unsplash/RandomUser profile photos
 * - Hover zoom effect on photo
 * - Smooth reveal animation
 * - Company logo integration
 */

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

export interface Testimonial {
  id: number;
  name: string;
  role: string;
  company: string;
  companyLogo?: string;
  quote: string;
  rating: number;
  photoUrl: string;
  linkedIn?: string;
}

interface TestimonialCardProps {
  testimonial: Testimonial;
  index?: number;
  variant?: "default" | "compact" | "featured";
}

export const TestimonialCard = ({ 
  testimonial, 
  index = 0,
  variant = "default" 
}: TestimonialCardProps) => {
  const { name, role, company, companyLogo, quote, rating, photoUrl } = testimonial;

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.1, duration: 0.5 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow duration-300"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="relative group">
            <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-primary/20">
              <motion.img
                src={photoUrl}
                alt={name}
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{name}</p>
            <p className="text-sm text-gray-500">{role}</p>
          </div>
        </div>
        <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">"{quote}"</p>
      </motion.div>
    );
  }

  if (variant === "featured") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.15, duration: 0.6 }}
        className="relative bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-8 md:p-10 text-white overflow-hidden"
      >
        {/* Background Quote */}
        <Quote className="absolute top-6 right-6 w-24 h-24 text-white/10" />
        
        {/* Stars */}
        <div className="flex gap-1 mb-6">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-5 h-5 ${i < rating ? "text-accent fill-accent" : "text-white/30"}`}
            />
          ))}
        </div>

        {/* Quote */}
        <p className="text-xl md:text-2xl font-medium leading-relaxed mb-8 relative z-10">
          "{quote}"
        </p>

        {/* Author */}
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-16 h-16 rounded-full overflow-hidden ring-4 ring-white/20 group-hover:ring-accent/50 transition-all duration-300">
              <motion.img
                src={photoUrl}
                alt={name}
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.15 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg">{name}</p>
            <p className="text-white/80">{role}</p>
            <div className="flex items-center gap-2 mt-1">
              {companyLogo ? (
                <img src={companyLogo} alt={company} className="h-5 brightness-0 invert opacity-80" />
              ) : (
                <span className="text-sm text-accent font-medium">{company}</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="group bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:border-primary/20 transition-all duration-500"
    >
      {/* Quote Icon */}
      <div className="mb-4">
        <Quote className="w-8 h-8 text-primary/20 group-hover:text-primary/40 transition-colors" />
      </div>

      {/* Stars */}
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < rating ? "text-accent fill-accent" : "text-gray-200"}`}
          />
        ))}
      </div>

      {/* Quote */}
      <p className="text-gray-700 leading-relaxed mb-6 text-lg">
        "{quote}"
      </p>

      {/* Author */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
        <div className="relative overflow-hidden rounded-full">
          <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-gray-100 group-hover:ring-primary/30 transition-all duration-300">
            <motion.img
              src={photoUrl}
              alt={name}
              className="w-full h-full object-cover"
              whileHover={{ scale: 1.15 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-900">{name}</p>
          <p className="text-sm text-gray-500">{role}</p>
        </div>
        {companyLogo ? (
          <img 
            src={companyLogo} 
            alt={company} 
            className="h-6 opacity-60 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0" 
          />
        ) : (
          <span className="text-xs text-gray-400 font-medium">{company}</span>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Testimonials data with real Unsplash photos
 * Photos are from Unsplash's free collection - no attribution required
 */
export const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Sarah Chen",
    role: "Software Engineer",
    company: "Google",
    quote: "ApplyX helped me land my dream job at Google! The AI feedback on my resume was incredibly detailed and actionable. My ATS score went from 62 to 94 in just two iterations.",
    rating: 5,
    photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: 2,
    name: "Marcus Johnson",
    role: "Product Manager",
    company: "Microsoft",
    quote: "The mock interview feature is a game-changer. I practiced with the AI interviewer daily for two weeks, and it completely transformed my confidence. Got 3 offers!",
    rating: 5,
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: 3,
    name: "Priya Sharma",
    role: "Data Scientist",
    company: "Amazon",
    quote: "As an international student, I was struggling with resume formats. ApplyX not only fixed that but matched me with roles I hadn't even considered. Incredible platform!",
    rating: 5,
    photoUrl: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: 4,
    name: "David Park",
    role: "UX Designer",
    company: "Meta",
    quote: "The job matching algorithm understood my skills better than I did. Within a month of using ApplyX, I had interviews lined up at top tech companies.",
    rating: 5,
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
  },
];

/**
 * Company logos for trust section
 */
export const companyLogos = [
  { name: "Google", logo: "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" },
  { name: "Microsoft", logo: "https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE1Mu3b?ver=5c31" },
  { name: "Amazon", logo: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg" },
  { name: "Meta", logo: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg" },
  { name: "Apple", logo: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { name: "Netflix", logo: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg" },
];

export default TestimonialCard;
