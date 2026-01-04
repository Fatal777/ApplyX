import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useResumeBuilderStore } from "@/store/resumeBuilderStore";

// Worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface InteractivePdfViewerProps {
    pdfUrl?: string; // Optional: If we fetch binary directly
    scale?: number;
}

export function InteractivePdfViewer({ pdfUrl, scale = 1.0 }: InteractivePdfViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    // Text layer items for matching
    const [textItems, setTextItems] = useState<any[]>([]);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setIsLoading(false);
    };

    /**
     * Extract text items from the rendered page
     * This is where the magic happens: mapping PDF text to coordinates
     */
    const onPageLoadSuccess = async (page: any) => {
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale });

        // Map text items with their geometric positions
        const items = textContent.items.map((item: any) => {
            const tx = pdfjs.Util.transform(
                viewport.transform,
                item.transform
            );

            return {
                id: `text-${item.str}-${Math.random()}`, // unique ID
                str: item.str,
                x: tx[4],
                y: tx[5] - item.height, // Adjust for bottom-left origin
                width: item.width * scale,
                height: item.height * scale,
                hasEOL: item.hasEOL
            };
        });

        setTextItems(items);
        console.log("Extracted items:", items);
    };

    return (
        <div ref={containerRef} className="relative w-full h-full flex justify-center p-8 overflow-auto">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-50">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}

            {pdfUrl ? (
                <Document
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="shadow-xl"
                    loading={
                        <div className="flex items-center justify-center w-[595px] h-[842px] bg-white text-gray-400">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading PDF...
                        </div>
                    }
                >
                    <Page
                        pageNumber={1}
                        scale={scale}
                        onLoadSuccess={onPageLoadSuccess}
                        className="bg-white"
                        renderTextLayer={false} // We handle text layer manually for overlays
                        renderAnnotationLayer={false}
                    />

                    {/* OVERLAYS WILL GO HERE */}
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Debugging: Show boxes around extracted text */}
                        {/* {textItems.map((item) => (
               <div 
                 key={item.id}
                 style={{
                   position: 'absolute',
                   left: item.x,
                   top: item.y,
                   width: item.width,
                   height: item.height,
                   border: '1px solid red',
                   opacity: 0.5
                 }}
               />
            ))} */}
                    </div>

                </Document>
            ) : (
                <div className="flex flex-col items-center justify-center w-[595px] h-[842px] bg-white border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">No PDF Loaded</p>
                    <p className="text-sm text-gray-400 mt-2">Upload a resume to begin editing</p>
                </div>
            )}
        </div>
    );
}
