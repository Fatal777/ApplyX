import { motion } from "framer-motion";
import { useState } from "react";
import { 
  FileText, Download, Check, Star, Zap, Eye, Edit3, 
  ArrowRight, Sparkles, Award, TrendingUp, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import Footer from "@/components/Footer";
import jsPDF from "jspdf";
import { useToast } from "@/components/ui/use-toast";
import useSubscription from "@/hooks/useSubscription";
import UpgradeModal from "@/components/shared/UpgradeModal";

interface Template {
  id: string;
  name: string;
  description: string;
  atsScore: number;
  features: string[];
  preview: string;
  color: string;
}

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    period: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  skills: string;
}

const ATSTemplates = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { isPaid, plan } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    summary: "",
    experience: [{ title: "", company: "", period: "", description: "" }],
    education: [{ degree: "", institution: "", year: "" }],
    skills: ""
  });
  const { toast } = useToast();

  const templates: Template[] = [
    {
      id: "modern-professional",
      name: "Modern Professional",
      description: "Clean, ATS-friendly design perfect for tech and corporate roles",
      atsScore: 98,
      features: ["Single column layout", "Clear section headers", "Optimized spacing", "Standard fonts"],
      preview: "Modern layout with bold headers and clean sections",
      color: "from-blue-500 to-cyan-500"
    },
    {
      id: "executive",
      name: "Executive",
      description: "Sophisticated template for senior-level positions",
      atsScore: 96,
      features: ["Professional styling", "Achievement-focused", "Leadership emphasis", "Premium look"],
      preview: "Executive style with emphasis on leadership",
      color: "from-purple-500 to-pink-500"
    },
    {
      id: "minimalist",
      name: "Minimalist",
      description: "Simple, elegant design that passes all ATS systems",
      atsScore: 99,
      features: ["Ultra-clean layout", "Maximum readability", "No graphics", "Pure text"],
      preview: "Minimalist design with maximum ATS compatibility",
      color: "from-gray-600 to-gray-800"
    },
    {
      id: "creative-tech",
      name: "Creative Tech",
      description: "Modern design for developers and designers",
      atsScore: 95,
      features: ["Tech-focused sections", "Project highlights", "Skills matrix", "Modern typography"],
      preview: "Creative layout optimized for tech roles",
      color: "from-green-500 to-emerald-500"
    },
    {
      id: "academic",
      name: "Academic",
      description: "Perfect for research and academic positions",
      atsScore: 97,
      features: ["Publications section", "Research focus", "Academic formatting", "Citation ready"],
      preview: "Academic style with research emphasis",
      color: "from-indigo-500 to-violet-500"
    },
    {
      id: "sales-marketing",
      name: "Sales & Marketing",
      description: "Results-driven template for sales professionals",
      atsScore: 96,
      features: ["Metrics-focused", "Achievement highlights", "Client success", "Revenue impact"],
      preview: "Sales-focused with achievement metrics",
      color: "from-orange-500 to-red-500"
    }
  ];

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setShowForm(true);
    toast({
      title: "Template selected",
      description: `${template.name} template selected. Fill in your details below.`
    });
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      experience: [...prev.experience, { title: "", company: "", period: "", description: "" }]
    }));
  };

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, { degree: "", institution: "", year: "" }]
    }));
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    let yPos = 20;

    // Header
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(formData.fullName || "Your Name", 20, yPos);
    yPos += 10;

    // Contact Info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${formData.email} | ${formData.phone} | ${formData.location}`, 20, yPos);
    if (formData.linkedin) {
      yPos += 5;
      doc.text(formData.linkedin, 20, yPos);
    }
    yPos += 15;

    // Summary
    if (formData.summary) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("PROFESSIONAL SUMMARY", 20, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const summaryLines = doc.splitTextToSize(formData.summary, 170);
      doc.text(summaryLines, 20, yPos);
      yPos += summaryLines.length * 5 + 10;
    }

    // Experience
    if (formData.experience.some(exp => exp.title)) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("PROFESSIONAL EXPERIENCE", 20, yPos);
      yPos += 7;

      formData.experience.forEach(exp => {
        if (exp.title) {
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(exp.title, 20, yPos);
          yPos += 5;
          doc.setFontSize(10);
          doc.setFont("helvetica", "italic");
          doc.text(`${exp.company} | ${exp.period}`, 20, yPos);
          yPos += 5;
          if (exp.description) {
            doc.setFont("helvetica", "normal");
            const descLines = doc.splitTextToSize(exp.description, 170);
            doc.text(descLines, 20, yPos);
            yPos += descLines.length * 5 + 5;
          }
        }
      });
      yPos += 5;
    }

    // Education
    if (formData.education.some(edu => edu.degree)) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("EDUCATION", 20, yPos);
      yPos += 7;

      formData.education.forEach(edu => {
        if (edu.degree) {
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(edu.degree, 20, yPos);
          yPos += 5;
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(`${edu.institution} | ${edu.year}`, 20, yPos);
          yPos += 7;
        }
      });
      yPos += 5;
    }

    // Skills
    if (formData.skills) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("SKILLS", 20, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const skillsLines = doc.splitTextToSize(formData.skills, 170);
      doc.text(skillsLines, 20, yPos);
    }

    // Save PDF
    doc.save(`${formData.fullName.replace(/\s+/g, '_')}_Resume.pdf`);
    
    toast({
      title: "Resume downloaded!",
      description: `Your ${selectedTemplate?.name || 'ATS'} resume has been downloaded successfully`
    });

    // Show upgrade nudge for free users after download
    if (!isPaid) {
      setTimeout(() => setShowUpgradeModal(true), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 md:py-12 pt-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 md:mb-12"
        >
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <span>Home</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-black font-medium">ATS Resume Templates</span>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-black">ATS Resume Templates</h1>
                <Badge className="bg-lime-400 text-black border-2 border-black font-bold">
                  <Award className="w-3 h-3 mr-1" />
                  ATS Verified
                </Badge>
              </div>
              <p className="text-gray-600 text-base md:text-lg">
                Professional templates optimized to pass Applicant Tracking Systems
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white border-2 border-black rounded-xl p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-black mb-1">98%</div>
              <div className="text-sm text-gray-600">ATS Pass Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-black mb-1">50K+</div>
              <div className="text-sm text-gray-600">Downloads</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-black mb-1">6</div>
              <div className="text-sm text-gray-600">Templates</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-black mb-1">Free</div>
              <div className="text-sm text-gray-600">Forever</div>
            </div>
          </div>
        </motion.div>

        {!showForm ? (
          // Template Selection Grid
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-2xl transition-all duration-300 border-2 border-gray-200 rounded-xl overflow-hidden group">
                  <div className={`h-32 bg-gradient-to-br ${template.color} relative`}>
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-white text-black font-bold">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        {template.atsScore}% ATS
                      </Badge>
                    </div>
                    <div className="absolute bottom-4 left-4">
                      <FileText className="w-12 h-12 text-white opacity-50" />
                    </div>
                  </div>
                  
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-black mb-2">{template.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                    
                    <div className="space-y-2 mb-6">
                      {template.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 bg-black hover:bg-gray-900 text-white"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Use Template
                      </Button>
                      <Button variant="outline" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          // Form Section
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="rounded-xl border-2 border-gray-200">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-black mb-1">Customize Your Resume</h2>
                      <p className="text-sm text-gray-600">Fill in your details to generate your ATS-optimized resume</p>
                    </div>
                    <Button variant="outline" onClick={() => setShowForm(false)}>
                      Back
                    </Button>
                  </div>

                  {/* Personal Information */}
                  <div className="space-y-4 mb-8">
                    <h3 className="font-bold text-black flex items-center gap-2">
                      <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm">1</div>
                      Personal Information
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        placeholder="Full Name *"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        className="border-2"
                      />
                      <Input
                        placeholder="Email *"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="border-2"
                      />
                      <Input
                        placeholder="Phone *"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="border-2"
                      />
                      <Input
                        placeholder="Location"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className="border-2"
                      />
                      <Input
                        placeholder="LinkedIn URL"
                        value={formData.linkedin}
                        onChange={(e) => handleInputChange('linkedin', e.target.value)}
                        className="border-2 md:col-span-2"
                      />
                    </div>
                  </div>

                  {/* Professional Summary */}
                  <div className="space-y-4 mb-8">
                    <h3 className="font-bold text-black flex items-center gap-2">
                      <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm">2</div>
                      Professional Summary
                    </h3>
                    <Textarea
                      placeholder="Write a compelling summary of your professional background and key achievements..."
                      value={formData.summary}
                      onChange={(e) => handleInputChange('summary', e.target.value)}
                      className="border-2 min-h-32"
                    />
                  </div>

                  {/* Experience */}
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-black flex items-center gap-2">
                        <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm">3</div>
                        Work Experience
                      </h3>
                      <Button variant="outline" size="sm" onClick={addExperience}>
                        + Add More
                      </Button>
                    </div>
                    {formData.experience.map((exp, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200 space-y-3">
                        <Input
                          placeholder="Job Title *"
                          value={exp.title}
                          onChange={(e) => {
                            const newExp = [...formData.experience];
                            newExp[index].title = e.target.value;
                            handleInputChange('experience', newExp);
                          }}
                          className="border-2 bg-white"
                        />
                        <div className="grid md:grid-cols-2 gap-3">
                          <Input
                            placeholder="Company *"
                            value={exp.company}
                            onChange={(e) => {
                              const newExp = [...formData.experience];
                              newExp[index].company = e.target.value;
                              handleInputChange('experience', newExp);
                            }}
                            className="border-2 bg-white"
                          />
                          <Input
                            placeholder="Period (e.g., 2020-2023)"
                            value={exp.period}
                            onChange={(e) => {
                              const newExp = [...formData.experience];
                              newExp[index].period = e.target.value;
                              handleInputChange('experience', newExp);
                            }}
                            className="border-2 bg-white"
                          />
                        </div>
                        <Textarea
                          placeholder="Describe your responsibilities and achievements..."
                          value={exp.description}
                          onChange={(e) => {
                            const newExp = [...formData.experience];
                            newExp[index].description = e.target.value;
                            handleInputChange('experience', newExp);
                          }}
                          className="border-2 bg-white"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Education */}
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-black flex items-center gap-2">
                        <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm">4</div>
                        Education
                      </h3>
                      <Button variant="outline" size="sm" onClick={addEducation}>
                        + Add More
                      </Button>
                    </div>
                    {formData.education.map((edu, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200 space-y-3">
                        <Input
                          placeholder="Degree *"
                          value={edu.degree}
                          onChange={(e) => {
                            const newEdu = [...formData.education];
                            newEdu[index].degree = e.target.value;
                            handleInputChange('education', newEdu);
                          }}
                          className="border-2 bg-white"
                        />
                        <div className="grid md:grid-cols-2 gap-3">
                          <Input
                            placeholder="Institution *"
                            value={edu.institution}
                            onChange={(e) => {
                              const newEdu = [...formData.education];
                              newEdu[index].institution = e.target.value;
                              handleInputChange('education', newEdu);
                            }}
                            className="border-2 bg-white"
                          />
                          <Input
                            placeholder="Year"
                            value={edu.year}
                            onChange={(e) => {
                              const newEdu = [...formData.education];
                              newEdu[index].year = e.target.value;
                              handleInputChange('education', newEdu);
                            }}
                            className="border-2 bg-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Skills */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-black flex items-center gap-2">
                      <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm">5</div>
                      Skills
                    </h3>
                    <Textarea
                      placeholder="List your skills separated by commas (e.g., Python, JavaScript, Project Management, Leadership)"
                      value={formData.skills}
                      onChange={(e) => handleInputChange('skills', e.target.value)}
                      className="border-2"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview & Download */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                <Card className="rounded-xl border-2 border-gray-200">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-black mb-4">Selected Template</h3>
                    <div className={`h-24 bg-gradient-to-br ${selectedTemplate?.color} rounded-lg mb-4 flex items-center justify-center`}>
                      <FileText className="w-12 h-12 text-white" />
                    </div>
                    <h4 className="font-bold text-black mb-2">{selectedTemplate?.name}</h4>
                    <p className="text-sm text-gray-600 mb-4">{selectedTemplate?.description}</p>
                    <Badge className="bg-lime-400 text-black font-bold">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      {selectedTemplate?.atsScore}% ATS Compatible
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="rounded-xl border-2 border-black bg-gradient-to-br from-black to-gray-900">
                  <CardContent className="p-6 text-white">
                    <Sparkles className="w-8 h-8 text-lime-400 mb-3" />
                    <h3 className="font-bold mb-2">Ready to Download?</h3>
                    <p className="text-sm text-gray-300 mb-4">
                      Your resume will be generated in ATS-friendly PDF format
                    </p>
                    <Button 
                      className="w-full bg-lime-400 hover:bg-lime-500 text-black font-bold"
                      onClick={generatePDF}
                      disabled={!formData.fullName || !formData.email}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Resume
                    </Button>
                    <p className="text-xs text-gray-400 mt-3 text-center">
                      Free • No watermark • Instant download
                    </p>
                  </CardContent>
                </Card>

                <Card className="rounded-xl border-2 border-blue-200 bg-blue-50">
                  <CardContent className="p-6">
                    <TrendingUp className="w-6 h-6 text-blue-600 mb-2" />
                    <h4 className="font-bold text-black mb-2">Pro Tips</h4>
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Use action verbs to start bullet points</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Include quantifiable achievements</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Keep it to 1-2 pages maximum</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />

      {/* Post-download upgrade nudge for free users */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        featureKey="resume_edits"
        plan={plan}
        message="Want more powerful resume tools? Upgrade for unlimited uploads, AI analysis, and premium templates."
      />
    </div>
  );
};

export default ATSTemplates;
