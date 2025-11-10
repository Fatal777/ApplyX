import { motion } from "framer-motion";
import { Upload as UploadIcon, FileText, CheckCircle, Sparkles, Target, Zap, ArrowRight, Loader2, User, Bell, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useResumes } from "@/hooks/useResumes";
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";

const ResumeBuilder = () => {
  const { uploadResume, loading, error } = useResumes();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [useJD, setUseJD] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    if (useJD && !jobDescription.trim()) {
      toast({
        title: "Job Description Required",
        description: "Please provide a job description for targeted analysis",
        variant: "destructive",
      });
      return;
    }

    try {
      const result: any = await uploadResume(file, useJD ? jobDescription : undefined);
      toast({
        title: "Success",
        description: result.message || "Resume uploaded successfully!",
      });
      setFile(null);
      setJobDescription("");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Redirect to analysis page
      if (result.id) {
        navigate(`/resume/${result.id}`);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || "Failed to upload resume. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      // If the error is due to authentication, redirect to login
      if (err.response?.status === 401) {
        window.location.href = '/login';
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-4 md:px-8 py-4">
          <div className="flex items-center gap-3">
            <img 
              src="/Dark BG Logo.png"
              alt="ApplyX Logo"
              className="h-10 md:h-12 w-auto"
            />
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => navigate('/dashboard')} className="text-sm font-medium text-gray-600 hover:text-black transition-colors">Dashboard</button>
            <button onClick={() => navigate('/resume-builder')} className="text-sm font-medium text-black">Upload Resume</button>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center text-white text-sm font-semibold">
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>
      </nav>
      
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-12">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-black font-medium">Upload Resume</span>
          </div>
          
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold text-black">Upload Your Resume</h1>
              <Sparkles className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-gray-600 text-base md:text-lg">
              Upload your resume and get instant AI-powered analysis to improve your chances
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Upload Area */}
          <div className="lg:col-span-8">
            <Card 
              className={`border-2 border-dashed rounded-xl md:rounded-2xl transition-all duration-300 ${
                isDragging ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <CardContent className="p-8 md:p-12 text-center">
                <div className="mb-6">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <UploadIcon className="w-10 h-10 text-gray-600" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-3 text-black">
                    {file ? file.name : 'Drop your resume here'}
                  </h3>
                  <p className="text-gray-600 text-sm md:text-base mb-2">
                    {file 
                      ? `File size: ${(file.size / 1024).toFixed(2)} KB` 
                      : 'or click to browse from your computer'
                    }
                  </p>
                  <p className="text-gray-500 text-xs md:text-sm">
                    Supported formats: PDF, DOC, DOCX (Max 5MB)
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="border-gray-300 hover:border-black"
                    onClick={handleButtonClick}
                  >
                    <UploadIcon className="w-5 h-5 mr-2" />
                    {file ? 'Change File' : 'Choose File'}
                  </Button>
                  {file && (
                    <Button 
                      size="lg" 
                      className="bg-black hover:bg-gray-900 text-white"
                      onClick={handleUpload}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          Analyze Resume
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Job Description Section */}
            <Card className="mt-6 rounded-xl md:rounded-2xl border-2 border-gray-200">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-black">Job-Specific Analysis</h3>
                      <p className="text-sm text-gray-600">Analyze resume for a specific job posting</p>
                    </div>
                  </div>
                  <Button
                    variant={useJD ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUseJD(!useJD)}
                    className={useJD ? "bg-purple-600 hover:bg-purple-700" : ""}
                  >
                    {useJD ? "Enabled" : "Enable"}
                  </Button>
                </div>
                
                {useJD && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                        <Target className="w-3 h-3 mr-1" />
                        Targeted Analysis
                      </Badge>
                      <span>Paste the job description below</span>
                    </div>
                    <Textarea
                      placeholder="Paste the complete job description here...&#10;&#10;Example:&#10;We are looking for a Senior Software Engineer with 5+ years of experience in React, Node.js, and AWS. The ideal candidate will have strong problem-solving skills and experience with microservices architecture..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      className="min-h-48 border-2 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      The analysis will compare your resume against the job requirements and provide targeted recommendations
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* What Happens Next */}
            <Card className="mt-6 rounded-xl md:rounded-2xl bg-blue-50 border-blue-200">
              <CardContent className="p-6 md:p-8">
                <h3 className="font-bold text-black mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  What happens after upload?
                </h3>
                <div className="space-y-3">
                  {[
                    { step: '1', text: 'Your resume is securely uploaded and encrypted' },
                    { step: '2', text: 'AI analyzes content, structure, and keywords' },
                    { step: '3', text: 'You receive a detailed score and recommendations' },
                    { step: '4', text: 'Get matched with relevant job opportunities' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {item.step}
                      </div>
                      <p className="text-sm text-gray-700 pt-0.5">{item.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick Stats */}
            <Card className="rounded-xl md:rounded-2xl">
              <CardContent className="p-6">
                <h3 className="font-bold text-black mb-5">Why Use ApplyX?</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">AI-Powered Analysis</h4>
                      <p className="text-xs text-gray-600">Get instant feedback on your resume</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">ATS Optimization</h4>
                      <p className="text-xs text-gray-600">Ensure your resume passes ATS systems</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Quick Results</h4>
                      <p className="text-xs text-gray-600">Get analysis in under 60 seconds</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card className="rounded-xl md:rounded-2xl bg-gray-50">
              <CardContent className="p-6">
                <h3 className="font-bold text-black mb-4">Pro Tips</h3>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Use a clean, ATS-friendly format</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Include quantifiable achievements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Tailor keywords to job descriptions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Keep it concise (1-2 pages max)</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Recent Uploads */}
            <Card className="rounded-xl md:rounded-2xl">
              <CardContent className="p-6">
                <h3 className="font-bold text-black mb-4">Need Help?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Check out our guide on creating the perfect resume or contact support.
                </p>
                <Button variant="outline" className="w-full border-gray-300 hover:border-black">
                  View Guide
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ResumeBuilder;
