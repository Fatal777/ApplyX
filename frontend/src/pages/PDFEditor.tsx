import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Upload, BarChart2, FileText, Target, Zap, Award, TrendingUp, 
  ChevronDown, Download, Share2, Check, AlertCircle, ArrowRight, 
  Sparkles, Clock, CheckCircle, Edit3, User, Bell, Type, Pencil,
  Highlighter, Square, Circle, Minus, Eraser, MousePointer, Palette,
  Undo, Redo, Trash2, ZoomIn, ZoomOut, Loader2, Wand2, RefreshCw,
  FileUp, X, FileCheck
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
import { useDocumentStore } from "@/stores/documentStore";
import TextOverlay from "@/components/pdf-editor/TextOverlay";

// Set up PDF.js worker - Use local file to avoid CDN issues
// The worker file is served from the public directory
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

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
  const location = useLocation();
  const { toast } = useToast();
  
  // Demo mode detection - if no ID parameter, we're in demo mode
  const isDemo = !id || location.pathname === '/demo/pdf-editor';
  
  // Core state
  const [loading, setLoading] = useState(!isDemo); // Don't show loading in demo mode initially
  const [resume, setResume] = useState<Resume | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [applyingAI, setApplyingAI] = useState(false);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.2);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  
  // Demo mode specific states
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  
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

  // File input ref for upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Document store for demo mode
  const documentStore = useDocumentStore();

  const signOut = async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Handle file upload for demo mode
  const handleFileUpload = async (file: File) => {
    if (!file || file.type !== 'application/pdf') {
      toast({
        title: "Invalid file",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    setPdfLoading(true);
    setPdfError(null);
    setUploadedFileName(file.name);

    try {
      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Create blob URL for react-pdf
      const pdfBlob = new Blob([uint8Array], { type: 'application/pdf' });
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      setPdfData(pdfUrl);
      setPdfBytes(uint8Array);
      
      // Also load into document store for advanced features
      await documentStore.loadPDF(file);
      
      // Create mock resume data for demo
      setResume({
        id: 0,
        user_id: 0,
        original_filename: file.name,
        ats_score: 0
      });

      toast({
        title: "PDF loaded successfully",
        description: `${file.name} is ready for editing`,
      });
      
      setPdfLoading(false);
    } catch (error: any) {
      console.error('Error loading PDF:', error);
      setPdfError(error.message);
      setPdfLoading(false);
      toast({
        title: "Error loading PDF",
        description: "Failed to load the PDF file. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  // Load sample PDF for demo
  const loadSamplePDF = async () => {
    setPdfLoading(true);
    setPdfError(null);
    
    try {
      // Create a sample PDF with text
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size
      
      // Add sample content
      page.drawText('Sample Resume', {
        x: 50,
        y: 750,
        size: 24,
        color: rgb(0, 0, 0),
      });
      
      page.drawText('John Doe', {
        x: 50,
        y: 700,
        size: 20,
        color: rgb(0, 0, 0),
      });
      
      page.drawText('Software Engineer', {
        x: 50,
        y: 670,
        size: 16,
        color: rgb(0.3, 0.3, 0.3),
      });
      
      page.drawText('Experience', {
        x: 50,
        y: 620,
        size: 18,
        color: rgb(0, 0, 0),
      });
      
      page.drawText('• Senior Developer at Tech Corp (2020-2023)', {
        x: 50,
        y: 590,
        size: 12,
        color: rgb(0, 0, 0),
      });
      
      page.drawText('  - Led development of microservices architecture', {
        x: 50,
        y: 570,
        size: 11,
        color: rgb(0.2, 0.2, 0.2),
      });
      
      page.drawText('  - Managed team of 5 developers', {
        x: 50,
        y: 550,
        size: 11,
        color: rgb(0.2, 0.2, 0.2),
      });
      
      page.drawText('• Developer at StartUp Inc (2018-2020)', {
        x: 50,
        y: 520,
        size: 12,
        color: rgb(0, 0, 0),
      });
      
      page.drawText('Education', {
        x: 50,
        y: 470,
        size: 18,
        color: rgb(0, 0, 0),
      });
      
      page.drawText('• BS Computer Science - University of Technology (2014-2018)', {
        x: 50,
        y: 440,
        size: 12,
        color: rgb(0, 0, 0),
      });
      
      page.drawText('Skills', {
        x: 50,
        y: 390,
        size: 18,
        color: rgb(0, 0, 0),
      });
      
      page.drawText('JavaScript, Python, React, Node.js, AWS, Docker, Kubernetes', {
        x: 50,
        y: 360,
        size: 12,
        color: rgb(0, 0, 0),
      });
      
      page.drawText('This is a sample PDF for testing the editor.', {
        x: 50,
        y: 300,
        size: 10,
        color: rgb(0.5, 0.5, 0.5),
      });
      
      page.drawText('Try clicking on any text to edit it!', {
        x: 50,
        y: 280,
        size: 10,
        color: rgb(0.5, 0.5, 0.5),
      });

      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      const uint8Array = new Uint8Array(pdfBytes);
      
      // Create blob URL for display
      const pdfBlob = new Blob([uint8Array], { type: 'application/pdf' });
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      setPdfData(pdfUrl);
      setPdfBytes(uint8Array);
      setUploadedFileName('sample-resume.pdf');
      
      // Also load into document store
      await documentStore.loadPDF(uint8Array);
      
      // Create mock resume data
      setResume({
        id: 0,
        user_id: 0,
        original_filename: 'sample-resume.pdf',
        ats_score: 75
      });

      toast({
        title: "Sample PDF loaded",
        description: "You can now edit the sample resume",
      });
      
      setPdfLoading(false);
    } catch (error: any) {
      console.error('Error creating sample PDF:', error);
      setPdfError(error.message);
      setPdfLoading(false);
      toast({
        title: "Error",
        description: "Failed to create sample PDF",
        variant: "destructive",
      });
    }
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
    if (isDemo) {
      toast({
        title: "Demo Mode",
        description: "AI suggestions are not available in demo mode",
        variant: "default",
      });
      return;
    }

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
      const fileName = uploadedFileName || resume?.original_filename || 'resume';
      saveAs(blob, `${fileName}_edited.pdf`);

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

  // Load resume only if not in demo mode
  useEffect(() => {
    if (!isDemo && id) {
      loadResume();
    }
  }, [id, isDemo]);

  if (authError && !isDemo) {
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

  // Demo mode upload interface
  if (isDemo && !pdfData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 md:pt-28 pb-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-3xl font-bold text-center mb-2">PDF Editor Demo</h1>
              <p className="text-gray-600 text-center mb-8">
                Upload a PDF to try our advanced editing features - no login required!
              </p>

              {/* Upload Area */}
              <Card
                className={`p-12 border-2 border-dashed transition-all ${
                  isDragging ? 'border-lime-500 bg-lime-50' : 'border-gray-300 hover:border-lime-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="text-center">
                  <FileUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h2 className="text-xl font-semibold mb-2">Upload Your PDF</h2>
                  <p className="text-gray-600 mb-6">
                    Drag and drop your PDF here, or click to browse
                  </p>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        handleFileUpload(files[0]);
                      }
                    }}
                  />
                  
                  <div className="space-y-3">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-lime-400 hover:bg-lime-500 text-black font-bold"
                      size="lg"
                    >
                      <Upload className="w-5 h-5 mr-2" />
                      Choose PDF File
                    </Button>
                    
                    <div className="text-gray-500">or</div>
                    
                    <Button
                      onClick={loadSamplePDF}
                      variant="outline"
                      size="lg"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      Load Sample Resume
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Features */}
              <div className="mt-12 grid md:grid-cols-3 gap-6">
                <Card className="p-6">
                  <Edit3 className="w-10 h-10 text-lime-500 mb-3" />
                  <h3 className="font-bold mb-2">Click to Edit</h3>
                  <p className="text-sm text-gray-600">
                    Click any text in your PDF to edit it directly
                  </p>
                </Card>
                
                <Card className="p-6">
                  <Type className="w-10 h-10 text-lime-500 mb-3" />
                  <h3 className="font-bold mb-2">Smart Font Detection</h3>
                  <p className="text-sm text-gray-600">
                    Automatically detects and matches fonts from your PDF
                  </p>
                </Card>
                
                <Card className="p-6">
                  <Download className="w-10 h-10 text-lime-500 mb-3" />
                  <h3 className="font-bold mb-2">Export Edited PDF</h3>
                  <p className="text-sm text-gray-600">
                    Download your edited PDF with all changes applied
                  </p>
                </Card>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

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
                  {isDemo && (
                    <span className="px-2 py-1 bg-lime-100 text-lime-700 text-xs font-medium rounded">
                      DEMO
                    </span>
                  )}
                  <span className="text-sm text-gray-500">
                    {uploadedFileName || resume?.original_filename}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* New PDF Upload Button for Demo Mode */}
                  {isDemo && (
                    <>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        New PDF
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            handleFileUpload(files[0]);
                          }
                        }}
                      />
                    </>
                  )}

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

                  {/* Color Picker */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      title="Color"
                      disabled={!pdfData || !!pdfError}
                    >
                      <Palette className="w-4 h-4" />
                    </Button>
                    {showColorPicker && (
                      <div className="absolute top-10 right-0 z-50 bg-white shadow-lg rounded-lg p-2">
                        <div className="mb-2 text-xs font-semibold">
                          {currentTool === 'highlight' ? 'Highlight Color' : 'Draw Color'}
                        </div>
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
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 w-full"
                          onClick={() => setShowColorPicker(false)}
                        >
                          Close
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Undo/Redo */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={undo}
                    disabled={historyStep <= 0 || !pdfData || !!pdfError}
                    title="Undo"
                  >
                    <Undo className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={redo}
                    disabled={historyStep >= history.length - 1 || !pdfData || !!pdfError}
                    title="Redo"
                  >
                    <Redo className="w-4 h-4" />
                  </Button>

                  {/* Clear All */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAll}
                    disabled={currentPageAnnotations.length === 0 || !pdfData || !!pdfError}
                    title="Clear All"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>

                  {/* Zoom Controls */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                    disabled={!pdfData || !!pdfError}
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>

                  <span className="text-sm font-medium px-2">
                    {Math.round(zoom * 100)}%
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                    disabled={!pdfData || !!pdfError}
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>

                  {/* Export Button */}
                  <Button
                    className="bg-lime-400 hover:bg-lime-500 text-black font-bold gap-2"
                    onClick={exportModifiedPDF}
                    disabled={isSaving || !pdfData || !!pdfError}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Export PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* PDF Viewer */}
            <div className="lg:col-span-2">
              <Card className="h-[800px] overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : pdfLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                      <p className="text-gray-600">Loading PDF...</p>
                    </div>
                  </div>
                ) : pdfError ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                      <p className="text-red-600 font-semibold mb-2">Failed to load PDF</p>
                      <p className="text-gray-600 text-sm mb-4">{pdfError}</p>
                      {!isDemo && (
                        <Button onClick={loadResume} variant="outline">
                          Try Again
                        </Button>
                      )}
                    </div>
                  </div>
                ) : pdfData ? (
                  <div className="relative h-full">
                    {/* Use documentStore pages if available for text overlay */}
                    {documentStore.pages.length > 0 ? (
                      <div className="h-full overflow-auto bg-gray-100 p-4">
                        <Document
                          file={pdfData}
                          onLoadSuccess={onDocumentLoadSuccess}
                          onLoadError={onDocumentLoadError}
                          className="flex flex-col items-center"
                        >
                          {Array.from({ length: numPages || 1 }, (_, i) => {
                            const pageData = documentStore.pages[i];
                            if (!pageData) {
                              // Fallback to regular Page if no pageData
                              return (
                                <Page
                                  key={i + 1}
                                  pageNumber={i + 1}
                                  scale={zoom}
                                  className="mb-4 shadow-lg"
                                />
                              );
                            }
                            
                            // Use our PDFPage with TextOverlay for text editing
                            return (
                              <div key={i + 1} className="relative mb-4">
                                <Page
                                  pageNumber={i + 1}
                                  scale={zoom}
                                  className="shadow-lg"
                                  renderTextLayer={false}
                                  renderAnnotationLayer={false}
                                />
                                {/* Text Overlay for editable text */}
                                <TextOverlay
                                  pageData={pageData}
                                  zoom={zoom}
                                  onTextClick={(textRunId: string) => {
                                    console.log('Text clicked:', textRunId);
                                    toast({
                                      title: "Text Selected",
                                      description: `Click text to edit: ${textRunId}`,
                                    });
                                  }}
                                  selectedTextRun={selectedAnnotation}
                                  className="absolute top-0 left-0 pointer-events-auto"
                                />
                              </div>
                            );
                          })}
                        </Document>
                      </div>
                    ) : (
                      // Fallback to original rendering if documentStore not loaded
                      <div 
                        ref={(el) => setPdfContainerRef(el)}
                        className="relative h-full overflow-auto bg-gray-100 p-4"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onClick={handleTextClick}
                      >
                        <Document
                          file={pdfData}
                          onLoadSuccess={onDocumentLoadSuccess}
                          onLoadError={onDocumentLoadError}
                          className="flex flex-col items-center"
                        >
                          {Array.from({ length: numPages || 1 }, (_, i) => (
                            <Page
                              key={i + 1}
                              pageNumber={i + 1}
                              scale={zoom}
                              className="mb-4 shadow-lg"
                            />
                          ))}
                        </Document>

                        {/* Render annotations */}
                        {currentPageAnnotations.map((annotation) => (
                          <div
                            key={annotation.id}
                            className={`absolute ${
                              selectedAnnotation === annotation.id ? 'ring-2 ring-lime-500' : ''
                            }`}
                            style={{
                              left: annotation.x * zoom,
                              top: annotation.y * zoom,
                              width: annotation.width ? annotation.width * zoom : 'auto',
                              height: annotation.height ? annotation.height * zoom : 'auto',
                              transform: `scale(${zoom})`,
                              transformOrigin: 'top left'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAnnotation(annotation.id);
                            }}
                          >
                            {/* Render based on annotation type */}
                            {annotation.type === 'text' && (
                              <div
                                style={{
                                  fontSize: `${annotation.fontSize}px`,
                                  fontFamily: annotation.fontFamily,
                                  color: annotation.color || '#000',
                                  fontWeight: annotation.fontWeight,
                                  fontStyle: annotation.fontStyle,
                                }}
                              >
                                {annotation.text}
                              </div>
                            )}
                            {annotation.type === 'highlight' && (
                              <div
                                style={{
                                  backgroundColor: annotation.color || highlightColor,
                                  opacity: 0.3,
                                }}
                              />
                            )}
                            {/* Add other annotation types as needed */}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No PDF loaded</p>
                  </div>
                )}
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Page Navigation */}
              <Card className="p-4">
                <h3 className="font-bold mb-3">Navigation</h3>
                <div className="flex items-center justify-between mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} / {numPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(numPages || 1, currentPage + 1))}
                    disabled={currentPage === (numPages || 1)}
                  >
                    Next
                  </Button>
                </div>
              </Card>

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

              {/* AI Suggestions - Only show if not in demo mode */}
              {!isDemo && (
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold">AI Suggestions</h3>
                    <Button
                      onClick={generateMoreSuggestions}
                      disabled={applyingAI}
                      size="sm"
                      className="gap-2 bg-lime-400 hover:bg-lime-500 text-black"
                    >
                      {applyingAI ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4" />
                          Generate with GPT-5
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {aiSuggestions.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Click "Generate with GPT-5" to get AI-powered suggestions for improving your resume.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {aiSuggestions.map((suggestion, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-lime-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              {typeof suggestion === 'string' ? (
                                <p className="text-sm text-gray-700">{suggestion}</p>
                              ) : (
                                <>
                                  <p className="text-sm text-gray-700 mb-1">
                                    {suggestion.text}
                                  </p>
                                  {suggestion.priority && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
                                      suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-blue-100 text-blue-700'
                                    }`}>
                                      {suggestion.priority}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
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
              )}

              {/* Stats */}
              <Card className="p-4">
                <h3 className="font-bold mb-3">Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pages:</span>
                    <span className="font-bold">{numPages || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Annotations:</span>
                    <span className="font-bold">{annotations.length}</span>
                  </div>
                  {!isDemo && (
                    <>
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
                    </>
                  )}
                </div>
                {!isDemo && (
                  <Button
                    onClick={loadResume}
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 mt-3"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFEditor;