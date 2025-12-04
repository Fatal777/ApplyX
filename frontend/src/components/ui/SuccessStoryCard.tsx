/**
 * SuccessStoryCard Component
 * ==========================
 * 
 * A compact success story card showing:
 * - User photo and name
 * - Before/After score improvement
 * - Company they got hired at
 * - Brief quote
 */

import { motion } from "framer-motion";
import { TrendingUp, Sparkles, ArrowRight } from "lucide-react";

export interface SuccessStory {
  id: number;
  name: string;
  role: string;
  company: string;
  photoUrl: string;
  scoreBefore: number;
  scoreAfter: number;
  quote: string;
}

interface SuccessStoryCardProps {
  story: SuccessStory;
  variant?: "compact" | "full";
}

export const SuccessStoryCard = ({ story, variant = "compact" }: SuccessStoryCardProps) => {
  const { name, role, company, photoUrl, scoreBefore, scoreAfter, quote } = story;
  const improvement = scoreAfter - scoreBefore;

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-4 border border-primary/10"
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wide">Success Story</span>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-accent/30">
            <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">{name}</p>
            <p className="text-xs text-gray-500 truncate">{role} at {company}</p>
          </div>
        </div>

        {/* Score Improvement */}
        <div className="flex items-center justify-between bg-white rounded-lg p-3 mb-3">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-400">{scoreBefore}</p>
            <p className="text-[10px] text-gray-400 uppercase">Before</p>
          </div>
          <div className="flex items-center gap-1 text-accent">
            <ArrowRight className="w-4 h-4" />
            <span className="text-xs font-bold">+{improvement}</span>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-accent">{scoreAfter}</p>
            <p className="text-[10px] text-gray-400 uppercase">After</p>
          </div>
        </div>

        {/* Quote */}
        <p className="text-xs text-gray-600 italic leading-relaxed line-clamp-2">
          "{quote}"
        </p>
      </motion.div>
    );
  }

  // Full variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-accent" />
        </div>
        <span className="text-sm font-semibold text-primary">Success Story</span>
      </div>

      {/* User Info */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-full overflow-hidden ring-4 ring-accent/20">
          <motion.img 
            src={photoUrl} 
            alt={name} 
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div>
          <p className="font-bold text-gray-900">{name}</p>
          <p className="text-sm text-gray-500">{role}</p>
          <p className="text-sm font-medium text-primary">Now at {company}</p>
        </div>
      </div>

      {/* Score Improvement */}
      <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-accent/5 rounded-xl p-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-400">{scoreBefore}</p>
          <p className="text-xs text-gray-500 uppercase">Before</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 text-accent">
            <TrendingUp className="w-5 h-5" />
            <span className="text-xl font-bold">+{improvement}</span>
          </div>
          <span className="text-[10px] text-gray-400 uppercase">Improvement</span>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-accent">{scoreAfter}</p>
          <p className="text-xs text-gray-500 uppercase">After</p>
        </div>
      </div>

      {/* Quote */}
      <p className="text-gray-600 italic leading-relaxed">
        "{quote}"
      </p>
    </motion.div>
  );
};

/**
 * Sample success stories
 */
export const successStories: SuccessStory[] = [
  {
    id: 1,
    name: "Alex Rivera",
    role: "Software Engineer",
    company: "Google",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
    scoreBefore: 62,
    scoreAfter: 94,
    quote: "ApplyX's AI feedback helped me optimize my resume for ATS. Got 3 interviews in my first week!",
  },
  {
    id: 2,
    name: "Emily Zhang",
    role: "Product Manager",
    company: "Stripe",
    photoUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
    scoreBefore: 58,
    scoreAfter: 91,
    quote: "The keyword suggestions and formatting tips made all the difference. Highly recommend!",
  },
];

export default SuccessStoryCard;
