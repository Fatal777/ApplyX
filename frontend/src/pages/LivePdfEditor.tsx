import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useResumeBuilderStore } from "@/store/resumeBuilderStore";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDown, Loader2, Save, ZoomIn, ZoomOut } from "lucide-react";
import EditorSidebar from "@/components/resume-editor/EditorSidebar";
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { InteractivePdfViewer } from "@/components/pdf-editor/InteractivePdfViewer";
import { applyEditsToFP, downloadPdf } from "@/services/pdfExportService";
import { toast } from "sonner";

// Set worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function LivePdfEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { documents, activeDocument, setActiveDocument } = useResumeBuilderStore();
  const [scale, setScale] = useState(1.0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Create authenticated PDF URL and store bytes for export
  useEffect(() => {
    if (activeDocument) {
      const token = localStorage.getItem("token");

      const fetchPdfBlob = async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/resumes/${id}/pdf`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);

            // Also store bytes for export
            const bytes = await blob.arrayBuffer();
            setPdfBytes(bytes);

            setLoading(false);
          } else {
            console.error("Failed to fetch PDF:", response.status, response.statusText);
            setLoading(false);
          }
        } catch (error) {
          console.error("Failed to fetch PDF", error);
          setLoading(false);
        }
      };

      fetchPdfBlob();
    }
  }, [id, activeDocument]);

  // Load document
  useEffect(() => {
    if (id && documents[id]) {
      setActiveDocument(id);
    } else {
      // Fetch from backend if not in local store
      const loadDoc = async () => {
        try {
          const { resumeBuilderApi } = await import("@/services/resumeBuilderApi");
          const backendDoc = await resumeBuilderApi.get(parseInt(id || '0'));
          if (backendDoc) {
            const { importDocument } = useResumeBuilderStore.getState();
            importDocument({
              id: String(backendDoc.id),
              ...backendDoc.content,
            } as any);
            setActiveDocument(String(backendDoc.id));
          }
        } catch (error) {
          console.error("Failed to load document:", error);
        }
      };
      loadDoc();
    }
  }, [id, documents, setActiveDocument]);

  // Handle PDF export
  const handleExport = async () => {
    if (!pdfBytes) {
      toast.error("PDF not loaded yet");
      return;
    }

    setIsExporting(true);
    try {
      // For now, just download the original PDF
      // TODO: Apply actual edits when overlay tracking is complete
      const modifiedBytes = await applyEditsToFP(pdfBytes, []);
      downloadPdf(modifiedBytes, `${doc?.title || 'resume'}_edited.pdf`);
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const doc = activeDocument && typeof activeDocument === 'string' ? documents[activeDocument] : null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-[450px] border-r border-gray-200 bg-white flex flex-col h-full z-10 shadow-xl">
        <div className="h-16 border-b border-gray-200 flex items-center px-4 justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-gray-100"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </Button>
            <span className="font-semibold text-gray-900 truncate max-w-[200px]">
              {doc?.title || "Resume Editor"}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || !pdfBytes}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileDown className="h-4 w-4 mr-2" />
              )}
              Export PDF
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <EditorSidebar />
        </div>
      </div>

      {/* PDF Viewer Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Zoom Controls */}
        <div className="h-12 bg-white border-b flex items-center justify-center gap-4 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScale(s => Math.min(2, s + 0.1))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* PDF Canvas */}
        <div className="flex-1 overflow-auto bg-gray-100 p-8 flex justify-center">
          <div className="relative shadow-lg">
            <InteractivePdfViewer pdfUrl={pdfUrl} scale={scale} />
          </div>
        </div>
      </div>
    </div>
  );
}

