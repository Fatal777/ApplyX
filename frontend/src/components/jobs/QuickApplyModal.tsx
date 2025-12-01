/**
 * QuickApplyModal - One-click job application modal
 * Features: Resume selection, auto-fill, quick submit
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Upload,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Building2,
  MapPin,
  ExternalLink,
  X,
  Loader2
} from 'lucide-react';
import { Job } from '@/services/jobService';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface QuickApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
}

const QuickApplyModal = ({ isOpen, onClose, job }: QuickApplyModalProps) => {
  const [step, setStep] = useState<'form' | 'applying' | 'success' | 'redirect'>('form');
  const [selectedResume, setSelectedResume] = useState<string>('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    coverLetter: '',
  });
  const { toast } = useToast();

  // Mock resume data - would come from user's profile
  const savedResumes = [
    { id: '1', name: 'Software Engineer Resume', updated: '2 days ago' },
    { id: '2', name: 'Full Stack Developer CV', updated: '1 week ago' },
    { id: '3', name: 'Senior Developer Resume', updated: '2 weeks ago' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!selectedResume) {
      toast({
        title: "Resume required",
        description: "Please select a resume to continue",
        variant: "destructive"
      });
      return;
    }
    
    // Set to applying state
    setStep('applying');

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Show success
    setStep('success');
    
    toast({
      title: "Application submitted!",
      description: `Your application for ${job.title} at ${job.company} has been submitted`
    });

    // Auto-redirect after 2 seconds
    setTimeout(() => {
      setStep('redirect');
      window.open(job.redirect_url, '_blank', 'noopener,noreferrer');
      setTimeout(() => {
        onClose();
        // Reset state
        setStep('form');
        setFormData({ fullName: '', email: '', phone: '', coverLetter: '' });
        setSelectedResume('');
      }, 500);
    }, 2000);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  Quick Apply
                </DialogTitle>
                <DialogDescription>
                  Submit your application in seconds
                </DialogDescription>
              </DialogHeader>

              {/* Job Info */}
              <div className="my-6 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                <div className="flex items-start gap-4">
                  {job.employer_logo && (
                    <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                      <img src={job.employer_logo} alt={job.company} className="w-8 h-8 object-contain" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-foreground">{job.title}</h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4" />
                        {job.company}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Application Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Resume Selection */}
                <div className="space-y-2">
                  <Label htmlFor="resume" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Select Resume
                  </Label>
                  <Select value={selectedResume} onValueChange={setSelectedResume} required>
                    <SelectTrigger id="resume">
                      <SelectValue placeholder="Choose your resume" />
                    </SelectTrigger>
                    <SelectContent>
                      {savedResumes.map(resume => (
                        <SelectItem key={resume.id} value={resume.id}>
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{resume.name}</span>
                            <span className="text-xs text-muted-foreground ml-3">Updated {resume.updated}</span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="upload-new">
                        <div className="flex items-center gap-2 text-primary">
                          <Upload className="w-4 h-4" />
                          Upload New Resume
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Personal Info */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      value={formData.fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    required
                  />
                </div>

                {/* Cover Letter */}
                <div className="space-y-2">
                  <Label htmlFor="coverLetter" className="flex items-center justify-between">
                    <span>Cover Letter (Optional)</span>
                    <span className="text-xs text-muted-foreground">AI can generate one for you</span>
                  </Label>
                  <Textarea
                    id="coverLetter"
                    placeholder="Why are you a great fit for this role?"
                    value={formData.coverLetter}
                    onChange={(e) => handleChange('coverLetter', e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit Application
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 'applying' && (
            <motion.div
              key="applying"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-12 text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <Loader2 className="w-8 h-8 text-primary" />
              </motion.div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Submitting Application</h3>
              <p className="text-muted-foreground">Please wait while we process your application...</p>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center"
              >
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </motion.div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Application Submitted!</h3>
              <p className="text-muted-foreground mb-4">
                Your application has been sent successfully
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <ExternalLink className="w-4 h-4" />
                Redirecting to job portal...
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default QuickApplyModal;
