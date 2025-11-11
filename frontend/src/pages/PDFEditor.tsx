import React, { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload,
  Download,
  Save,
  FileText,
  Settings,
  Search,
  Replace,
  Loader2,
  X,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import {
  PDFViewer,
  PDFControls,
  TextEditor,
} from '@/components/pdf-editor';
import { useDocumentStore } from '@/stores/documentStore';
import { FontManager } from '@/lib/font-manager';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const PdfEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    fileName,
    pageCount,
    isLoading,
    error,
    editOperations,
    loadPDF,
    exportPDF,
    reset,
    getTextAtPosition,
  } = useDocumentStore();

  const [selectedTextRunId, setSelectedTextRunId] = useState<string | null>(null);
  const [selectedTextRun, setSelectedTextRun] = useState<any>(null);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Initialize font manager
  React.useEffect(() => {
    FontManager.initialize().catch(console.error);
  }, []);

  // Handle window resize for responsive layout
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load PDF from ID if provided
  React.useEffect(() => {
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
      
      const blob = await response.blob();
      await loadPDF(blob);
      
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
    if (file && file.type === 'application/pdf') {
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
      document.body.removeChild(a);
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

  const handleTextClick = useCallback((pageIndex: number, textRunId: string) => {
    const textRun = getTextAtPosition(pageIndex, 0, 0); // This would need to be enhanced
    setSelectedTextRunId(textRunId);
    setSelectedTextRun(textRun);
    setShowTextEditor(true);
  }, [getTextAtPosition]);

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
            <div className="flex items-center gap-4">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSidebar(!showSidebar)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <h1 className="text-lg font-semibold">PDF Text Editor</h1>
                  {fileName && (
                    <p className="text-sm text-gray-500">{fileName}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {editOperations.length > 0 && (
                <span className="text-sm text-blue-600 flex items-center gap-1">
                  <Save className="h-4 w-4" />
                  {editOperations.length} changes
                </span>
              )}
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
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative h-[calc(100vh-8rem)]">
          {isMobile ? (
            // Mobile Layout with Sheet
            <>
              <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
                <SheetContent side="left" className="w-80 p-0">
                  <SheetHeader className="px-4 py-3 border-b">
                    <SheetTitle>PDF Controls</SheetTitle>
                  </SheetHeader>
                  <div className="p-4 overflow-auto h-full">
                    <PDFControls
                      onUpload={handleUploadClick}
                      onExport={handleExport}
                    />
                  </div>
                </SheetContent>
              </Sheet>

              <div className="h-full">
                <PDFViewer
                  className="h-full"
                  onTextClick={handleTextClick}
                  selectedTextRun={selectedTextRunId}
                />
              </div>

              {showTextEditor && selectedTextRun && (
                <div className="absolute bottom-0 left-0 right-0 z-50">
                  <TextEditor
                    textRun={selectedTextRun}
                    onClose={() => {
                      setShowTextEditor(false);
                      setSelectedTextRun(null);
                      setSelectedTextRunId(null);
                    }}
                    className="rounded-t-lg"
                  />
                </div>
              )}
            </>
          ) : (
            // Desktop Layout with ResizablePanels
            <ResizablePanelGroup direction="horizontal">
              {/* Sidebar Controls */}
              <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                <div className="h-full overflow-auto bg-white border-r p-4">
                  <PDFControls
                    onUpload={handleUploadClick}
                    onExport={handleExport}
                  />
                </div>
              </ResizablePanel>

              <ResizableHandle />

              {/* PDF Viewer */}
              <ResizablePanel defaultSize={showTextEditor ? 50 : 80}>
                <PDFViewer
                  className="h-full"
                  onTextClick={handleTextClick}
                  selectedTextRun={selectedTextRunId}
                />
              </ResizablePanel>

              {/* Text Editor Panel */}
              {showTextEditor && selectedTextRun && (
                <>
                  <ResizableHandle />
                  <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
                    <div className="h-full overflow-auto bg-white border-l p-4">
                      <TextEditor
                        textRun={selectedTextRun}
                        onClose={() => {
                          setShowTextEditor(false);
                          setSelectedTextRun(null);
                          setSelectedTextRunId(null);
                        }}
                      />
                    </div>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="p-6">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
              <p>Loading PDF document...</p>
            </Card>
          </div>
        )}

        {/* Error Message */}
        {error && !isLoading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="p-6 max-w-md">
              <h2 className="text-lg font-semibold text-red-600 mb-2">Error</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={reset} className="w-full">
                Try Again
              </Button>
            </Card>
          </div>
        )}

        {/* Welcome Screen */}
        {!pageCount && !isLoading && !error && (
          <div className="flex items-center justify-center h-full">
            <Card className="p-8 max-w-md text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-2xl font-bold mb-2">Welcome to PDF Text Editor</h2>
              <p className="text-gray-600 mb-6">
                Upload a PDF document to start editing text content with advanced capabilities.
              </p>
              <Button onClick={handleUploadClick} className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Upload PDF Document
              </Button>
              <div className="mt-4 text-sm text-gray-500">
                <p>Features:</p>
                <ul className="mt-2 space-y-1">
                  <li>✓ Click on any text to edit</li>
                  <li>✓ Change fonts, sizes, and colors</li>
                  <li>✓ Find and replace text</li>
                  <li>✓ Export modified PDF</li>
                </ul>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfEditor;