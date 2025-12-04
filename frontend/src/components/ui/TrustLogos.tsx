/**
 * TrustLogos Component
 * ====================
 * 
 * A company logo bar showing where users have been placed.
 * Features:
 * - Grayscale logos that colorize on hover
 * - Infinite scroll animation
 * - Responsive grid layout
 */

import { motion } from "framer-motion";

interface CompanyLogo {
  name: string;
  logo: string;
}

interface TrustLogosProps {
  logos?: CompanyLogo[];
  title?: string;
  variant?: "scroll" | "grid";
}

// Default company logos (using inline SVG for reliability)
const defaultLogos: CompanyLogo[] = [
  { name: "Google", logo: "/logos/google.svg" },
  { name: "Microsoft", logo: "/logos/microsoft.svg" },
  { name: "Amazon", logo: "/logos/amazon.svg" },
  { name: "Meta", logo: "/logos/meta.svg" },
  { name: "Apple", logo: "/logos/apple.svg" },
  { name: "Netflix", logo: "/logos/netflix.svg" },
];

export const TrustLogos = ({ 
  logos = defaultLogos, 
  title = "Trusted by students placed at",
  variant = "grid"
}: TrustLogosProps) => {
  
  if (variant === "scroll") {
    return (
      <div className="py-12 overflow-hidden bg-gray-50">
        <div className="container mx-auto px-4 mb-8">
          <p className="text-center text-gray-500 text-sm font-medium uppercase tracking-wider">
            {title}
          </p>
        </div>
        
        {/* Infinite Scroll */}
        <div className="relative">
          <div className="flex animate-scroll">
            {[...logos, ...logos].map((company, index) => (
              <div
                key={`${company.name}-${index}`}
                className="flex-shrink-0 mx-8 md:mx-12"
              >
                <img
                  src={company.logo}
                  alt={company.name}
                  className="h-8 md:h-10 w-auto grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Grid variant (default)
  return (
    <div className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-gray-500 text-sm font-medium uppercase tracking-wider mb-10"
        >
          {title}
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16"
        >
          {logos.map((company, index) => (
            <motion.div
              key={company.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.1, y: -2 }}
              className="group cursor-pointer"
            >
              <div className="h-8 md:h-10 flex items-center justify-center px-4">
                <span className="text-xl md:text-2xl font-bold text-gray-400 group-hover:text-gray-800 transition-colors duration-300">
                  {company.name}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

/**
 * Simpler text-based logo display (no external images)
 * More reliable and faster loading
 */
export const TrustLogosText = ({ 
  title = "Students placed at top companies" 
}: { title?: string }) => {
  const companies = ["Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix", "Spotify", "Adobe"];

  return (
    <section className="py-12 bg-white border-y border-gray-100">
      <div className="container mx-auto px-4">
        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-gray-400 text-sm font-medium uppercase tracking-wider mb-8"
        >
          {title}
        </motion.p>
        
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:gap-x-12">
          {companies.map((company, index) => (
            <motion.span
              key={company}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05, color: "#5B68F5" }}
              className="text-lg md:text-xl font-bold text-gray-300 hover:text-primary transition-colors duration-300 cursor-default"
            >
              {company}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustLogos;
