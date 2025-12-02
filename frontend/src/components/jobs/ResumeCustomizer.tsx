/**
 * Resume Customization Wizard
 * ============================
 * 3-step wizard for AI-powered resume customization.
 * 
 * Steps:
 * 1. Match Score - Show current score vs JD
 * 2. AI Suggestions - Get improvement recommendations
 * 3. Review & Download - Final review with PDF/DOCX export
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Download,
  FileText,
  File,
  CheckCircle2,
  AlertTriangle,
  X,
  Target,
  Zap,
  TrendingUp,
  Shield,
  Loader2,
  ArrowRight,
  Plus,
  Minus,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  matchScoringService,
  creditsService,
  MatchScoreResult,
  UserCredits,
} from '@/services/applicationService';
import { toast } from 'sonner';

interface ResumeCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle: string;
  company: string;
  jobDescription: string;
  applicationId?: number;
  onComplete?: (result: any) => void;
}

// Step indicator component
const StepIndicator = ({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: { title: string; description: string }[];
}) => (
  <div className="flex items-center justify-center mb-8">
    {steps.map((step, index) => (
      <div key={index} className="flex items-center">
        <div className="flex flex-col items-center">
          <motion.div
            initial={false}
            animate={{
              scale: currentStep === index ? 1.1 : 1,
              backgroundColor:
                currentStep > index
                  ? '#22c55e'
                  : currentStep === index
                  ? '#6366f1'
                  : '#e5e7eb',
            }}
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold transition-colors',
              currentStep > index && 'bg-green-500',
              currentStep === index && 'bg-primary',
              currentStep < index && 'bg-gray-300 text-gray-500'
            )}
          >
            {currentStep > index ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              index + 1
            )}
          </motion.div>
          <span
            className={cn(
              'text-xs mt-2 font-medium',
              currentStep >= index ? 'text-gray-900' : 'text-gray-400'
            )}
          >
            {step.title}
          </span>
        </div>
        {index < steps.length - 1 && (
          <div
            className={cn(
              'w-16 h-1 mx-2 rounded transition-colors',
              currentStep > index ? 'bg-green-500' : 'bg-gray-200'
            )}
          />
        )}
      </div>
    ))}
  </div>
);

// Score gauge component
const ScoreGauge = ({
  score,
  label,
  size = 'large',
}: {
  score: number;
  label: string;
  size?: 'small' | 'large';
}) => {
  const getScoreColor = (s: number) => {
    if (s >= 80) return { stroke: '#22c55e', bg: 'bg-green-100', text: 'text-green-600' };
    if (s >= 60) return { stroke: '#eab308', bg: 'bg-yellow-100', text: 'text-yellow-600' };
    if (s >= 40) return { stroke: '#f97316', bg: 'bg-orange-100', text: 'text-orange-600' };
    return { stroke: '#ef4444', bg: 'bg-red-100', text: 'text-red-600' };
  };

  const colors = getScoreColor(score);
  const circumference = 2 * Math.PI * 45;
  const progress = (score / 100) * circumference;

  if (size === 'small') {
    return (
      <div className="flex items-center gap-2">
        <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', colors.bg)}>
          <span className={cn('text-lg font-bold', colors.text)}>{Math.round(score)}%</span>
        </div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <motion.circle
            cx="64"
            cy="64"
            r="45"
            fill="none"
            stroke={colors.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1, ease: 'easeOut' }}
            strokeDasharray={circumference}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-3xl font-bold', colors.text)}>
            {Math.round(score)}%
          </span>
          <span className="text-xs text-gray-500">Match</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-medium text-gray-700">{label}</span>
    </div>
  );
};

// Skills comparison component
const SkillsComparison = ({
  matched,
  missing,
  partial,
}: {
  matched: string[];
  missing: string[];
  partial: string[];
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Card className="bg-green-50 border-green-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Matched Skills ({matched.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {matched.slice(0, 8).map((skill) => (
            <Badge key={skill} variant="outline" className="bg-green-100 text-green-700 border-green-300">
              {skill}
            </Badge>
          ))}
          {matched.length > 8 && (
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
              +{matched.length - 8} more
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>

    <Card className="bg-red-50 border-red-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Missing Skills ({missing.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {missing.slice(0, 8).map((skill) => (
            <Badge key={skill} variant="outline" className="bg-red-100 text-red-700 border-red-300">
              <Plus className="w-3 h-3 mr-1" />
              {skill}
            </Badge>
          ))}
          {missing.length > 8 && (
            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
              +{missing.length - 8} more
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  </div>
);

// Main wizard component
const ResumeCustomizer = ({
  isOpen,
  onClose,
  jobTitle,
  company,
  jobDescription,
  applicationId,
  onComplete,
}: ResumeCustomizerProps) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchScoreResult | null>(null);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [customizedContent, setCustomizedContent] = useState('');
  const [improvedScore, setImprovedScore] = useState<number | null>(null);

  const steps = [
    { title: 'Score', description: 'See your match score' },
    { title: 'Improve', description: 'AI suggestions' },
    { title: 'Download', description: 'Get your resume' },
  ];

  // Load match score and credits
  useEffect(() => {
    if (isOpen && step === 0) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [scoreResult, creditsResult] = await Promise.all([
        matchScoringService.calculateMatchScore({
          job_description: jobDescription,
        }),
        creditsService.getCredits(),
      ]);

      setMatchResult(scoreResult);
      setCredits(creditsResult);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to analyze your resume');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      // Use a credit before proceeding to step 3
      if (!credits?.can_customize) {
        toast.error('No credits available. Upgrade to continue!');
        return;
      }

      setLoading(true);
      try {
        // Use a credit
        await creditsService.useCredit('resume_customization', {
          application_id: applicationId,
          description: `Customization for ${jobTitle} at ${company}`,
        });

        // Simulate AI improvement (in production, call backend service)
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Set improved content and score
        setCustomizedContent(
          `Improved resume content for ${jobTitle} position at ${company}...`
        );
        setImprovedScore(Math.min(100, (matchResult?.overall_score || 50) + 15));

        toast.success('Resume customized successfully!');
        setStep(2);
      } catch (error) {
        toast.error('Failed to customize resume');
      } finally {
        setLoading(false);
      }
    } else {
      setStep((s) => Math.min(s + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleDownload = (format: 'pdf' | 'docx') => {
    toast.success(`Downloading resume as ${format.toUpperCase()}...`);
    // In production, call backend to generate and download file
    onComplete?.({ format, score: improvedScore });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Resume Customization
          </DialogTitle>
          <DialogDescription>
            Customize your resume for <strong>{jobTitle}</strong> at{' '}
            <strong>{company}</strong>
          </DialogDescription>
        </DialogHeader>

        <StepIndicator currentStep={step} steps={steps} />

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-gray-600">
                {step === 0 ? 'Analyzing your resume...' : 'Customizing your resume...'}
              </p>
            </motion.div>
          ) : (
            <>
              {/* Step 1: Match Score */}
              {step === 0 && matchResult && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex justify-center gap-8">
                    <ScoreGauge
                      score={matchResult.overall_score}
                      label="Overall Match"
                    />
                    <div className="space-y-3">
                      <ScoreGauge
                        score={matchResult.breakdown.skills}
                        label="Skills"
                        size="small"
                      />
                      <ScoreGauge
                        score={matchResult.breakdown.keywords}
                        label="Keywords"
                        size="small"
                      />
                      <ScoreGauge
                        score={matchResult.breakdown.experience}
                        label="Experience"
                        size="small"
                      />
                      <ScoreGauge
                        score={matchResult.breakdown.education}
                        label="Education"
                        size="small"
                      />
                    </div>
                  </div>

                  <SkillsComparison
                    matched={matchResult.matched_skills}
                    missing={matchResult.missing_skills}
                    partial={matchResult.partial_skills || []}
                  />

                  {matchResult.suggestions.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Zap className="w-4 h-4 text-primary" />
                          Quick Suggestions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {matchResult.suggestions.map((suggestion, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}

              {/* Step 2: AI Suggestions */}
              {step === 1 && matchResult && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold mb-2">AI Resume Optimization</h3>
                    <p className="text-gray-600">
                      Our AI will analyze and enhance your resume to better match this role.
                    </p>
                  </div>

                  {/* Credits display */}
                  <Card className="bg-gradient-to-r from-primary/10 to-purple-100 border-primary/20">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">Credits Available</p>
                        <p className="text-2xl font-bold text-primary">
                          {credits?.total_available} / {credits?.daily_max}
                        </p>
                        <p className="text-xs text-gray-500">
                          {credits?.tier === 'free'
                            ? 'Free tier - 3 credits/day'
                            : `${credits?.tier} tier`}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-primary text-white">
                          1 Credit Required
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Priority improvements */}
                  {matchResult.priority_improvements.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Target className="w-4 h-4 text-orange-500" />
                          Priority Improvements
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {matchResult.priority_improvements.map((improvement, i) => (
                            <li
                              key={i}
                              className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg"
                            >
                              <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">
                                {i + 1}
                              </div>
                              <span className="text-sm">{improvement}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-4">
                      Click "Customize Resume" to apply AI improvements
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Download */}
              {step === 2 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Resume Customized!</h3>
                    <p className="text-gray-600">
                      Your resume has been optimized for this position.
                    </p>
                  </div>

                  {/* Score comparison */}
                  <div className="flex justify-center gap-8 py-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-2">Before</p>
                      <div className="text-3xl font-bold text-gray-400">
                        {Math.round(matchResult?.overall_score || 0)}%
                      </div>
                    </div>
                    <div className="flex items-center">
                      <TrendingUp className="w-8 h-8 text-green-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-2">After</p>
                      <div className="text-3xl font-bold text-green-600">
                        {Math.round(improvedScore || 0)}%
                      </div>
                    </div>
                  </div>

                  {/* Download options */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Download Your Resume</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          variant="outline"
                          className="h-24 flex flex-col gap-2 hover:bg-red-50 hover:border-red-300"
                          onClick={() => handleDownload('pdf')}
                        >
                          <FileText className="w-8 h-8 text-red-600" />
                          <span>Download PDF</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-24 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-300"
                          onClick={() => handleDownload('docx')}
                        >
                          <File className="w-8 h-8 text-blue-600" />
                          <span>Download DOCX</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={step === 0 ? onClose : handleBack}
            disabled={loading}
          >
            {step === 0 ? (
              <>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </>
            )}
          </Button>

          {step < 2 && (
            <Button
              onClick={handleNext}
              disabled={loading || (step === 1 && !credits?.can_customize)}
              className="bg-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : step === 1 ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Customize Resume
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}

          {step === 2 && (
            <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResumeCustomizer;
