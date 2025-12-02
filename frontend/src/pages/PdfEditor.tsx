import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  Upload,
  Download,
  FileText,
  ZoomIn,
  ZoomOut,
  Maximize,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Undo,
  AlertTriangle,
  Zap,
  Briefcase,
  DollarSign,
  FileCheck,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import { PDFViewer, EditorSidebar } from '@/components/pdf-editor';
import { useDocumentStore, ResumeSection } from '@/stores/documentStore';
import { extractSections } from '@/lib/resumeSectionExtractor';
import { cn } from '@/lib/utils';

// Job Info interface for job board mode
interface JobInfo {
  id: string;
  title: string;
  company: string;
  location?: string;
  description: string;
  requirements: string[];
  salary?: {
    type: 'paid' | 'unpaid' | 'undisclosed';
    min?: number;
    max?: number;
    currency?: string;
  };
  matchScore?: number;
  keywords?: string[];
}

// Template definitions - only 2 ATS-friendly templates
const TEMPLATES = {
  classic: {
    id: 'classic',
    name: 'Classic ATS',
    description: 'Traditional single-column layout optimized for ATS parsing',
    preview: '/templates/classic-preview.png',
    styles: {
      fontFamily: 'Times New Roman, serif',
      fontSize: 11,
      lineHeight: 1.15,
      margins: { top: 36, right: 36, bottom: 36, left: 36 },
      sectionSpacing: 12,
      headerStyle: 'bold-underline',
    },
  },
  modern: {
    id: 'modern',
    name: 'Modern Clean',
    description: 'Clean sans-serif layout with subtle styling, ATS compatible',
    preview: '/templates/modern-preview.png',
    styles: {
      fontFamily: 'Arial, sans-serif',
      fontSize: 10,
      lineHeight: 1.2,
      margins: { top: 36, right: 36, bottom: 36, left: 36 },
      sectionSpacing: 10,
      headerStyle: 'bold-caps',
    },
  },
};

