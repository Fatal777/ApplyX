import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useResumeBuilderStore } from "@/store/resumeBuilderStore";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GripVertical, FileDown, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { EditorSidebar } from "@/components/resume-editor/EditorSidebar";
import { cn } from "@/lib/utils";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { InteractivePdfViewer } from "@/components/pdf-editor/InteractivePdfViewer";

// Set worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  id: string; // generated
}

export default function LivePdfEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { documents, activeDocument, setActiveDocument, updateDocument } = useResumeBuilderStore();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Create authenticated PDF URL
  useEffect(() => {
    if (activeDocument) {
      // We need the original Resume ID, not the Builder Document ID
      // Since we don't have it directly in the builder doc, we might need to rely on
      // a convention or fetch it. For now, assuming we can get it or use a different endpoint.

      // TEMPORARY: In a real scenario, the builder document should store the original_resume_id
      // For this MVP, we'll try to use the ID from the URL if it matches a pattern, 
      // or fetch the document metadata which hopefully contains it.

      const token = localStorage.getItem("token");
      // Using a direct URL with token in query param for the PDF viewer
      // Note: This requires the backend to accept token in query param for this endpoint
      // OR we fetch blob in a separate useEffect

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
            setLoading(false); // Set loading to false once PDF is fetched
          } else {
            console.error("Failed to fetch PDF:", response.status, response.statusText);
            setLoading(false); // Also set loading to false on error
          }
        } catch (error) {
          console.error("Failed to fetch PDF", error);
          setLoading(false); // Also set loading to false on error
        }
      };

      // If the ID in URL is the builder ID, we first need to find the original resume ID.
      // This is a missing link in the current data model. 
      // For now, let's assume the user just redirected from "Edit in Builder" which passed the ID.
      fetchPdfBlob();
    }
  }, [id, activeDocument]);

  // Load document
  useEffect(() => {
    if (id && documents[id]) {
      setActiveDocument(id);
      // setLoading(false); // Moved to pdfUrl fetching useEffect for more accurate loading state
      // In a real app, we'd fetch the PDF URL from backend
      // For now, we need to handle how we get the PDF file
    } else {
      // Fetch logic similar to ResumeEditor
      const loadDoc = async () => {
        // ... implementation pending backend integration
      };
      loadDoc();
    }
  }, [id, documents, setActiveDocument]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const doc = activeDocument ? documents[activeDocument] : null;

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
        </div>

        <div className="flex-1 overflow-hidden relative">
          <EditorSidebar />
        </div>
      </div>

      {/* PDF Viewer Area */}
      <div className="flex-1 overflow-auto bg-gray-100 p-8 flex justify-center relative">
        <div className="relative shadow-lg">
          <InteractivePdfViewer pdfUrl={pdfUrl} scale={scale} />
        </div>
      </div>
    </div>
  );
}
