import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Download, 
  Loader2, 
  Sparkles, 
  Wand2, 
  Type,
  Check, 
  Save,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import { apiClient } from "@/lib/api";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { PDFDocument, rgb } from "pdf-lib";
import { saveAs } from "file-saver";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface TextAnnotation {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  page: number;
}

const PDFEditorSejda = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState<any>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [applyingAI, setApplyingAI] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.2);
  const [pdfLoading, setPdfLoading] = useState(false);
  
  // Sejda-style editing state
  const [editMode, setEditMode] = useState(false);
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [isAddingText, setIsAddingText] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);

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
      
      // Set PDF URL
      if (data.stored_filename) {
        const pdfEndpoint = `${import.meta.env.VITE_API_URL}/api/v1/resumes/${id}/download`;
        setPdfUrl(pdfEndpoint);
        console.log('PDF URL set to:', pdfEndpoint);
        
        // Load PDF bytes for editing
        const response = await fetch(pdfEndpoint);
        const arrayBuffer = await response.arrayBuffer();
        setPdfBytes(new Uint8Array(arrayBuffer));
      }
      
      // Load AI suggestions
      let suggestions = [];
      if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        suggestions = data.suggestions;
      } else if (data.analysis_data?.suggestions) {
        suggestions = data.analysis_data.suggestions;
      }
      
      if (suggestions.length > 0) {
        setAiSuggestions(suggestions);
        console.log('Loaded AI suggestions:', suggestions);
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

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfLoading(false);
    console.log(`PDF loaded: ${numPages} pages`);
  };

  const generateMoreSuggestions = async () => {
    setApplyingAI(true);
    try {
      toast({
        title: "Generating suggestions...",
        description: "Using GPT-5 to analyze your resume",
      });
      
      const data: any = await apiClient.generateAISuggestions(Number(id));
      
      if (data && data.suggestions && data.suggestions.length > 0) {
        setAiSuggestions([...aiSuggestions, ...data.suggestions]);
        toast({
          title: "Success",
          description: `Generated ${data.suggestions.length} new AI suggestions!`,
        });
      }
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      toast({
        title: "Error",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setApplyingAI(false);
    }
  };

  const addTextAnnotation = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingText) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newAnnotation: TextAnnotation = {
      id: Date.now().toString(),
      text: "Double click to edit",
      x,
      y,
      fontSize: 14,
      page: currentPage,
    };
    
    setTextAnnotations([...textAnnotations, newAnnotation]);
    setIsAddingText(false);
  };

  const updateAnnotationText = (id: string, text: string) => {
    setTextAnnotations(textAnnotations.map(ann => 
      ann.id === id ? { ...ann, text } : ann
    ));
  };

  const deleteAnnotation = (id: string) => {
    setTextAnnotations(textAnnotations.filter(ann => ann.id !== id));
    setSelectedAnnotation(null);
  };

  const exportModifiedPDF = async () => {
    if (!pdfBytes) {
      toast({
        title: "Error",
        description: "PDF not loaded",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      toast({
        title: "Exporting PDF...",
        description: "Adding your changes",
      });

      // Load the PDF
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      // Add text annotations to PDF
      for (const annotation of textAnnotations) {
        if (annotation.page <= pages.length) {
          const page = pages[annotation.page - 1];
          const { height } = page.getSize();
          
          page.drawText(annotation.text, {
            x: annotation.x / zoom,
            y: height - (annotation.y / zoom),
            size: annotation.fontSize,
            color: rgb(0, 0, 0),
          });
        }
      }

      // Save the PDF
      const modifiedPdfBytes = await pdfDoc.save();
      const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      saveAs(blob, `${resume?.original_filename || 'resume'}_edited.pdf`);

      toast({
        title: "Success!",
        description: "Your modified PDF has been downloaded",
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Error",
        description: "Failed to export PDF",
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
          <p className="text-gray-600">Loading PDF Editor...</p>
        </div>
      </div>
    );
  }

  const currentPageAnnotations = textAnnotations.filter(ann => ann.page === currentPage);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-24 md:pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Toolbar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">PDF Editor</h1>
                  <span className="text-sm text-gray-500">
                    {resume?.original_filename}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Editing Tools */}
                  <Button
                    variant={isAddingText ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsAddingText(!isAddingText)}
                    className="gap-2"
                  >
                    <Type className="w-4 h-4" />
                    Add Text
                  </Button>

                  <div className="w-px h-6 bg-gray-300" />

                  {/* Zoom Controls */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium w-16 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>

                  <div className="w-px h-6 bg-gray-300" />

                  {/* Save & Export */}
                  <Button
                    onClick={exportModifiedPDF}
                    disabled={isSaving}
                    className="bg-lime-400 hover:bg-lime-500 text-black font-bold gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Export PDF
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* PDF Viewer */}
            <div className="lg:col-span-3">
              <Card className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {isAddingText && "Click anywhere on the PDF to add text"}
                  </span>
                  {numPages && numPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm font-medium">
                        Page {currentPage} of {numPages}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                        disabled={currentPage === numPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>

                <div 
                  className="relative border rounded-lg bg-white overflow-auto"
                  style={{ maxHeight: '800px', cursor: isAddingText ? 'crosshair' : 'default' }}
                  onClick={addTextAnnotation}
                >
                  {pdfLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                  )}

                  <div className="relative inline-block">
                    <Document
                      file={pdfUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={(error) => {
                        console.error('PDF load error:', error);
                        setPdfLoading(false);
                      }}
                      loading={<Loader2 className="w-8 h-8 animate-spin" />}
                    >
                      <Page
                        pageNumber={currentPage}
                        scale={zoom}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                      />
                    </Document>

                    {/* Text Annotations Overlay */}
                    {currentPageAnnotations.map((annotation) => (
                      <div
                        key={annotation.id}
                        style={{
                          position: 'absolute',
                          left: `${annotation.x}px`,
                          top: `${annotation.y}px`,
                          fontSize: `${annotation.fontSize}px`,
                          cursor: 'move',
                          border: selectedAnnotation === annotation.id ? '2px solid #c7ff6b' : '2px dashed #ccc',
                          padding: '4px',
                          background: 'rgba(255, 255, 255, 0.9)',
                          borderRadius: '4px',
                          minWidth: '100px',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnnotation(annotation.id);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          const newText = prompt('Edit text:', annotation.text);
                          if (newText) {
                            updateAnnotationText(annotation.id, newText);
                          }
                        }}
                      >
                        {annotation.text}
                        {selectedAnnotation === annotation.id && (
                          <button
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteAnnotation(annotation.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* AI Suggestions Sidebar */}
            <div className="space-y-6">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-lime-400" />
                  <h3 className="font-bold">AI Suggestions</h3>
                </div>

                <Button
                  onClick={generateMoreSuggestions}
                  disabled={applyingAI}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white mb-4"
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
                    <p className="text-sm">Click to generate suggestions</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {aiSuggestions.map((suggestion, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-3 border rounded-lg hover:border-lime-400 transition-colors bg-white"
                      >
                        <div className="flex gap-2 mb-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
                            suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {suggestion.priority?.toUpperCase() || 'MEDIUM'}
                          </span>
                        </div>
                        <p className="text-sm font-medium mb-1">{suggestion.issue || suggestion.title}</p>
                        <p className="text-xs text-gray-600 mb-2">{suggestion.suggestion}</p>
                        {suggestion.example && (
                          <div className="bg-gray-50 p-2 rounded text-xs border-l-2 border-lime-400">
                            <p className="text-gray-600">{suggestion.example}</p>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-4">
                <h3 className="font-bold mb-3">Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pages:</span>
                    <span className="font-bold">{numPages || 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Annotations:</span>
                    <span className="font-bold">{textAnnotations.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ATS Score:</span>
                    <span className="font-bold text-lime-500">{resume?.analysis_score || 0}/100</span>
                  </div>
                </div>
                <Button
                  onClick={loadResume}
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 mt-3"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFEditorSejda;
