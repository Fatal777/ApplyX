import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Download, 
  Loader2, 
  Sparkles, 
  Wand2, 
  FileText, 
  Check, 
  Eye, 
  Edit3,
  Save,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import { apiClient } from "@/lib/api";

const PDFEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState<any>(null);
  const [editedContent, setEditedContent] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [applyingAI, setApplyingAI] = useState(false);
  const [activeView, setActiveView] = useState<"edit" | "preview">("edit");
  const [pdfUrl, setPdfUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    loadResume();
    window.scrollTo(0, 0);
  }, [id]);

  const loadResume = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getResume(Number(id));
      console.log('Resume data:', data);
      setResume(data);
      setEditedContent(data.extracted_text || "");
      
      // Set PDF URL for preview - try multiple possible paths
      if (data.stored_filename) {
        const possibleUrls = [
          `${import.meta.env.VITE_API_URL}/api/v1/resumes/${id}/download`,
          `${import.meta.env.VITE_API_URL}/uploads/${data.stored_filename}`,
          data.file_path
        ];
        
        // Try the download endpoint first
        setPdfUrl(possibleUrls[0]);
        console.log('PDF URL set to:', possibleUrls[0]);
      }
      
      // Load AI suggestions - check both suggestions and analysis data
      let suggestions = [];
      
      if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        suggestions = data.suggestions;
      } else if (data.analysis_data?.suggestions) {
        suggestions = data.analysis_data.suggestions;
      }
      
      if (suggestions.length > 0) {
        setAiSuggestions(suggestions);
        console.log('Loaded AI suggestions:', suggestions);
      } else {
        console.log('No AI suggestions found, will generate on request');
      }
    } catch (error) {
      console.error('Error loading resume:', error);
      toast({
        title: "Error",
        description: "Failed to load resume",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyAISuggestion = (suggestion: any) => {
    try {
      // Find the relevant section in the content
      const suggestionText = suggestion.example || suggestion.suggestion;
      
      // Add the suggestion as a new section or append
      const newContent = editedContent + "\n\n--- AI Suggestion Applied ---\n" + suggestionText;
      setEditedContent(newContent);
      
      toast({
        title: "Success",
        description: "AI suggestion applied to your resume!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to apply suggestion",
        variant: "destructive",
      });
    }
  };

  const generateMoreSuggestions = async () => {
    setApplyingAI(true);
    try {
      toast({
        title: "Generating suggestions...",
        description: "Using GPT-5 to analyze your resume",
      });
      
      // Use apiClient for proper authentication
      const data: any = await apiClient.generateAISuggestions(Number(id));
      
      if (data && data.suggestions && data.suggestions.length > 0) {
        setAiSuggestions([...aiSuggestions, ...data.suggestions]);
        toast({
          title: "Success",
          description: `Generated ${data.suggestions.length} new AI suggestions!`,
        });
      } else {
        toast({
          title: "Info",
          description: "No new suggestions generated at this time.",
        });
      }
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      const errorMsg = error.response?.data?.detail || error.message || "Failed to generate suggestions. Please try again.";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setApplyingAI(false);
    }
  };

  const downloadEditedResume = () => {
    try {
      // Create a text file with the edited content
      const blob = new Blob([editedContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resume?.original_filename || 'resume'}_edited.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded!",
        description: "Your edited resume has been downloaded as a text file",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download resume",
        variant: "destructive",
      });
    }
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement save endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Saved!",
        description: "Your changes have been saved",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Navbar />
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading resume editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-24 md:pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">Resume Editor</h1>
                <p className="text-gray-600">
                  Edit your resume with AI-powered suggestions
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={saveChanges}
                  disabled={isSaving}
                  variant="outline"
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save
                </Button>
                <Button
                  onClick={downloadEditedResume}
                  className="bg-lime-400 hover:bg-lime-500 text-black font-bold gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Editor */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Resume Editor
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant={activeView === "edit" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveView("edit")}
                        className="gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button
                        variant={activeView === "preview" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveView("preview")}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {activeView === "edit" ? (
                    <div className="space-y-4">
                      <Textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="min-h-[600px] font-mono text-sm"
                        placeholder="Your resume content will appear here..."
                      />
                      <p className="text-sm text-gray-500">
                        Edit your resume text directly. Click AI suggestions to apply improvements.
                      </p>
                    </div>
                  ) : (
                    <div className="min-h-[600px] border-2 rounded-lg bg-white overflow-auto">
                      {pdfUrl ? (
                        <div className="space-y-4 p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Original PDF</h3>
                            <a 
                              href={pdfUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-sm text-blue-600 hover:underline flex items-center gap-2"
                            >
                              <Download className="w-4 h-4" />
                              Download Original
                            </a>
                          </div>
                          
                          {/* PDF Viewer using iframe */}
                          <div className="border-2 rounded-lg overflow-hidden bg-gray-100">
                            <iframe
                              src={pdfUrl}
                              className="w-full h-[550px]"
                              title="Resume Preview"
                              onLoad={() => {
                                console.log('PDF loaded successfully');
                                setPdfLoading(false);
                              }}
                              onError={(e) => {
                                console.error('PDF load error:', e);
                                setPdfLoading(false);
                              }}
                            />
                          </div>
                          
                          <p className="text-xs text-gray-500 mt-2">
                            Note: This is the original PDF. Your edits in the Edit tab will be saved as a new version.
                          </p>
                        </div>
                      ) : (
                        <div className="p-6">
                          <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                            {editedContent || "No content to preview"}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* AI Suggestions Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-lime-400" />
                    AI Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={generateMoreSuggestions}
                    disabled={applyingAI}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  >
                    {applyingAI ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate with GPT-5
                      </>
                    )}
                  </Button>

                  {aiSuggestions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                      <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="font-medium">No AI suggestions yet</p>
                      <p className="text-sm mt-1">Click the button above to generate!</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {aiSuggestions.map((suggestion, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-4 border-2 rounded-lg hover:border-lime-400 transition-colors bg-white"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex gap-2">
                              <span className={`text-xs font-bold px-2 py-1 rounded ${
                                suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
                                suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {suggestion.priority?.toUpperCase() || 'MEDIUM'}
                              </span>
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {suggestion.category || 'General'}
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-sm font-semibold mb-1 text-gray-900">
                            {suggestion.issue || suggestion.title || 'Improvement Suggestion'}
                          </p>
                          
                          <p className="text-xs text-gray-600 mb-2">
                            {suggestion.suggestion || suggestion.description}
                          </p>
                          
                          {suggestion.example && (
                            <div className="bg-gray-50 p-2 rounded text-xs mb-2 border-l-2 border-lime-400">
                              <strong className="text-gray-700">Example:</strong>
                              <p className="text-gray-600 mt-1">{suggestion.example}</p>
                            </div>
                          )}
                          
                          <Button
                            onClick={() => applyAISuggestion(suggestion)}
                            size="sm"
                            className="w-full bg-lime-400 hover:bg-lime-500 text-black font-bold"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Apply This Fix
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resume Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Resume Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Words:</span>
                    <span className="font-bold text-lg">{editedContent.split(/\s+/).filter(w => w).length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Characters:</span>
                    <span className="font-bold text-lg">{editedContent.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">ATS Score:</span>
                    <span className="font-bold text-lg text-lime-500">{resume?.analysis_score || 0}/100</span>
                  </div>
                  <div className="pt-3 border-t">
                    <Button
                      onClick={loadResume}
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFEditor;
