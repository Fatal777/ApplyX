/**
 * Quick Start Panel Component
 * Clean, minimal interview type selector - Notion/Wellfound inspired
 * Aligned with ApplyX light theme design system
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Sparkles,
  Zap,
  Code,
  ArrowRight,
  Play,
  Clock,
  Briefcase,
  FileText,
  Settings2,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
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
    description: 'STAR method & soft skills',
    icon: MessageSquare,
    bgColor: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    selectedBorder: 'border-blue-500',
    features: ['STAR Method', 'Leadership', 'Teamwork'],
    recommended: false,
  },
  {
    id: 'technical_theory' as const,
    title: 'Technical',
    description: 'System design & concepts',
    icon: Code,
    bgColor: 'bg-purple-50',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    borderColor: 'border-purple-200',
    selectedBorder: 'border-purple-500',
    features: ['System Design', 'Algorithms', 'Best Practices'],
    recommended: false,
  },
  {
    id: 'mixed' as const,
    title: 'Mixed',
    description: 'Full interview simulation',
    icon: Sparkles,
    bgColor: 'bg-lime-50',
    iconBg: 'bg-lime-100',
    iconColor: 'text-lime-600',
    borderColor: 'border-lime-200',
    selectedBorder: 'border-lime-500',
    features: ['Full Coverage', 'Realistic', 'AI Powered'],
    recommended: true,
  },
  {
    id: 'custom' as const,
    title: 'Custom',
    description: 'Your specific needs',
    icon: Settings2,
    bgColor: 'bg-orange-50',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    borderColor: 'border-orange-200',
    selectedBorder: 'border-orange-500',
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

// Persona options with human photos
const personas = [
  { 
    id: 'friendly', 
    label: 'Friendly', 
    emoji: '😊',
    name: 'Emily Parker',
    role: 'Career Coach',
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face',
    description: 'Supportive and encouraging approach'
  },
  { 
    id: 'professional', 
    label: 'Professional', 
    emoji: '👔',
    name: 'Michael Chen',
    role: 'Senior Recruiter',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    description: 'Corporate and structured style'
  },
  { 
    id: 'challenging', 
    label: 'Challenging', 
    emoji: '🔥',
    name: 'Sarah Kim',
    role: 'Tech Lead',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face',
    description: 'Tough questions, high standards'
  },
];

// Interview Type Card Component - Light Theme
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
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative p-5 rounded-xl text-left w-full
        transition-all duration-200
        border-2 bg-white
        ${isSelected 
          ? `${type.selectedBorder} shadow-md` 
          : `border-gray-200 hover:border-gray-300 hover:shadow-sm`
        }
      `}
    >
      {/* Recommended Badge */}
      {type.recommended && (
        <div className="absolute top-3 right-3">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-lime-400 text-black">
            Popular
          </span>
        </div>
      )}

      {/* Icon */}
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center mb-3 ${type.iconBg}`}>
        <Icon className={`w-5 h-5 ${type.iconColor}`} />
      </div>

      {/* Content */}
      <h3 className="text-gray-900 font-semibold text-base mb-1">{type.title}</h3>
      <p className="text-gray-500 text-sm mb-3">{type.description}</p>

      {/* Features */}
      <div className="flex flex-wrap gap-1.5">
        {type.features.map((feature) => (
          <span 
            key={feature}
            className="px-2 py-0.5 rounded-md text-[11px] bg-gray-100 text-gray-600"
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
          className="absolute bottom-3 right-3 w-6 h-6 rounded-full bg-black flex items-center justify-center"
        >
          <Check className="w-3.5 h-3.5 text-white" />
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
        {/* Interview Type Cards */}
        <div className={`grid gap-4 ${fullWidth ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
          {interviewTypes.map((type, index) => (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <TypeCard
                type={type}
                isSelected={selectedType === type.id}
                onClick={() => handleTypeSelect(type.id)}
              />
            </motion.div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="flex items-center justify-center pt-2">
          <Button
            onClick={handleQuickStart}
            size="lg"
            className="bg-black hover:bg-gray-900 text-white font-semibold px-8 gap-2"
          >
            Configure & Start
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Configuration Modal - Light Theme */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Configure Interview</DialogTitle>
            <DialogDescription className="text-gray-500">
              Customize your interview experience
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Job Role */}
            <div className="space-y-2">
              <Label className="text-gray-700">Target Job Role</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={config.jobRole}
                  onChange={(e) => setConfig(prev => ({ ...prev, jobRole: e.target.value }))}
                  placeholder="e.g., Senior Software Engineer"
                  className="pl-10 border-gray-200 text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Resume Selection */}
            {resumes && resumes.length > 0 && (
              <div className="space-y-2">
                <Label className="text-gray-700">Use Resume (Optional)</Label>
                <Select
                  value={config.resumeId?.toString() || 'none'}
                  onValueChange={(val) => setConfig(prev => ({ 
                    ...prev, 
                    resumeId: val === 'none' ? undefined : parseInt(val) 
                  }))}
                >
                  <SelectTrigger className="border-gray-200 text-gray-900">
                    <FileText className="w-4 h-4 mr-2 text-gray-400" />
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
              <Label className="text-gray-700">Difficulty Level</Label>
              <div className="grid grid-cols-4 gap-2">
                {difficultyLevels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setConfig(prev => ({ 
                      ...prev, 
                      difficulty: level.id as InterviewConfig['difficulty']
                    }))}
                    className={`
                      p-2.5 rounded-lg text-xs font-medium transition-all border
                      ${config.difficulty === level.id
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
              <Label className="text-gray-700">Choose Your Interviewer</Label>
              <div className="grid grid-cols-3 gap-3">
                {personas.map((persona) => (
                  <motion.button
                    key={persona.id}
                    onClick={() => setConfig(prev => ({ 
                      ...prev, 
                      persona: persona.id as InterviewConfig['persona']
                    }))}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      relative p-3 rounded-xl text-center transition-all overflow-hidden border-2
                      ${config.persona === persona.id
                        ? 'bg-lime-50 border-lime-400 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    {/* Human Photo */}
                    <div className="relative w-14 h-14 mx-auto mb-2">
                      <img
                        src={persona.photo}
                        alt={persona.name}
                        className={`
                          w-full h-full rounded-full object-cover
                          transition-all duration-300
                          ${config.persona === persona.id 
                            ? 'ring-2 ring-lime-500 ring-offset-2' 
                            : 'grayscale-[20%] hover:grayscale-0'
                          }
                        `}
                      />
                      {config.persona === persona.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-lime-500 flex items-center justify-center"
                        >
                          <Check className="w-3 h-3 text-white" />
                        </motion.div>
                      )}
                    </div>
                    
                    {/* Name & Role */}
                    <p className={`text-xs font-semibold truncate ${
                      config.persona === persona.id ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {persona.name}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">{persona.role}</p>
                    
                    {/* Style Badge */}
                    <span className={`
                      inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium
                      ${config.persona === persona.id 
                        ? 'bg-lime-200 text-lime-700' 
                        : 'bg-gray-100 text-gray-500'
                      }
                    `}>
                      {persona.label}
                    </span>
                  </motion.button>
                ))}
              </div>
              
              {/* Selected Persona Description */}
              <AnimatePresence mode="wait">
                {config.persona && (
                  <motion.p
                    key={config.persona}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="text-xs text-gray-500 text-center pt-1"
                  >
                    {personas.find(p => p.id === config.persona)?.description}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Number of Questions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-gray-700">Number of Questions</Label>
                <span className="text-lime-600 font-semibold">{config.numQuestions}</span>
              </div>
              <Slider
                value={[config.numQuestions]}
                onValueChange={([val]) => setConfig(prev => ({ ...prev, numQuestions: val }))}
                min={3}
                max={15}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>Quick (3)</span>
                <span>Standard (5-8)</span>
                <span>Deep (15)</span>
              </div>
            </div>

            {/* Estimated Time */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <Clock className="w-4 h-4 text-lime-600" />
              <span className="text-gray-600 text-sm">
                Estimated duration: <span className="text-gray-900 font-medium">
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
              className="flex-1 border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartInterview}
              className="flex-1 bg-black hover:bg-gray-900 text-white font-semibold gap-2"
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
