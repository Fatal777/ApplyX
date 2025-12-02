/**
 * Quick Start Panel Component
 * Premium interview type selector with hover effects and configuration modal
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  MessageSquare,
  Sparkles,
  Zap,
  Users,
  Code,
  Target,
  ArrowRight,
  ChevronDown,
  X,
  Play,
  Clock,
  Briefcase,
  FileText,
  Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useResumes } from '@/hooks/useResumes';

interface QuickStartPanelProps {
  onStartInterview: (config: InterviewConfig) => void;
  fullWidth?: boolean;
}

interface InterviewConfig {
  type: 'behavioral' | 'technical_theory' | 'mixed' | 'custom';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  persona: 'friendly' | 'professional' | 'challenging';
  numQuestions: number;
  jobRole?: string;
  resumeId?: number;
}

// Interview type cards configuration
const interviewTypes = [
  {
    id: 'behavioral' as const,
    title: 'Behavioral',
    description: 'Practice STAR method responses and soft skill questions',
    icon: MessageSquare,
    gradient: 'from-blue-500 to-cyan-400',
    shadowColor: 'rgba(59, 130, 246, 0.3)',
    features: ['STAR Method', 'Leadership', 'Teamwork'],
    recommended: false,
  },
  {
    id: 'technical_theory' as const,
    title: 'Technical',
    description: 'Deep dive into technical concepts and problem-solving',
    icon: Code,
    gradient: 'from-purple-500 to-pink-400',
    shadowColor: 'rgba(168, 85, 247, 0.3)',
    features: ['System Design', 'Algorithms', 'Best Practices'],
    recommended: false,
  },
  {
    id: 'mixed' as const,
    title: 'Mixed',
    description: 'Comprehensive interview covering all aspects',
    icon: Sparkles,
    gradient: 'from-[#c7ff6b] to-[#a8e063]',
    shadowColor: 'rgba(199, 255, 107, 0.3)',
    features: ['Full Coverage', 'Realistic', 'AI Powered'],
    recommended: true,
  },
  {
    id: 'custom' as const,
    title: 'Custom',
    description: 'Tailor the interview to your specific needs',
    icon: Settings2,
    gradient: 'from-orange-500 to-amber-400',
    shadowColor: 'rgba(249, 115, 22, 0.3)',
    features: ['Your Rules', 'Flexible', 'Personalized'],
    recommended: false,
  },
];

// Difficulty levels
const difficultyLevels = [
  { id: 'beginner', label: 'Beginner', description: 'Entry-level questions' },
  { id: 'intermediate', label: 'Intermediate', description: 'Mid-level depth' },
  { id: 'advanced', label: 'Advanced', description: 'Senior-level complexity' },
  { id: 'expert', label: 'Expert', description: 'Staff/Principal level' },
];

// Persona options
const personas = [
  { id: 'friendly', label: 'Friendly', emoji: '😊' },
  { id: 'professional', label: 'Professional', emoji: '👔' },
  { id: 'challenging', label: 'Challenging', emoji: '🔥' },
];

// Interview Type Card Component
const TypeCard = ({ 
  type, 
  isSelected, 
  onClick 
}: { 
  type: typeof interviewTypes[0]; 
  isSelected: boolean;
  onClick: () => void;
}) => {
  const Icon = type.icon;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative p-6 rounded-2xl text-left overflow-hidden
        transition-all duration-300
        ${isSelected 
          ? 'bg-white/[0.08] border-2 border-white/[0.3]' 
          : 'bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.15]'
        }
      `}
    >
      {/* Recommended Badge */}
      {type.recommended && (
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#c7ff6b] text-black">
            Recommended
          </span>
        </div>
      )}

      {/* Glow Effect on Selection */}
      {isSelected && (
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at center, ${type.shadowColor} 0%, transparent 70%)`
          }}
        />
      )}

      {/* Icon */}
      <div 
        className={`
          w-14 h-14 rounded-xl flex items-center justify-center mb-4
          bg-gradient-to-br ${type.gradient}
        `}
        style={{
          boxShadow: isSelected ? `0 8px 32px ${type.shadowColor}` : 'none'
        }}
      >
        <Icon className="w-7 h-7 text-white" />
      </div>

      {/* Content */}
      <h3 className="text-white font-semibold text-lg mb-1">{type.title}</h3>
      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{type.description}</p>

      {/* Features */}
      <div className="flex flex-wrap gap-2">
        {type.features.map((feature) => (
          <span 
            key={feature}
            className="px-2 py-1 rounded-md text-xs bg-white/[0.05] text-gray-300"
          >
            {feature}
          </span>
        ))}
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute bottom-3 right-3 w-6 h-6 rounded-full bg-[#c7ff6b] flex items-center justify-center"
        >
          <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}
    </motion.button>
  );
};

const QuickStartPanel = ({ onStartInterview, fullWidth = false }: QuickStartPanelProps) => {
  const { resumes } = useResumes();
  const [selectedType, setSelectedType] = useState<typeof interviewTypes[0]['id']>('mixed');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [config, setConfig] = useState<InterviewConfig>({
    type: 'mixed',
    difficulty: 'intermediate',
    persona: 'professional',
    numQuestions: 5,
    jobRole: '',
    resumeId: undefined,
  });

  const handleTypeSelect = (typeId: typeof interviewTypes[0]['id']) => {
    setSelectedType(typeId);
    setConfig(prev => ({ ...prev, type: typeId }));
  };

  const handleQuickStart = () => {
    setShowConfigModal(true);
  };

  const handleStartInterview = () => {
    setShowConfigModal(false);
    onStartInterview(config);
  };

  return (
    <>
      <div className={`space-y-6 ${fullWidth ? 'max-w-4xl mx-auto' : ''}`}>
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Start New Interview</h2>
            <p className="text-gray-400 text-sm mt-1">Choose your interview type to begin</p>
          </div>
          
          <Button
            onClick={handleQuickStart}
            className="bg-gradient-to-r from-[#c7ff6b] to-[#a8e063] text-black font-semibold hover:opacity-90 gap-2"
          >
            <Zap className="w-4 h-4" />
            Quick Start
          </Button>
        </div>

        {/* Interview Type Cards */}
        <div className={`grid gap-4 ${fullWidth ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
          {interviewTypes.map((type, index) => (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <TypeCard
                type={type}
                isSelected={selectedType === type.id}
                onClick={() => handleTypeSelect(type.id)}
              />
            </motion.div>
          ))}
        </div>

        {/* Selected Type CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center"
        >
          <Button
            onClick={handleQuickStart}
            size="lg"
            className="
              bg-gradient-to-r from-primary to-purple-600 
              hover:from-primary/90 hover:to-purple-600/90
              text-white font-semibold px-8 gap-2
              transition-colors duration-200
            "
          >
            Configure & Start
            <ArrowRight className="w-5 h-5" />
          </Button>
        </motion.div>
      </div>

      {/* Configuration Modal */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="bg-[#0f0f14] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Configure Interview</DialogTitle>
            <DialogDescription className="text-gray-400">
              Customize your interview experience
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Job Role */}
            <div className="space-y-2">
              <Label className="text-gray-300">Target Job Role</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={config.jobRole}
                  onChange={(e) => setConfig(prev => ({ ...prev, jobRole: e.target.value }))}
                  placeholder="e.g., Senior Software Engineer"
                  className="pl-10 bg-white/[0.05] border-white/[0.1] text-white placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Resume Selection */}
            {resumes && resumes.length > 0 && (
              <div className="space-y-2">
                <Label className="text-gray-300">Use Resume (Optional)</Label>
                <Select
                  value={config.resumeId?.toString() || 'none'}
                  onValueChange={(val) => setConfig(prev => ({ 
                    ...prev, 
                    resumeId: val === 'none' ? undefined : parseInt(val) 
                  }))}
                >
                  <SelectTrigger className="bg-white/[0.05] border-white/[0.1] text-white">
                    <FileText className="w-4 h-4 mr-2 text-gray-500" />
                    <SelectValue placeholder="Select a resume" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No resume</SelectItem>
                    {resumes.map((resume: any) => (
                      <SelectItem key={resume.id} value={resume.id.toString()}>
                        {resume.original_filename}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Difficulty */}
            <div className="space-y-3">
              <Label className="text-gray-300">Difficulty Level</Label>
              <div className="grid grid-cols-4 gap-2">
                {difficultyLevels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setConfig(prev => ({ 
                      ...prev, 
                      difficulty: level.id as InterviewConfig['difficulty']
                    }))}
                    className={`
                      p-2 rounded-lg text-xs font-medium transition-all
                      ${config.difficulty === level.id
                        ? 'bg-primary text-white'
                        : 'bg-white/[0.05] text-gray-400 hover:bg-white/[0.1]'
                      }
                    `}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interviewer Persona */}
            <div className="space-y-3">
              <Label className="text-gray-300">Interviewer Style</Label>
              <div className="grid grid-cols-3 gap-2">
                {personas.map((persona) => (
                  <button
                    key={persona.id}
                    onClick={() => setConfig(prev => ({ 
                      ...prev, 
                      persona: persona.id as InterviewConfig['persona']
                    }))}
                    className={`
                      p-3 rounded-lg text-center transition-all
                      ${config.persona === persona.id
                        ? 'bg-[#c7ff6b]/20 border border-[#c7ff6b]/50'
                        : 'bg-white/[0.05] border border-transparent hover:bg-white/[0.1]'
                      }
                    `}
                  >
                    <span className="text-2xl block mb-1">{persona.emoji}</span>
                    <span className={`text-xs font-medium ${
                      config.persona === persona.id ? 'text-[#c7ff6b]' : 'text-gray-400'
                    }`}>
                      {persona.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Number of Questions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Number of Questions</Label>
                <span className="text-[#c7ff6b] font-semibold">{config.numQuestions}</span>
              </div>
              <Slider
                value={[config.numQuestions]}
                onValueChange={([val]) => setConfig(prev => ({ ...prev, numQuestions: val }))}
                min={3}
                max={15}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Quick (3)</span>
                <span>Standard (5-8)</span>
                <span>Deep (15)</span>
              </div>
            </div>

            {/* Estimated Time */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]">
              <Clock className="w-4 h-4 text-[#c7ff6b]" />
              <span className="text-gray-400 text-sm">
                Estimated duration: <span className="text-white font-medium">
                  {Math.round(config.numQuestions * 3)} - {Math.round(config.numQuestions * 5)} minutes
                </span>
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowConfigModal(false)}
              className="flex-1 border-white/[0.1] text-gray-400 hover:text-white hover:bg-white/[0.05]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartInterview}
              className="flex-1 bg-gradient-to-r from-[#c7ff6b] to-[#a8e063] text-black font-semibold hover:opacity-90 gap-2"
            >
              <Play className="w-4 h-4" />
              Start Interview
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuickStartPanel;
