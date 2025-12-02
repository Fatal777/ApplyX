/**
 * Live PDF Editor Page
 * ====================
 * 
 * True WYSIWYG resume editor with instant keystroke-level updates.
 * Features:
 * - Canvas-first rendering (no PDF rasterization for preview)
 * - Real-time editing with optimistic updates
 * - Drag-and-drop section reordering
 * - Web Worker-based PDF export
 * - Dual mode: Standalone and Job Board
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Upload,
  Download,
  FileText,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  Save,
  Loader2,
  AlertTriangle,
  Zap,
  Briefcase,
  DollarSign,
  FileCheck,
  Eye,
  EyeOff,
  Layout,
  Maximize,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useATSAnalysis, getScoreColor, getMatchLabel } from '@/hooks/useATSAnalysis';
import Navbar from '@/components/Navbar';
import CanvasResumeRenderer from '@/components/pdf-editor/CanvasResumeRenderer';
import { EditorSidebar } from '@/components/pdf-editor';
import { useDocumentStore, ResumeSection, debounce } from '@/stores/documentStore';
import { extractSections } from '@/lib/resumeSectionExtractor';
import { usePDFGenerator } from '@/hooks/usePDFGenerator';
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

// Template definitions
const TEMPLATES = {
  classic: {
    id: 'classic',
    name: 'Classic ATS',
    description: 'Traditional single-column layout',
  },
  modern: {
    id: 'modern',
    name: 'Modern Clean',
    description: 'Clean sans-serif styling',
  },
};

const LivePdfEditor: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check if we're in job board mode
  const jobBoardData = location.state as { jobInfo?: JobInfo; mode?: 'jobboard' } | null;
  const isJobBoardMode = jobBoardData?.mode === 'jobboard';
  const jobInfo = jobBoardData?.jobInfo;
  
  // Document store
  const {
    fileName,
    pageCount,
    pages,
    sections,
    selectedTemplate,
    editOperations,
    isLoading,
    loadPDF,
    setSections,
    reorderSections,
    updateSectionItem,
    addSectionItem,
    removeSectionItem,
    removeSection,
    toggleSectionVisibility,
    toggleSectionCollapsed,
    setSelectedTemplate,
    undoLastEdit,
  } = useDocumentStore();
  
  // PDF Generator hook (Web Worker)
  const {
    isGenerating,
    progress: generateProgress,
    status: generateStatus,
    generatePDF,
    cancel: cancelGenerate,
  } = usePDFGenerator();
  
  // ATS Analysis hook
  const {
    isAnalyzing: isATSAnalyzing,
    score: atsScore,
    jobMatch,
    analyzeResume,
    calculateJobMatch,
  } = useATSAnalysis();
  
  // Local state
  const [zoom, setZoom] = useState(1);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [matchScore, setMatchScore] = useState<number | undefined>(jobInfo?.matchScore);
  const [livePageCount, setLivePageCount] = useState(1);
  
  // Get resume text for ATS analysis
  const getResumeText = useCallback(() => {
    return sections
      .filter(s => s.visible)
      .sort((a, b) => a.order - b.order)
      .map(s => `${s.title}\n${s.items.map(i => i.text).join('\n')}`)
      .join('\n\n');
  }, [sections]);
  
  // Run ATS analysis when sections change (debounced)
  useEffect(() => {
    if (sections.length === 0) return;
    
    const timer = setTimeout(() => {
      const text = getResumeText();
      if (text.length < 100) return;
      
      if (isJobBoardMode && jobInfo) {
        // Job-specific analysis
        calculateJobMatch(text, jobInfo.title, jobInfo.description, jobInfo.requirements);
      } else {
        // General ATS analysis
        analyzeResume(text);
      }
    }, 2000); // Debounce 2 seconds
    
    return () => clearTimeout(timer);
  }, [sections, isJobBoardMode, jobInfo, getResumeText, analyzeResume, calculateJobMatch]);
  
  // Update match score from ATS analysis
  useEffect(() => {
    if (jobMatch?.matchPercentage) {
      setMatchScore(jobMatch.matchPercentage);
    }
  }, [jobMatch]);
  
  // Track changes
  useEffect(() => {
    if (editOperations.length > 0 || sections.some(s => s.items.some(i => i.isEdited))) {
      setHasUnsavedChanges(true);
    }
  }, [editOperations, sections]);
  
  // Extract sections when PDF loads
  useEffect(() => {
    if (pages.length > 0 && sections.length === 0) {
      const allTextRuns = pages.flatMap(p => p.textRuns);
      const extracted = extractSections(allTextRuns) as ResumeSection[];
      setSections(extracted);
    }
  }, [pages, sections.length, setSections]);
  
  // Load PDF from ID
  useEffect(() => {
    if (id) {
      loadPDFFromId(id);
    }
  }, [id]);
  
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
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      
      if (!response.ok) throw new Error('Failed to load PDF');
      
      const arrayBuffer = await response.arrayBuffer();
      await loadPDF(arrayBuffer);
      
      toast({ title: 'Resume loaded', description: 'Your resume is ready to edit.' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load resume',
        variant: 'destructive',
      });
    }
  };
  
  // File upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      toast({
        title: 'Invalid file',
        description: 'Please select a PDF file.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await loadPDF(file);
      toast({ title: 'PDF uploaded', description: `${file.name} loaded successfully.` });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to load PDF.',
        variant: 'destructive',
      });
    }
  };
  
  // Export PDF using Web Worker
  const handleExportPDF = async () => {
    try {
      const result = await generatePDF(sections, selectedTemplate || 'classic');
      if (!result) return;
      
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName?.replace('.pdf', '_edited.pdf') || 'resume.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      
      toast({ title: 'Export successful', description: 'Your resume has been downloaded.' });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to generate PDF.',
        variant: 'destructive',
      });
    }
  };
  
  // Export DOCX (via backend)
  const handleExportDOCX = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/resumes/export-docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: sections.filter(s => s.visible).map(s => ({
            id: s.id,
            type: s.type,
            title: s.title,
            items: s.items.map(i => ({ id: i.id, text: i.text, is_bullet: i.isBullet })),
          })),
          template: selectedTemplate || 'classic',
        }),
      });
      
      if (!response.ok) throw new Error('DOCX export failed');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName?.replace('.pdf', '.docx') || 'resume.docx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      
      toast({ title: 'DOCX exported', description: 'Your resume has been exported.' });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export DOCX.',
        variant: 'destructive',
      });
    }
  };
  
  // Zoom controls
  const zoomLevels = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const handleZoomIn = () => {
    const idx = zoomLevels.findIndex(z => z >= zoom);
    if (idx < zoomLevels.length - 1) setZoom(zoomLevels[idx + 1]);
  };
  const handleZoomOut = () => {
    const idx = zoomLevels.findIndex(z => z >= zoom);
    if (idx > 0) setZoom(zoomLevels[idx - 1]);
  };
  
  // Section handlers
  const handleSectionsReorder = useCallback((newOrder: ResumeSection[]) => {
    reorderSections(newOrder);
  }, [reorderSections]);
  
  const handleItemUpdate = useCallback((sectionId: string, itemId: string, text: string) => {
    updateSectionItem(sectionId, itemId, text);
  }, [updateSectionItem]);
  
  // Salary display
  const getSalaryDisplay = (salary?: JobInfo['salary']) => {
    if (!salary) return 'Undisclosed';
    if (salary.type === 'unpaid') return 'Unpaid';
    if (salary.type === 'undisclosed') return 'Undisclosed';
    if (salary.min && salary.max) {
      return `${salary.currency || '$'}${salary.min.toLocaleString()} - ${salary.max.toLocaleString()}`;
    }
    return 'Undisclosed';
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <div className="pt-16 h-screen flex flex-col">
        {/* Header Toolbar */}
        <div className="bg-white border-b px-4 py-2 flex items-center justify-between flex-shrink-0 z-40">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-sm font-semibold">
                {isJobBoardMode ? 'Tailored Resume' : 'Resume Editor'}
              </h1>
              {fileName && <p className="text-xs text-gray-500">{fileName}</p>}
            </div>
            
            {/* Unsaved changes indicator */}
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                Unsaved changes
              </Badge>
            )}
            
            {/* Last saved */}
            {lastSaved && !hasUnsavedChanges && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Undo */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={undoLastEdit}
                    disabled={editOperations.length === 0}
                  >
                    <Undo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Zoom controls */}
            <div className="flex items-center gap-1 border-l pl-2 ml-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleZoomOut}>
                <ZoomOut className="h-3 w-3" />
              </Button>
              <span className="text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleZoomIn}>
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>
            
            {/* Toggle sidebar */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              className="border-l pl-2 ml-1"
            >
              <Layout className="h-4 w-4" />
            </Button>
            
            {/* Upload */}
            {!isJobBoardMode && (
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" />
                Upload
              </Button>
            )}
            
            {/* Export dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" disabled={isGenerating || sections.length === 0}>
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportDOCX}>
                  <FileCheck className="h-4 w-4 mr-2" />
                  Download DOCX
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isJobBoardMode && (
                  <DropdownMenuItem className="text-green-600">
                    <Zap className="h-4 w-4 mr-2" />
                    Apply Now
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Page count warning */}
        {livePageCount > 1 && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 text-amber-800 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>Your resume is {livePageCount} pages. Single-page resumes are preferred by ATS.</span>
            </div>
            <Button size="sm" variant="outline" className="border-amber-600 text-amber-700">
              <Zap className="h-4 w-4 mr-1" />
              Compress with AI
            </Button>
          </div>
        )}
        
        {/* Generation progress */}
        {isGenerating && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-3 flex-shrink-0">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700">{generateStatus}</span>
            <Progress value={generateProgress} className="flex-1 h-2" />
            <Button size="sm" variant="ghost" onClick={cancelGenerate}>
              Cancel
            </Button>
          </div>
        )}
        
        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Job info panel (job board mode only) */}
          {isJobBoardMode && jobInfo && (
            <div className="w-72 bg-white border-r overflow-y-auto flex-shrink-0 p-4 space-y-4">
              <div>
                <div className="flex items-center gap-2 text-primary text-xs uppercase font-medium mb-2">
                  <Briefcase className="h-4 w-4" />
                  Job Details
                </div>
                <h2 className="font-bold">{jobInfo.title}</h2>
                <p className="text-sm text-gray-600">{jobInfo.company}</p>
                {jobInfo.location && (
                  <p className="text-xs text-gray-500">{jobInfo.location}</p>
                )}
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4" />
                  {getSalaryDisplay(jobInfo.salary)}
                </div>
              </div>
              
              {matchScore !== undefined && (
                <div className={cn(
                  'p-3 rounded-lg',
                  matchScore >= 85 ? 'bg-green-50' : matchScore >= 60 ? 'bg-amber-50' : 'bg-red-50'
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Match</span>
                    <span className={cn(
                      'text-lg font-bold',
                      matchScore >= 85 ? 'text-green-600' : matchScore >= 60 ? 'text-amber-600' : 'text-red-600'
                    )}>
                      {matchScore}%
                    </span>
                  </div>
                </div>
              )}
              
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Description</h4>
                <p className="text-xs text-gray-600 whitespace-pre-wrap">{jobInfo.description}</p>
              </div>
              
              {jobInfo.requirements?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Requirements</h4>
                  <ul className="space-y-1">
                    {jobInfo.requirements.map((req, i) => (
                      <li key={i} className="text-xs text-gray-600 pl-3 relative before:content-['•'] before:absolute before:left-0">
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* Canvas renderer */}
          <div className="flex-1 overflow-auto bg-gray-200">
            <CanvasResumeRenderer
              zoom={zoom}
              template={selectedTemplate || 'classic'}
              onPageCountChange={setLivePageCount}
              className="min-h-full"
            />
          </div>
          
          {/* Editor sidebar */}
          {showSidebar && (
            <div className="w-80 bg-white border-l overflow-hidden flex-shrink-0">
              <EditorSidebar
                sections={sections}
                onSectionsReorder={handleSectionsReorder}
                onSectionToggle={toggleSectionVisibility}
                onSectionCollapse={toggleSectionCollapsed}
                onItemUpdate={handleItemUpdate}
                onItemAdd={addSectionItem}
                onItemDelete={removeSectionItem}
                onSectionDelete={removeSection}
                pageCount={livePageCount}
                isAnalyzing={isATSAnalyzing}
                atsScore={atsScore ? {
                  overall: atsScore.overallScore,
                  keywords: atsScore.categoryScores.keywords,
                  formatting: atsScore.categoryScores.format,
                  sections: atsScore.categoryScores.completeness,
                  length: atsScore.categoryScores.experience,
                } : undefined}
                matchedKeywords={atsScore?.matchedKeywords.map(k => k.keyword) || jobMatch?.matchedKeywords || []}
                missingKeywords={atsScore?.missingKeywords
                  .filter(k => k.importance === 'required')
                  .map(k => k.keyword) || jobMatch?.missingKeywords || []}
                suggestions={atsScore?.suggestions.map((s, i) => ({
                  id: `sug-${i}`,
                  text: s,
                  impact: s.includes('🔴') ? 'high' as const : s.includes('⚠️') ? 'medium' as const : 'low' as const,
                  applied: false,
                })) || []}
                onAnalyze={() => {
                  const text = getResumeText();
                  if (isJobBoardMode && jobInfo) {
                    calculateJobMatch(text, jobInfo.title, jobInfo.description, jobInfo.requirements);
                  } else {
                    analyzeResume(text);
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
};

export default LivePdfEditor;
