import React, { useRef, useEffect, useState } from 'react';
import { Page } from 'react-pdf';
import { Page as PageData } from '@/stores/documentStore';
import TextOverlay from './TextOverlay';

interface PDFPageProps {
  pageNumber: number;
  pageData: PageData;
  zoom: number;
  onTextClick?: (textRunId: string) => void;
  selectedTextRun?: string | null;
  className?: string;
}

const PDFPage: React.FC<PDFPageProps> = ({
  pageNumber,
  pageData,
  zoom,
  onTextClick,
  selectedTextRun,
  className = '',
}) => {
  const pageRef = useRef<HTMLDivElement>(null);
  const [pageReady, setPageReady] = useState(false);

  // A4 dimensions in points
  const pageWidth = 595 * zoom;
  const pageHeight = 842 * zoom;

  const handlePageLoadSuccess = () => {
    setPageReady(true);
  };

  return (
    <div
      ref={pageRef}
      className={`relative bg-white shadow-lg ${className}`}
      style={{
        width: `${pageWidth}px`,
        height: `${pageHeight}px`,
      }}
    >
      {/* PDF Page Rendering */}
      <Page
        pageNumber={pageNumber}
        width={pageWidth}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        onLoadSuccess={handlePageLoadSuccess}
        loading={
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Loading page {pageNumber}...</p>
          </div>
        }
      />

      {/* Text Overlay with Fabric.js */}
      {pageReady && (
        <TextOverlay
          pageData={pageData}
          zoom={zoom}
          onTextClick={onTextClick}
          selectedTextRun={selectedTextRun}
        />
      )}
    </div>
  );
};

export default PDFPage;