const PdfEditor: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  
  // Check if we're in job board mode (passed via location state)
  const jobBoardData = location.state as { jobInfo?: JobInfo; mode?: 'jobboard' } | null;
  const isJobBoardMode = jobBoardData?.mode === 'jobboard';
  const jobInfo = jobBoardData?.jobInfo;
  
  const {
    fileName,
    currentPage,
    pageCount,
    zoom,
    editOperations,
    pages,
    sections,
    selectedTemplate,
    setCurrentPage,
    setZoom,
    loadPDF,
    exportPDF,
    undoLastEdit,
    setSections,
    reorderSections,
    toggleSectionVisibility,
    updateSectionItem,
    addSectionItem,
    removeSectionItem,
    removeSection,
    setSelectedTemplate,
    applySectionEdits,
    compressToOnePage,
  } = useDocumentStore();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [editMode, setEditMode] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [matchScore, setMatchScore] = useState<number | undefined>(jobInfo?.matchScore);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showCompressWarning, setShowCompressWarning] = useState(false);

  // Handle window resize for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check if more than one page - show compress warning
  useEffect(() => {
    setShowCompressWarning(pageCount > 1);
  }, [pageCount]);

  // Extract sections when PDF is loaded
  useEffect(() => {
    if (pages.length > 0 && sections.length === 0) {
      const allTextRuns = pages.flatMap((p) => p.textRuns);
      const extractedSections = extractSections(allTextRuns) as ResumeSection[];
      setSections(extractedSections);
      
      // Run match analysis if in job board mode and match score < 85%
      if (isJobBoardMode && jobInfo && (!matchScore || matchScore < 85)) {
        runMatchAnalysis();
      }
    }
  }, [pages, sections.length, isJobBoardMode, jobInfo, matchScore]);

  // Load PDF from ID if provided
  useEffect(() => {
    if (id) {
      loadPDFFromId(id);
    }
  }, [id]);

  const runMatchAnalysis = async () => {
    if (!jobInfo) return;
    
    setIsAnalyzing(true);
    try {
      const resumeText = pages.flatMap((p) => p.textRuns.map((r) => r.text)).join(' ');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/ai/analyze-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_text: resumeText,
          job_description: jobInfo.description,
          job_requirements: jobInfo.requirements,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setMatchScore(data.match_score);
        setAiSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Match analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadPDFFromId = async (resumeId: string) => {
    try {
      const pdfEndpoint = `${import.meta.env.VITE_API_URL}/api/v1/resumes/${resumeId}/download`;
      
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid authentication session found.');
      }
      
      const response = await fetch(pdfEndpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load PDF: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Received empty PDF file from server');
      }
      
      const headerView = new Uint8Array(arrayBuffer, 0, 5);
      const headerString = String.fromCodePoint(...headerView);
      
      if (!headerString.startsWith('%PDF')) {
        throw new Error('Received file is not a valid PDF');
      }
      
      await loadPDF(arrayBuffer);
      
      toast({
        title: 'PDF Loaded',
        description: 'Your PDF has been loaded successfully.',
      });
    } catch (error: any) {
      console.error('Error loading PDF:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load PDF',
        variant: 'destructive',
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file?.type === 'application/pdf') {
      loadPDF(file).then(() => {
        toast({
          title: 'PDF Uploaded',
          description: `${file.name} has been loaded successfully.`,
        });
      }).catch((error) => {
        toast({
          title: 'Upload Failed',
          description: error.message || 'Failed to load PDF file.',
          variant: 'destructive',
        });
      });
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please select a valid PDF file.',
        variant: 'destructive',
      });
    }
  };

  const handleExportPDF = async () => {
    try {
      const blob = await exportPDF();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace('.pdf', '_edited.pdf');
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: 'Your edited PDF has been downloaded.',
      });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export PDF.',
        variant: 'destructive',
      });
    }
  };

  const handleExportDOCX = async () => {
    try {
      const resumeText = pages.flatMap((p) => p.textRuns.map((r) => r.text)).join('\n');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/resumes/export-docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: sections,
          template: selectedTemplate || 'classic',
        }),
      });
      
      if (!response.ok) throw new Error('DOCX export failed');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace('.pdf', '.docx');
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast({
        title: 'DOCX Exported',
        description: 'Your resume has been exported as DOCX.',
      });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export DOCX.',
        variant: 'destructive',
      });
    }
  };

  const handleCompressToOnePage = async () => {
    if (!jobInfo) {
      toast({
        title: 'Job Description Required',
        description: 'Please provide a job description for AI compression.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsCompressing(true);
    try {
      await compressToOnePage(jobInfo.description);
      setShowCompressWarning(false);
      toast({
        title: 'Resume Compressed',
        description: 'Your resume has been optimized to fit one page.',
      });
    } catch (error: any) {
      toast({
        title: 'Compression Failed',
        description: error.message || 'Failed to compress resume.',
        variant: 'destructive',
      });
    } finally {
      setIsCompressing(false);
    }
  };

  const handleApplyEdits = async () => {
    try {
      await applySectionEdits();
      toast({
        title: 'Changes Applied',
        description: 'Section edits have been applied to the PDF.',
      });
    } catch (error: any) {
      toast({
        title: 'Apply Failed',
        description: error.message || 'Failed to apply edits.',
        variant: 'destructive',
      });
    }
  };

  // Zoom controls
  const zoomLevels = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
  const handleZoomIn = () => {
    const idx = zoomLevels.findIndex((z) => z >= zoom);
    if (idx < zoomLevels.length - 1) setZoom(zoomLevels[idx + 1]);
  };
  const handleZoomOut = () => {
    const idx = zoomLevels.findIndex((z) => z >= zoom);
    if (idx > 0) setZoom(zoomLevels[idx - 1]);
  };
  const handleFitToWidth = () => {
    const containerWidth = viewerContainerRef.current?.clientWidth ?? 400;
    const newZoom = containerWidth / 595;
    setZoom(Math.max(0.25, Math.min(4, newZoom)));
  };

  // Page navigation
  const firstPage = () => setCurrentPage(1);
  const lastPage = () => setCurrentPage(pageCount);
  const prevPage = () => setCurrentPage(Math.max(1, currentPage - 1));
  const nextPage = () => setCurrentPage(Math.min(pageCount, currentPage + 1));

  const handleTextClick = useCallback((_pageIndex: number, _textRunId: string) => {}, []);
  const handleUploadClick = () => fileInputRef.current?.click();

  // Handle section changes from EditorSidebar
  const handleSectionsChange = (newSections: ResumeSection[]) => {
    reorderSections(newSections);
  };

  // Salary display helper
  const getSalaryDisplay = (salary?: JobInfo['salary']) => {
    if (!salary) return 'Salary Undisclosed';
    if (salary.type === 'unpaid') return 'Unpaid / Volunteer';
    if (salary.type === 'undisclosed') return 'Salary Undisclosed';
    if (salary.min && salary.max) {
      const currency = salary.currency || 'USD';
      return `${currency} ${salary.min.toLocaleString()} - ${salary.max.toLocaleString()}`;
    }
    return 'Salary Undisclosed';
  };

  // Template selection handler
  const handleTemplateSelect = (templateId: 'classic' | 'modern') => {
    setSelectedTemplate(templateId);
    toast({
      title: 'Template Selected',
      description: `${TEMPLATES[templateId].name} template applied.`,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-16">
        {/* Header Toolbar */}
        <div className="bg-white border-b px-4 py-2 sticky top-16 z-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <h1 className="text-lg font-semibold">
                  {isJobBoardMode ? 'Tailored Resume Editor' : 'PDF Editor'}
                </h1>
                {fileName && (
                  <p className="text-xs text-gray-500">{fileName}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Edit counter */}
              {editOperations.length > 0 && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {editOperations.length} changes
                </span>
              )}
              
              {/* Undo */}
              <Button
                variant="ghost"
                size="sm"
                onClick={undoLastEdit}
                disabled={editOperations.length === 0}
                title="Undo"
              >
                <Undo className="h-4 w-4" />
              </Button>
              
              {/* Page navigation - compact */}
              {!isMobile && pageCount > 0 && (
                <div className="flex items-center gap-1 border-l pl-2 ml-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={firstPage} disabled={currentPage === 1}>
                    <ChevronsLeft className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevPage} disabled={currentPage === 1}>
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <span className="text-xs text-gray-600 min-w-[50px] text-center">
                    {currentPage}/{pageCount}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextPage} disabled={currentPage === pageCount}>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={lastPage} disabled={currentPage === pageCount}>
                    <ChevronsRight className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              {/* Zoom controls */}
              {!isMobile && (
                <div className="flex items-center gap-1 border-l pl-2 ml-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut} disabled={zoom <= 0.25}>
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                  <span className="text-xs text-gray-600 w-10 text-center">{Math.round(zoom * 100)}%</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn} disabled={zoom >= 4}>
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleFitToWidth}>
                    <Maximize className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              {/* Upload (standalone mode only) */}
              {!isJobBoardMode && (
                <Button variant="outline" size="sm" onClick={handleUploadClick}>
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </Button>
              )}
              
              {/* Export buttons */}
              <div className="flex items-center gap-1 border-l pl-2 ml-2">
                <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!pageCount}>
                  <Download className="h-4 w-4 mr-1" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportDOCX} disabled={!pageCount}>
                  <FileCheck className="h-4 w-4 mr-1" />
                  DOCX
                </Button>
                {isJobBoardMode && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={!pageCount}>
                    <Zap className="h-4 w-4 mr-1" />
                    APPLY NOW
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* One-Page Warning Banner */}
        {showCompressWarning && pageCount > 1 && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Your resume has {pageCount} pages. Most employers prefer a single-page resume.
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-600 text-amber-700 hover:bg-amber-100"
                onClick={handleCompressToOnePage}
                disabled={isCompressing}
              >
                {isCompressing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Compressing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-1" />
                    Compress with AI
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="h-[calc(100vh-8rem)]">
          {isJobBoardMode ? (
            /* Job Board Mode: 3-column layout */
            <div className="flex h-full">
              {/* LEFT: Job Info Panel */}
              <div className="w-80 border-r bg-white overflow-y-auto flex-shrink-0">
                <div className="p-4 space-y-4">
                  {/* Job Header */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary">
                      <Briefcase className="h-5 w-5" />
                      <span className="text-xs uppercase tracking-wide font-medium">Job Details</span>
                    </div>
                    <h2 className="text-lg font-bold">{jobInfo?.title || 'Job Title'}</h2>
                    <p className="text-sm text-gray-600">{jobInfo?.company || 'Company'}</p>
                    {jobInfo?.location && (
                      <p className="text-xs text-gray-500">{jobInfo.location}</p>
                    )}
                  </div>
                  
                  {/* Salary */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-700">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {getSalaryDisplay(jobInfo?.salary)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Match Score */}
                  {matchScore !== undefined && (
                    <div className={cn(
                      "p-3 rounded-lg",
                      matchScore >= 85 ? "bg-green-50" : matchScore >= 60 ? "bg-amber-50" : "bg-red-50"
                    )}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Match Score</span>
                        <span className={cn(
                          "text-lg font-bold",
                          matchScore >= 85 ? "text-green-600" : matchScore >= 60 ? "text-amber-600" : "text-red-600"
                        )}>
                          {matchScore}%
                        </span>
                      </div>
                      {matchScore >= 85 && (
                        <p className="text-xs text-green-700 mt-1">Great match! Your resume is well-aligned.</p>
                      )}
                    </div>
                  )}
                  
                  {/* AI Suggestions (only if match < 85%) */}
                  {aiSuggestions.length > 0 && matchScore !== undefined && matchScore < 85 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-1">
                        <Zap className="h-4 w-4 text-primary" />
                        AI Suggestions
                      </h4>
                      <ul className="space-y-1">
                        {aiSuggestions.map((suggestion, idx) => (
                          <li key={idx} className="text-xs text-gray-600 pl-4 relative before:content-['•'] before:absolute before:left-1 before:text-primary">
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Job Description */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Description</h4>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap">
                      {jobInfo?.description || 'No description available.'}
                    </p>
                  </div>
                  
                  {/* Requirements */}
                  {jobInfo?.requirements && jobInfo.requirements.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Requirements</h4>
                      <ul className="space-y-1">
                        {jobInfo.requirements.map((req, idx) => (
                          <li key={idx} className="text-xs text-gray-600 pl-4 relative before:content-['•'] before:absolute before:left-1">
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Keywords */}
                  {jobInfo?.keywords && jobInfo.keywords.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Key Skills</h4>
                      <div className="flex flex-wrap gap-1">
                        {jobInfo.keywords.map((kw, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* CENTER: PDF Preview */}
              <div ref={viewerContainerRef} className="flex-1 bg-gray-100 overflow-auto">
                <div className="h-full flex justify-center p-4">
                  <PDFViewer
                    className="h-full"
                    onTextClick={handleTextClick}
                    selectedTextRun={null}
                    editMode={editMode}
                  />
                </div>
              </div>
              
              {/* RIGHT: Editor Sidebar */}
              <div className="w-96 border-l bg-white overflow-hidden flex-shrink-0">
                <EditorSidebar
                  sections={sections}
                  onSectionsReorder={handleSectionsChange}
                  onSectionToggle={(sectionId) => toggleSectionVisibility(sectionId)}
                  onSectionCollapse={(sectionId) => {
                    // Toggle collapsed state
                    const section = sections.find((s) => s.id === sectionId);
                    if (section) {
                      const updated = sections.map((s) =>
                        s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s
                      );
                      setSections(updated);
                    }
                  }}
                  onItemUpdate={updateSectionItem}
                  onItemAdd={addSectionItem}
                  onItemDelete={removeSectionItem}
                  onSectionDelete={removeSection}
                  atsScore={matchScore ? {
                    overall: matchScore,
                    keywords: matchScore,
                    formatting: 85,
                    sections: 90,
                    length: pageCount === 1 ? 100 : 60,
                  } : undefined}
                  matchedKeywords={jobInfo?.keywords?.slice(0, 5)}
                  missingKeywords={jobInfo?.keywords?.slice(5)}
                  suggestions={aiSuggestions.map((s, i) => ({
                    id: `sug-${i}`,
                    text: s,
                    impact: 'medium' as const,
                    applied: false,
                  }))}
                  isAnalyzing={isAnalyzing}
                  onAnalyze={runMatchAnalysis}
                  pageCount={pageCount}
                />
              </div>
            </div>
          ) : (
            /* Standalone Mode: 2-column layout */
            <div className="flex h-full">
              {/* LEFT: PDF Preview (70%) */}
              <div ref={viewerContainerRef} className="w-[70%] bg-gray-100 overflow-auto">
                <div className="h-full flex justify-center p-4">
                  <PDFViewer
                    className="h-full"
                    onTextClick={handleTextClick}
                    selectedTextRun={null}
                    editMode={editMode}
                  />
                </div>
              </div>
              
              {/* RIGHT: Editor Sidebar (30%) */}
              <div className="w-[30%] border-l bg-white overflow-hidden">
                <EditorSidebar
                  sections={sections}
                  onSectionsReorder={handleSectionsChange}
                  onSectionToggle={(sectionId) => toggleSectionVisibility(sectionId)}
                  onSectionCollapse={(sectionId) => {
                    // Toggle collapsed state
                    const section = sections.find((s) => s.id === sectionId);
                    if (section) {
                      const updated = sections.map((s) =>
                        s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s
                      );
                      setSections(updated);
                    }
                  }}
                  onItemUpdate={updateSectionItem}
                  onItemAdd={addSectionItem}
                  onItemDelete={removeSectionItem}
                  onSectionDelete={removeSection}
                  pageCount={pageCount}
                />
              </div>
            </div>
          )}
        </div>

        {/* Analyzing overlay */}
        {isAnalyzing && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center gap-3 shadow-xl">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-lg font-medium">Analyzing resume match...</span>
            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
      </div>
    </div>
  );
};

export default PdfEditor;