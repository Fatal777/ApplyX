/**
 * PersonaCard Component
 * =====================
 * 
 * AI Interviewer persona cards with:
 * - Professional headshots from Unsplash
 * - Hover reveal animations
 * - Role and specialty indicators
 * - Selection state handling
 */

import { motion } from "framer-motion";
import { Check, Mic, Video, Brain, Code, Users, Briefcase } from "lucide-react";

export interface InterviewerPersona {
  id: string;
  name: string;
  role: string;
  specialty: string;
  description: string;
  photoUrl: string;
  difficulty: "easy" | "medium" | "hard";
  type: "behavioral" | "technical" | "mixed";
  icon: typeof Mic;
  color: string;
}

interface PersonaCardProps {
  persona: InterviewerPersona;
  selected?: boolean;
  onSelect?: (persona: InterviewerPersona) => void;
  index?: number;
}

export const PersonaCard = ({ 
  persona, 
  selected = false, 
  onSelect,
  index = 0 
}: PersonaCardProps) => {
  const { name, role, specialty, description, photoUrl, difficulty, icon: Icon, color } = persona;

  const difficultyColors = {
    easy: "bg-green-100 text-green-700 border-green-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    hard: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileHover={{ y: -4, scale: 1.02 }}
      onClick={() => onSelect?.(persona)}
      className={`
        relative cursor-pointer rounded-2xl p-6 transition-all duration-300
        ${selected 
          ? 'bg-primary ring-2 ring-accent shadow-xl shadow-primary/20' 
          : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20'
        }
      `}
    >
      {/* Selected Indicator */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-lg"
        >
          <Check className="w-5 h-5 text-black" />
        </motion.div>
      )}

      {/* Content */}
      <div className="flex items-start gap-4">
        {/* Photo */}
        <div className="relative group">
          <div className={`
            w-16 h-16 rounded-xl overflow-hidden ring-2 transition-all duration-300
            ${selected ? 'ring-accent' : 'ring-white/20 group-hover:ring-white/40'}
          `}>
            <motion.img
              src={photoUrl}
              alt={name}
              className="w-full h-full object-cover"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.3 }}
            />
          </div>
          {/* Icon Badge */}
          <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-lg ${color} flex items-center justify-center shadow-md`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-bold truncate ${selected ? 'text-white' : 'text-white'}`}>
              {name}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${difficultyColors[difficulty]}`}>
              {difficulty}
            </span>
          </div>
          <p className={`text-sm ${selected ? 'text-white/80' : 'text-gray-400'}`}>
            {role}
          </p>
          <p className={`text-xs mt-1 ${selected ? 'text-accent' : 'text-gray-500'}`}>
            {specialty}
          </p>
        </div>
      </div>

      {/* Description - shows on hover or selected */}
      <motion.p
        initial={{ opacity: 0, height: 0 }}
        animate={{ 
          opacity: selected ? 1 : 0, 
          height: selected ? 'auto' : 0,
          marginTop: selected ? 12 : 0
        }}
        className={`text-sm leading-relaxed ${selected ? 'text-white/70' : 'text-gray-400'}`}
      >
        {description}
      </motion.p>
    </motion.div>
  );
};

/**
 * Interviewer personas with Unsplash photos
 */
export const interviewerPersonas: InterviewerPersona[] = [
  {
    id: "sarah",
    name: "Sarah Mitchell",
    role: "Senior Technical Recruiter",
    specialty: "Behavioral & Culture Fit",
    description: "10+ years at top tech companies. Focuses on communication skills, teamwork, and cultural alignment.",
    photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face",
    difficulty: "easy",
    type: "behavioral",
    icon: Users,
    color: "bg-blue-500",
  },
  {
    id: "james",
    name: "James Chen",
    role: "Engineering Manager",
    specialty: "System Design & Architecture",
    description: "Ex-Google, Ex-Meta. Expert in distributed systems, scalability, and technical leadership questions.",
    photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
    difficulty: "hard",
    type: "technical",
    icon: Code,
    color: "bg-purple-500",
  },
  {
    id: "priya",
    name: "Priya Patel",
    role: "Product Director",
    specialty: "Product Sense & Strategy",
    description: "Former PM at Stripe and Airbnb. Specializes in product thinking, metrics, and case studies.",
    photoUrl: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop&crop=face",
    difficulty: "medium",
    type: "mixed",
    icon: Brain,
    color: "bg-emerald-500",
  },
  {
    id: "michael",
    name: "Michael Torres",
    role: "VP of Engineering",
    specialty: "Leadership & Execution",
    description: "Built engineering teams at 3 unicorns. Tough but fair. Focuses on leadership scenarios and decision-making.",
    photoUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=face",
    difficulty: "hard",
    type: "behavioral",
    icon: Briefcase,
    color: "bg-orange-500",
  },
];

/**
 * Persona Selection Grid
 */
interface PersonaGridProps {
  personas?: InterviewerPersona[];
  selectedId?: string;
  onSelect?: (persona: InterviewerPersona) => void;
}

export const PersonaGrid = ({ 
  personas = interviewerPersonas,
  selectedId,
  onSelect 
}: PersonaGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {personas.map((persona, index) => (
        <PersonaCard
          key={persona.id}
          persona={persona}
          selected={selectedId === persona.id}
          onSelect={onSelect}
          index={index}
        />
      ))}
    </div>
  );
};

export default PersonaCard;
