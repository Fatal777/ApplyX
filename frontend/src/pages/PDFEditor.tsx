import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Upload, BarChart2, FileText, Target, Zap, Award, TrendingUp, 
  ChevronDown, Download, Share2, Check, AlertCircle, ArrowRight, 
  Sparkles, Clock, CheckCircle, Edit3, User, Bell, Type, Pencil,
  Highlighter, Square, Circle, Minus, Eraser, MousePointer, Palette,
  Undo, Redo, Trash2, ZoomIn, ZoomOut, Loader2, Wand2, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { apiClient } from "@/lib/api";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { PDFDocument, rgb } from "pdf-lib";
import { saveAs } from "file-saver";
import { ChromePicker } from "react-color";
import { ToolRegistry } from "@/tools/ToolRegistry";
import { PDFTextAnalyzer, FontInfo, TextBlock } from "@/services/PDFTextAnalyzer";
import { TypographyControls } from "@/components/TypographyControls";
import { Annotation, ToolType } from "@/types/pdf";

// Set up PDF.js worker with local file (most reliable)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface Resume {
  id: number;
  user_id: number;
  original_filename: string;
  stored_filename?: string;
  analysis_data?: {
    scores?: {
      ats_score?: number;
    };
  };
  ats_score?: number;
}

const PDFEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Core state
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState<Resume | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [applyingAI, setApplyingAI] = useState(false);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.2);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  
  // Tool state
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [drawColor, setDrawColor] = useState('#000000');
  const [highlightColor, setHighlightColor] = useState('#FFFF00');
  const [fontSize, setFontSize] = useState(14);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // Typography state
  const [fontFamily, setFontFamily] = useState('Arial');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  
  // PDF Analysis state
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [detectedFonts, setDetectedFonts] = useState<string[]>([]);
  
  // Annotation state
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [pdfContainerRef, setPdfContainerRef] = useState<HTMLDivElement | null>(null);
  
  // History for undo/redo
  const [history, setHistory] = useState<Annotation[][]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  const signOut = async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    await supabase.auth.signOut();
    navigate('/login');
  };

  const loadResume = async () => {
    console.log('🔄 Starting loadResume for ID:', id);
    try {
      setLoading(true);
      setPdfLoading(true);
      setPdfError(null);
      
      console.log('📡 Fetching resume data...');
      const data = await apiClient.getResume(Number(id)) as Resume;
      console.log('✅ Resume data received:', data);
      console.log('Resume data keys:', Object.keys(data));
      console.log('Resume ID:', data.id, 'User ID:', data.user_id, 'Filename:', data.original_filename);
      setResume(data);
      
      // Load PDF with authentication
      console.log('📄 Checking for stored_filename:', data.stored_filename);
      if (data.stored_filename) {
        console.log('📥 Starting PDF download...');
        try {
          const pdfEndpoint = `${import.meta.env.VITE_API_URL}/api/v1/resumes/${id}/download`;
          
          console.log('Fetching PDF from:', pdfEndpoint);
          
          // Get token from Supabase session
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY
          );
          const { data: { session } } = await supabase.auth.getSession();
          
          console.log('Session exists:', !!session, 'Token exists:', !!session?.access_token);
          
          if (!session?.access_token) {
            throw new Error('No valid authentication session found. Please log in again.');
          }
          
          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
          
          const response = await fetch(pdfEndpoint, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          console.log('Creating blob URL for PDF display...');
          
          // Create blob URL for react-pdf
          const pdfBlob = new Blob([uint8Array as BlobPart], { type: 'application/pdf' });
          const pdfUrl = URL.createObjectURL(pdfBlob);
          setPdfData(pdfUrl);
          
          // Store PDF bytes for export
          setPdfBytes(uint8Array);
          
          console.log('PDF loaded successfully, size:', uint8Array.length, 'bytes, URL created:', !!pdfUrl);
          setPdfLoading(false); // Set loading false on success
          
        } catch (error: any) {
          console.error('❌ PDF download failed:', error);
          console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
          });
          setPdfLoading(false);
          setPdfError(error.message);
        }
      } else {
        console.log('⚠️ No stored_filename found, skipping PDF load');
        setPdfLoading(false); // Set loading false if no file
        setPdfError("No PDF file found");
      }
      
      // Don't auto-load AI suggestions - only load when user clicks "Generate with GPT-5"
      setAiSuggestions([]);
    } catch (error) {
      console.error('Error loading resume:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401 || error.response?.status === 403) {
        setAuthError(true);
        toast({
          title: "Authentication Required",
          description: "Your session has expired. Please sign in again.",
          variant: "destructive",
        });
        return;
      }
      
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
    console.log(`✅ PDF Document loaded successfully: ${numPages} pages`);
    console.log('PDF.js version:', pdfjs.version);
    console.log('Worker URL:', pdfjs.GlobalWorkerOptions.workerSrc);
    setNumPages(numPages);
    setPdfLoading(false);
    setPdfError(null);
    
    // Analyze PDF text and fonts
    if (pdfData) {
      PDFTextAnalyzer.analyzePDF(pdfData).then(blocks => {
        setTextBlocks(blocks);
        const fonts = [...new Set(blocks.map(block => block.font.family))];
        setDetectedFonts(fonts);
        console.log('📝 Analyzed PDF text blocks:', blocks.length, 'Detected fonts:', fonts);
      }).catch(error => {
        console.error('Error analyzing PDF:', error);
      });
    }
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('❌ PDF Document load error:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    setPdfLoading(false);
    setPdfError(error.message);
  };

  // Professional annotation tools implementation
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const tool = ToolRegistry.getTool(currentTool);
    if (!tool?.onMouseDown) return;

    const context = {
      pdfContainerRef: { current: pdfContainerRef },
      annotations,
      setAnnotations,
      currentPage,
      zoom,
      drawColor,
      highlightColor,
      fontSize,
      saveToHistory,
      setIsDrawing,
      setStartPos,
      isDrawing,
      startPos
    };

    tool.onMouseDown(e, context);
  }, [currentTool, pdfContainerRef, annotations, currentPage, zoom, drawColor, highlightColor, fontSize, isDrawing, startPos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const tool = ToolRegistry.getTool(currentTool);
    if (!tool?.onMouseMove) return;

    const context = {
      pdfContainerRef: { current: pdfContainerRef },
      annotations,
      setAnnotations,
      currentPage,
      zoom,
      drawColor,
      highlightColor,
      fontSize,
      saveToHistory,
      setIsDrawing,
      setStartPos,
      isDrawing,
      startPos
    };

    tool.onMouseMove(e, context);
  }, [currentTool, pdfContainerRef, annotations, currentPage, zoom, drawColor, highlightColor, fontSize, isDrawing, startPos]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const tool = ToolRegistry.getTool(currentTool);
    if (!tool?.onMouseUp) return;

    const context = {
      pdfContainerRef: { current: pdfContainerRef },
      annotations,
      setAnnotations,
      currentPage,
      zoom,
      drawColor,
      highlightColor,
      fontSize,
      saveToHistory,
      setIsDrawing,
      setStartPos,
      isDrawing,
      startPos
    };

    tool.onMouseUp(e, context);
  }, [currentTool, pdfContainerRef, annotations, currentPage, zoom, drawColor, highlightColor, fontSize, isDrawing, startPos]);

  const handleTextClick = useCallback((e: React.MouseEvent) => {
    const tool = ToolRegistry.getTool(currentTool);
    if (!tool?.onClick) return;

    // Detect font at click position
    const rect = pdfContainerRef?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const detectedFont = PDFTextAnalyzer.detectFontAtPosition(x, y, textBlocks);

      if (detectedFont) {
        setFontFamily(detectedFont.family);
        setFontSize(detectedFont.size);
        setIsBold(detectedFont.weight === 'bold');
        setIsItalic(detectedFont.style === 'italic');
        console.log('🎨 Detected font at position:', detectedFont);
      }
    }

    const context = {
      pdfContainerRef: { current: pdfContainerRef },
      annotations,
      setAnnotations,
      currentPage,
      zoom,
      drawColor,
      highlightColor,
      fontSize,
      saveToHistory,
      setIsDrawing,
      setStartPos,
      isDrawing,
      startPos,
      // Typography properties
      fontFamily,
      isBold,
      isItalic,
      isUnderline,
    };

    tool.onClick(e, context);
  }, [currentTool, pdfContainerRef, annotations, currentPage, zoom, drawColor, highlightColor, fontSize, isDrawing, startPos, textBlocks, fontFamily, isBold, isItalic, isUnderline]);

  const saveToHistory = () => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push([...annotations]);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      setAnnotations(history[historyStep - 1]);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      setAnnotations(history[historyStep + 1]);
    }
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(annotations.filter(ann => ann.id !== id));
    setSelectedAnnotation(null);
    toast({
      title: "Annotation deleted",
    });
  };

  const clearAll = () => {
    if (confirm('Clear all annotations on this page?')) {
      setAnnotations(annotations.filter(ann => ann.page !== currentPage));
      saveToHistory();
    }
  };

  const generateMoreSuggestions = async () => {
    setApplyingAI(true);
    try {
      toast({
        title: "Generating suggestions...",
        description: "Using GPT-5 to analyze your resume with extracted keywords",
      });
      
      const data: any = await apiClient.generateAISuggestions(Number(id));
      
      if (data && data.suggestions && data.suggestions.length > 0) {
        // Filter out invalid suggestions (priority strings, short strings, etc.)
        const validSuggestions = data.suggestions.filter((s: any) => {
          if (typeof s === 'string') {
            // Remove priority strings and very short suggestions
            const lower = s.toLowerCase().trim();
            return lower !== 'high' && lower !== 'medium' && lower !== 'low' && s.length > 10;
          } else if (typeof s === 'object' && s.text) {
            // If it's an object, check the text field
            const lower = s.text.toLowerCase().trim();
            return lower !== 'high' && lower !== 'medium' && lower !== 'low' && s.text.length > 10;
          }
          return false;
        });
        
        setAiSuggestions([...aiSuggestions, ...validSuggestions]);
        toast({
          title: "Success!",
          description: `Generated ${validSuggestions.length} new AI suggestions!`,
        });
      } else {
        toast({
          title: "No new suggestions",
          description: "AI analysis complete, no additional suggestions needed",
        });
      }
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to generate suggestions",
        variant: "destructive",
      });
    } finally {
      setApplyingAI(false);
    }
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
        description: "Adding your annotations",
      });

      // Load the PDF
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      // Add text annotations to PDF
      const textAnnotations = annotations.filter(ann => ann.type === 'text');
      for (const annotation of textAnnotations) {
        if (annotation.page <= pages.length && annotation.text) {
          const page = pages[annotation.page - 1];
          const { height } = page.getSize();
          
          // Create font style based on annotation properties
          let fontOptions = {
            size: annotation.fontSize || 14,
            color: rgb(0, 0, 0), // Default black
          };

          // Note: pdf-lib has limited font support. For production, consider using different PDF library
          // that supports more fonts and styles
          
          page.drawText(annotation.text, {
            x: annotation.x,
            y: height - annotation.y,
            ...fontOptions,
          });
        }
      }

      // Save the PDF
      const modifiedPdfBytes = await pdfDoc.save();
      const blob = new Blob([modifiedPdfBytes as BlobPart], { type: 'application/pdf' });
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

  // Initialize history on first load
  useEffect(() => {
    if (annotations.length > 0 && historyStep === -1) {
      setHistory([annotations]);
      setHistoryStep(0);
    }
  }, [annotations, historyStep]);

  useEffect(() => {
    loadResume();
  }, []);

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Navbar />
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Expired</h1>
            <p className="text-gray-600 mb-6">
              Your authentication session has expired. Please sign in again to continue editing your resume.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={signOut}
                className="w-full bg-lime-400 hover:bg-lime-500 text-black font-bold"
              >
                Sign In Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
                className="w-full"
              >
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentPageAnnotations = annotations.filter(ann => ann.page === currentPage);

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
                    variant={currentTool === 'select' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentTool('select')}
                    title="Select"
                    disabled={!pdfData || !!pdfError}
                  >
                    <MousePointer className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant={currentTool === 'text' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentTool('text')}
                    title="Add Text"
                    disabled={!pdfData || !!pdfError}
                  >
                    <Type className="w-4 h-4" />
                  </Button>

                  <Button
                    variant={currentTool === 'highlight' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentTool('highlight')}
                    title="Highlight"
                    disabled={!pdfData || !!pdfError}
                  >
                    <Highlighter className="w-4 h-4" />
                  </Button>

                  <Button
                    variant={currentTool === 'draw' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentTool('draw')}
                    title="Draw"
                    disabled={!pdfData || !!pdfError}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>

                  <Button
                    variant={currentTool === 'rectangle' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentTool('rectangle')}
                    title="Rectangle"
                    disabled={!pdfData || !!pdfError}
                  >
                    <Square className="w-4 h-4" />
                  </Button>

                  <Button
                    variant={currentTool === 'circle' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentTool('circle')}
                    title="Circle"
                    disabled={!pdfData || !!pdfError}
                  >
                    <Circle className="w-4 h-4" />
                  </Button>

                  <Button
                    variant={currentTool === 'line' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentTool('line')}
                    title="Line"
                    disabled={!pdfData || !!pdfError}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>

                  <Button
                    variant={currentTool === 'eraser' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentTool('eraser')}
                    title="Eraser"
                    disabled={!pdfData || !!pdfError}
                  >
                    <Eraser className="w-4 h-4" />
                  </Button>

                  <div className="w-px h-6 bg-gray-300" />

                  {/* Typography Controls */}
                  {currentTool === 'text' && (
                    <TypographyControls
                      fontFamily={fontFamily}
                      setFontFamily={setFontFamily}
                      fontSize={fontSize}
                      setFontSize={setFontSize}
                      isBold={isBold}
                      setIsBold={setIsBold}
                      isItalic={isItalic}
                      setIsItalic={setIsItalic}
                      isUnderline={isUnderline}
                      setIsUnderline={setIsUnderline}
                      detectedFonts={detectedFonts}
                    />
                  )}

                  <div className="w-px h-6 bg-gray-300" />

                  {/* Color Picker */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      title="Color"
                      disabled={!pdfData || !!pdfError}
                    >
                      <Palette className="w-4 h-4 mr-1" />
                      <div 
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: currentTool === 'highlight' ? highlightColor : drawColor }}
                      />
                    </Button>
                    {showColorPicker && (
                      <div className="absolute top-full mt-2 z-50">
                        <div 
                          className="fixed inset-0" 
                          onClick={() => setShowColorPicker(false)}
                        />
                        <ChromePicker
                          color={currentTool === 'highlight' ? highlightColor : drawColor}
                          onChange={(color) => {
                            if (currentTool === 'highlight') {
                              setHighlightColor(color.hex);
                            } else {
                              setDrawColor(color.hex);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="w-px h-6 bg-gray-300" />

                  {/* Undo/Redo */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={undo}
                    disabled={historyStep <= 0}
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={redo}
                    disabled={historyStep >= history.length - 1}
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAll}
                    disabled={annotations.filter(a => a.page === currentPage).length === 0}
                    title="Clear All"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>

                  <div className="w-px h-6 bg-gray-300" />

                  {/* Zoom Controls */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                    disabled={!pdfData}
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
                    disabled={!pdfData}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>

                  <div className="w-px h-6 bg-gray-300" />

                  {/* Save & Export */}
                  <Button
                    onClick={exportModifiedPDF}
                    disabled={isSaving || !pdfBytes}
                    className="bg-lime-400 hover:bg-lime-500 text-black font-bold gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
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
                    {currentTool === 'select' && "Select and move annotations"}
                    {currentTool === 'text' && "Click anywhere on the PDF to add text. Click on existing text to edit it directly."}
                    {currentTool === 'highlight' && "Drag to highlight text"}
                    {currentTool === 'draw' && "Draw freely on the PDF"}
                    {currentTool === 'rectangle' && "Drag to draw a rectangle"}
                    {currentTool === 'circle' && "Drag to draw a circle"}
                    {currentTool === 'line' && "Drag to draw a line"}
                    {currentTool === 'eraser' && "Click annotations to erase them"}
                    {pdfError && !pdfData && (
                      <span className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        PDF load error
                      </span>
                    )}
                    {pdfError && pdfData && (
                      <span className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        PDF rendering error
                      </span>
                    )}
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
                  style={{ maxHeight: '800px' }}
                >
                  {pdfError && pdfData ? (
                    <div className="flex items-center justify-center p-8 text-red-600">
                      <AlertCircle className="w-8 h-8 mr-2" />
                      <div>
                        <p className="font-semibold">PDF Rendering Error</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {pdfError.includes('worker') ? 'PDF.js worker failed to load. Please refresh the page.' : pdfError}
                        </p>
                      </div>
                    </div>
                  ) : pdfData ? (
                    <div
                      ref={(el) => setPdfContainerRef(el)}
                      className="relative inline-block"
                      style={{ 
                        cursor: currentTool === 'text' ? 'crosshair' : 
                               (currentTool === 'select' ? 'default' : 'crosshair')
                      }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onClick={handleTextClick}
                    >
                      <Document
                        file={pdfData}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={
                          <div className="flex items-center justify-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="ml-2 text-gray-600">Loading PDF...</span>
                          </div>
                        }
                      >
                        <Page
                          pageNumber={currentPage}
                          scale={zoom}
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
                        />
                      </Document>

                      {/* Render Annotations */}
                      {currentPageAnnotations.map((annotation) => {
                        const tool = ToolRegistry.getTool(annotation.type);
                        if (tool?.render) {
                          return tool.render(annotation, zoom);
                        }
                        return null;
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-8 text-gray-500">
                      <AlertCircle className="w-8 h-8 mr-2" />
                      No PDF available
                    </div>
                  )}
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
                      Analyzing...
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
                    <p className="text-sm">Click to generate AI suggestions</p>
                    <p className="text-xs mt-1">Based on extracted keywords</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {aiSuggestions.map((suggestion, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-3 border rounded-lg hover:border-lime-400 transition-colors bg-white"
                      >
                        <div className="flex gap-2 mb-2 flex-wrap">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
                            suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {(suggestion.priority || 'medium').toUpperCase()}
                          </span>
                          {suggestion.category && (
                            <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-700">
                              {suggestion.category}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium mb-1">
                          {suggestion.issue || suggestion.title || suggestion.suggestion}
                        </p>
                        {suggestion.suggestion && suggestion.issue && (
                          <p className="text-xs text-gray-600 mb-2">{suggestion.suggestion}</p>
                        )}
                        {suggestion.example && (
                          <div className="bg-gray-50 p-2 rounded text-xs border-l-2 border-lime-400 mt-2">
                            <p className="text-gray-700 font-medium">Example:</p>
                            <p className="text-gray-600 mt-1">{suggestion.example}</p>
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
                    <span className="font-bold">{annotations.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ATS Score:</span>
                    <span className="font-bold text-lime-500">
                      {resume?.analysis_data?.scores?.ats_score || resume?.ats_score || 0}/100
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Suggestions:</span>
                    <span className="font-bold">{aiSuggestions.length}</span>
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

export default PDFEditor;
