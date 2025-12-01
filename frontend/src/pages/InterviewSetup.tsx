import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Video, 
  Mic, 
  Brain, 
  Target, 
  ArrowRight, 
  Clock,
  Settings,
  Play
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { InterviewType, DifficultyLevel, InterviewPersona } from '@/services/interviewService';

/**
 * InterviewSetup Page
 * Configure interview settings before starting
 */
const InterviewSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Interview configuration state
  const [interviewType, setInterviewType] = useState<InterviewType>('mixed');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermediate');
  const [persona, setPersona] = useState<InterviewPersona>('professional');
  const [numQuestions, setNumQuestions] = useState(5);
  const [jobRole, setJobRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  
  const handleStartInterview = () => {
    // Validate custom interview type requires job details
    if (interviewType === 'custom' && !jobDescription.trim()) {
      toast({
        title: "Job description required",
        description: "Please provide a job description for custom interview type",
        variant: "destructive",
      });
      return;
    }

    const params = new URLSearchParams({
      type: interviewType,
      difficulty,
      persona,
      questions: numQuestions.toString(),
    });
    
    if (jobRole) params.set('jobRole', jobRole);
    if (jobDescription) params.set('jobDesc', jobDescription.slice(0, 500));
    
    toast({
      title: "Starting interview",
      description: `Preparing ${numQuestions} ${difficulty} questions...`,
    });
    
    navigate(`/interview/room?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-indigo-100 px-4 py-2 rounded-full mb-4">
            <Brain className="w-4 h-4 text-indigo-600" />
            <span className="text-indigo-600 font-medium text-sm">AI Mock Interview</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">Prepare for Your Interview</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Practice with our AI interviewer and get instant feedback on your responses. 
            Customize your interview experience below.
          </p>
        </motion.div>

        <div className="space-y-6">
          {/* Interview Type */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Interview Type
                </CardTitle>
                <CardDescription>
                  Choose the type of questions you want to practice
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={interviewType} 
                  onValueChange={(v) => setInterviewType(v as InterviewType)}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                  {[
                    { value: 'behavioral', label: 'Behavioral', desc: 'Soft skills & experiences' },
                    { value: 'technical_theory', label: 'Technical', desc: 'Concepts & knowledge' },
                    { value: 'mixed', label: 'Mixed', desc: 'Both types combined' },
                    { value: 'custom', label: 'Custom', desc: 'Based on job description' },
                  ].map((type) => (
                    <Label
                      key={type.value}
                      htmlFor={type.value}
                      className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        interviewType === type.value 
                          ? 'border-indigo-600 bg-indigo-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <RadioGroupItem value={type.value} id={type.value} className="sr-only" />
                      <span className="font-medium">{type.label}</span>
                      <span className="text-xs text-gray-500 text-center mt-1">{type.desc}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </motion.div>

          {/* Difficulty & Questions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Difficulty & Length
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="mb-3 block">Difficulty Level</Label>
                  <RadioGroup 
                    value={difficulty} 
                    onValueChange={(v) => setDifficulty(v as DifficultyLevel)}
                    className="flex flex-wrap gap-4"
                  >
                    {[
                      { value: 'beginner', label: 'Beginner', color: 'green' },
                      { value: 'intermediate', label: 'Intermediate', color: 'yellow' },
                      { value: 'advanced', label: 'Advanced', color: 'orange' },
                      { value: 'expert', label: 'Expert', color: 'red' },
                    ].map((level) => (
                      <Label
                        key={level.value}
                        htmlFor={`diff-${level.value}`}
                        className={`px-4 py-2 rounded-full cursor-pointer transition-all ${
                          difficulty === level.value 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        <RadioGroupItem value={level.value} id={`diff-${level.value}`} className="sr-only" />
                        {level.label}
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                <div>
                  <div className="flex justify-between mb-3">
                    <Label>Number of Questions</Label>
                    <span className="text-indigo-600 font-medium">{numQuestions}</span>
                  </div>
                  <Slider
                    value={[numQuestions]}
                    onValueChange={([v]) => setNumQuestions(v)}
                    min={3}
                    max={15}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Quick (3)</span>
                    <span>Standard (5-7)</span>
                    <span>Full (15)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Interviewer Persona */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Interviewer Style
                </CardTitle>
                <CardDescription>
                  Choose the tone of your AI interviewer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={persona} 
                  onValueChange={(v) => setPersona(v as InterviewPersona)}
                  className="grid md:grid-cols-3 gap-4"
                >
                  {[
                    { 
                      value: 'friendly', 
                      label: 'Friendly', 
                      desc: 'Warm and encouraging. Great for building confidence.',
                      color: 'from-green-400 to-emerald-600'
                    },
                    { 
                      value: 'professional', 
                      label: 'Professional', 
                      desc: 'Formal and balanced. Standard interview experience.',
                      color: 'from-blue-400 to-indigo-600'
                    },
                    { 
                      value: 'challenging', 
                      label: 'Challenging', 
                      desc: 'Probing follow-ups. Tests you under pressure.',
                      color: 'from-orange-400 to-red-600'
                    },
                  ].map((p) => (
                    <Label
                      key={p.value}
                      htmlFor={`persona-${p.value}`}
                      className={`flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        persona === p.value 
                          ? 'border-indigo-600 bg-indigo-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <RadioGroupItem value={p.value} id={`persona-${p.value}`} className="sr-only" />
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${p.color} mb-2`} />
                      <span className="font-medium">{p.label}</span>
                      <span className="text-xs text-gray-500 mt-1">{p.desc}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </motion.div>

          {/* Optional: Job Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Target Role (Optional)</CardTitle>
                <CardDescription>
                  Add job details for more relevant questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="jobRole">Job Title</Label>
                  <Input
                    id="jobRole"
                    placeholder="e.g., Software Engineer, Product Manager"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="jobDesc">Job Description</Label>
                  <Textarea
                    id="jobDesc"
                    placeholder="Paste the job description here for tailored questions..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="mt-1 min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Start Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center pt-4"
          >
            <Button 
              size="lg" 
              onClick={handleStartInterview}
              className="gap-2 px-8 py-6 text-lg"
            >
              <Play className="w-5 h-5" />
              Start Interview
              <ArrowRight className="w-5 h-5" />
            </Button>
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-sm text-gray-500 space-y-2"
          >
            <p className="flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />
              Estimated time: {numQuestions * 2}-{numQuestions * 3} minutes
            </p>
            <p className="flex items-center justify-center gap-2">
              <Video className="w-4 h-4" />
              Your video is only shown to you - it's not recorded or stored
            </p>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default InterviewSetup;
