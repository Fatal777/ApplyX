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
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import { apiClient } from "@/lib/api";

const PDFEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState<any>(null);
  const [editedContent, setEditedContent] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [applyingAI, setApplyingAI] = useState(false);
  const [activeView, setActiveView] = useState<"edit" | "preview">("edit");
  const [pdfUrl, setPdfUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadResume();
    window.scrollTo(0, 0);
  }, [id]);

  const loadResume = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getResume(Number(id));
      setResume(data);
      setEditedContent(data.extracted_text || "");
      
      // Set PDF URL for preview
      if (data.file_path) {
        setPdfUrl(`${import.meta.env.VITE_API_URL}/uploads/${data.stored_filename}`);
      }
      
      // Load AI suggestions
      if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setAiSuggestions(data.suggestions);
        console.log('Loaded AI suggestions:', data.suggestions);
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
    setApplyingAI(true);
    try {
      // Apply the suggestion to the content
      const suggestionText = suggestion.example || suggestion.suggestion;
      setEditedContent(prev => prev + "\n\n" + suggestionText);
      
      toast({
        title: "Success",
        description: "AI suggestion applied!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to apply suggestion",
        variant: "destructive",
      });
    } finally {
      setApplyingAI(false);
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

  const downloadAsPDF = async () => {
    try {
      // For now, download as text. Will implement proper PDF generation
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
        description: "Your edited resume has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download resume",
        variant: "destructive",
      });
    }
  };

  const downloadAsDOCX = async () => {
    toast({
      title: "Coming Soon",
      description: "DOCX export will be available soon",
    });
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement save endpoint
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
                  onClick={downloadAsPDF}
                  className="bg-lime-400 hover:bg-lime-500 text-black font-bold gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
                <Button
                  onClick={downloadAsDOCX}
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  DOCX
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
                      {/* Simple Toolbar */}
                      <div className="flex flex-wrap gap-2 p-2 border rounded-lg bg-gray-50">
                        <Button size="sm" variant="ghost" title="Bold">
                          <Bold className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Italic">
                          <Italic className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Underline">
                          <UnderlineIcon className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-6 bg-gray-300 my-auto" />
                        <Button size="sm" variant="ghost" title="Bullet List">
                          <List className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Numbered List">
                          <ListOrdered className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-6 bg-gray-300 my-auto" />
                        <Button size="sm" variant="ghost" title="Align Left">
                          <AlignLeft className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Align Center">
                          <AlignCenter className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Align Right">
                          <AlignRight className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-6 bg-gray-300 my-auto" />
                        <Button size="sm" variant="ghost" title="Undo">
                          <Undo className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Redo">
                          <Redo className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Editor Area */}
                      <div
                        ref={editorRef}
                        className="min-h-[600px] p-6 border-2 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                        contentEditable
                        suppressContentEditableWarning
                        onInput={(e) => setEditedContent(e.currentTarget.textContent || "")}
                        dangerouslySetInnerHTML={{ __html: editedContent.replace(/\n/g, '<br/>') }}
                      />
                      
                      <p className="text-sm text-gray-500">
                        Edit directly or click AI suggestions to apply them automatically
                      </p>
                    </div>
                  ) : (
                    <div className="min-h-[600px] border-2 rounded-lg p-6 bg-white overflow-auto">
                      {pdfUrl ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Original PDF Preview</h3>
                            <a 
                              href={pdfUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-sm text-blue-600 hover:underline"
                            >
                              Open in new tab
                            </a>
                          </div>
                          <iframe
                            src={pdfUrl}
                            className="w-full h-[550px] border rounded"
                            title="Resume Preview"
                          />
                        </div>
                      ) : (
                        <div 
                          className="whitespace-pre-wrap font-sans text-sm leading-relaxed prose max-w-none"
                          dangerouslySetInnerHTML={{ __html: editedContent.replace(/\n/g, '<br/>') }}
                        />
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
                        Generate More with GPT-5
                      </>
                    )}
                  </Button>

                  {aiSuggestions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No AI suggestions yet.</p>
                      <p className="text-sm">Click the button above to generate suggestions!</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {aiSuggestions.map((suggestion, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 border-2 rounded-lg hover:border-lime-400 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <span className={`text-xs font-bold px-2 py-1 rounded ${
                                suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
                                suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {suggestion.priority?.toUpperCase()}
                              </span>
                              <span className="text-xs ml-2 text-gray-600">{suggestion.category}</span>
                            </div>
                          </div>
                          <p className="text-sm font-semibold mb-1">{suggestion.issue}</p>
                          <p className="text-xs text-gray-600 mb-2">{suggestion.suggestion}</p>
                          {suggestion.example && (
                            <div className="bg-gray-50 p-2 rounded text-xs mb-2">
                              <strong>Example:</strong> {suggestion.example}
                            </div>
                          )}
                          <Button
                            onClick={() => applyAISuggestion(suggestion)}
                            disabled={applyingAI}
                            size="sm"
                            className="w-full bg-lime-400 hover:bg-lime-500 text-black font-bold"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Apply Fix
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
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Words:</span>
                    <span className="font-bold">{editedContent.split(/\s+/).filter(w => w).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Characters:</span>
                    <span className="font-bold">{editedContent.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Score:</span>
                    <span className="font-bold text-lime-500">{resume?.analysis_score || 0}/100</span>
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
