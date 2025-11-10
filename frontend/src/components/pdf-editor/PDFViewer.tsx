import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useDocumentStore } from '@/stores/documentStore';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import PDFPage from './PDFPage';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PDFViewerProps {
  className?: string;
  onTextClick?: (pageIndex: number, textRunId: string) => void;
  selectedTextRun?: string | null;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ 
  className = '', 
  onTextClick,
  selectedTextRun 
}) => {
  const {
    pdfBytes,
    pages,
    currentPage,
    pageCount,
    zoom,
    isLoading,
    error,
    setCurrentPage,
  } = useDocumentStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Create object URL for PDF bytes
  useEffect(() => {
    if (pdfBytes) {
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [pdfBytes]);

  // Handle scroll to update visible pages (for performance)
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const pageHeight = 842 * zoom; // A4 height in points
    const buffer = pageHeight * 0.5; // Load pages with buffer

    const startPage = Math.max(1, Math.floor((scrollTop - buffer) / pageHeight) + 1);
    const endPage = Math.min(
      pageCount,
      Math.ceil((scrollTop + containerHeight + buffer) / pageHeight)
    );

    const newVisiblePages = new Set<number>();
    for (let i = startPage; i <= endPage; i++) {
      newVisiblePages.add(i);
    }

    setVisiblePages(newVisiblePages);

    // Update current page based on scroll
    const currentVisiblePage = Math.floor(scrollTop / pageHeight) + 1;
    if (currentVisiblePage !== currentPage && currentVisiblePage <= pageCount) {
      setCurrentPage(currentVisiblePage);
    }
  }, [zoom, pageCount, currentPage, setCurrentPage]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // Scroll to page when currentPage changes
  useEffect(() => {
    if (containerRef.current && currentPage > 0) {
      const pageHeight = 842 * zoom; // A4 height
      const scrollTop = (currentPage - 1) * pageHeight;
      containerRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }
  }, [currentPage, zoom]);

  if (error) {
    return (
      <Card className="flex items-center justify-center h-full">
        <div className="text-center p-8">
          <p className="text-red-500 font-semibold mb-2">Error loading PDF</p>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-gray-600">Loading PDF document...</p>
        </div>
      </Card>
    );
  }

  if (!pdfUrl || !pages.length) {
    return (
      <Card className="flex items-center justify-center h-full">
        <div className="text-center p-8">
          <p className="text-gray-500">No PDF document loaded</p>
          <p className="text-gray-400 text-sm mt-2">
            Upload a PDF file to start editing
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto bg-gray-100 ${className}`}
      style={{ height: '100%' }}
    >
      <Document
        file={pdfUrl}
        loading={
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        }
        error={
          <div className="text-center p-8">
            <p className="text-red-500">Failed to load PDF</p>
          </div>
        }
      >
        {Array.from({ length: pageCount }, (_, index) => {
          const pageNumber = index + 1;
          const isVisible = visiblePages.has(pageNumber);
          const pageData = pages[index];

          return (
            <div
              key={pageNumber}
              className="flex justify-center py-4"
              style={{ minHeight: `${842 * zoom}px` }}
            >
              {isVisible && pageData ? (
                <PDFPage
                  pageNumber={pageNumber}
                  pageData={pageData}
                  zoom={zoom}
                  onTextClick={(textRunId) => onTextClick?.(index, textRunId)}
                  selectedTextRun={selectedTextRun}
                />
              ) : (
                <div
                  className="bg-white shadow-lg flex items-center justify-center"
                  style={{
                    width: `${595 * zoom}px`,
                    height: `${842 * zoom}px`,
                  }}
                >
                  <p className="text-gray-400">Page {pageNumber}</p>
                </div>
              )}
            </div>
          );
        })}
      </Document>
    </div>
  );
};

export default PDFViewer;