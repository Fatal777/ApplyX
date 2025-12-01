import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Upload,
  Download,
  Save,
  FileText,
  ZoomIn,
  ZoomOut,
  Maximize,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Undo,
  Redo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import { PDFViewer } from '@/components/pdf-editor';
import { useDocumentStore } from '@/stores/documentStore';
// Minimal UI: no resizable sidebars
// No sheets/sidebars for minimal UI

const PdfEditor: React.FC = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  
  const {
    fileName,
    currentPage,
    pageCount,
    zoom,
    editOperations,
    setCurrentPage,
    setZoom,
    loadPDF,
    exportPDF,
    undoLastEdit,
  } = useDocumentStore();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [editMode, setEditMode] = useState(true);

  // Remove font manager initialization (handled internally)

  // Handle window resize for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load PDF from ID if provided
  useEffect(() => {
    if (id) {
      loadPDFFromId(id);
    }
  }, [id]);

  const loadPDFFromId = async (resumeId: string) => {
    try {
      const pdfEndpoint = `${import.meta.env.VITE_API_URL}/api/v1/resumes/${resumeId}/download`;
      
      // Get token from Supabase session
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
      
      // Verify arrayBuffer has content
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Received empty PDF file from server');
      }
      
      // Check if it starts with PDF header (create a NEW Uint8Array view without modifying the original)
      const headerView = new Uint8Array(arrayBuffer, 0, 5);
      const headerString = String.fromCodePoint(...headerView);
      
      if (!headerString.startsWith('%PDF')) {
        const fullView = new Uint8Array(arrayBuffer, 0, Math.min(100, arrayBuffer.byteLength));
        console.error('Invalid PDF header. First bytes:', fullView);
        throw new Error('Received file is not a valid PDF');
      }
      
      // Pass the ArrayBuffer directly to loadPDF - don't slice or modify it
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

  const handleExport = async () => {
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

  // Inline toolbar controls (compact)
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
    const containerWidth = viewerContainerRef.current?.clientWidth ?? (window.innerWidth - 64);
    const newZoom = containerWidth / 595; // A4 width
    setZoom(Math.max(0.25, Math.min(4, newZoom)));
  };
  const firstPage = () => setCurrentPage(1);
  const lastPage = () => setCurrentPage(pageCount);
  const prevPage = () => setCurrentPage(Math.max(1, currentPage - 1));
  const nextPage = () => setCurrentPage(Math.min(pageCount, currentPage + 1));

  // Minimal behavior: click tracking not needed for external editor
  const handleTextClick = useCallback((_pageIndex: number, _textRunId: string) => {}, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-16">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <h1 className="text-lg font-semibold">PDF Text Editor</h1>
                {fileName && (
                  <p className="text-sm text-gray-500">{fileName}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {editOperations.length > 0 && (
                <span className="text-sm text-blue-600 flex items-center gap-1">
                  <Save className="h-4 w-4" />
                  {editOperations.length} {editOperations.length === 1 ? 'change' : 'changes'}
                </span>
              )}
              
              {/* Undo button */}
              <Button
                variant="outline"
                size="sm"
                onClick={undoLastEdit}
                disabled={editOperations.length === 0}
                title="Undo last edit (Ctrl+Z)"
              >
                <Undo className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="sm" onClick={() => setEditMode(!editMode)}>
                {editMode ? 'Editing On' : 'Editing Off'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUploadClick}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
              <Button
                size="sm"
                onClick={handleExport}
                disabled={!pageCount || editOperations.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                {editOperations.length > 0 ? 'Download Edited PDF' : 'Export'}
              </Button>

              {/* Compact toolbar (desktop) */}
              {!isMobile && (
                <div className="hidden md:flex items-center gap-2 pl-3 ml-3 border-l">
                  {/* Page nav */}
                  <Button variant="ghost" size="icon" onClick={firstPage} disabled={currentPage === 1} title="First page">
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={prevPage} disabled={currentPage === 1} title="Previous page">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600 min-w-[80px] text-center">{currentPage || 0} / {pageCount || 0}</span>
                  <Button variant="ghost" size="icon" onClick={nextPage} disabled={!pageCount || currentPage === pageCount} title="Next page">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={lastPage} disabled={!pageCount || currentPage === pageCount} title="Last page">
                    <ChevronsRight className="h-4 w-4" />
                  </Button>

                  {/* Zoom */}
                  <div className="w-px h-5 bg-gray-200 mx-1" />
                  <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={zoom <= 0.25} title="Zoom out">
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600 w-12 text-center">{Math.round((zoom || 1) * 100)}%</span>
                  <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={zoom >= 4} title="Zoom in">
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleFitToWidth} title="Fit width">
                    <Maximize className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content - centered viewer */}
        <div ref={viewerContainerRef} className="relative h-[calc(100vh-8rem)] bg-gray-100">
          <div className="h-full flex justify-center">
            <PDFViewer
              className="h-full max-w-full"
              onTextClick={handleTextClick}
              selectedTextRun={null}
              editMode={editMode}
            />
          </div>
        </div>

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
      </div>
    </div>
  );
};

export default PdfEditor;