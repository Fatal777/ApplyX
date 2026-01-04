import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useResumeBuilderStore } from "@/store/resumeBuilderStore";
import { EditableOverlay } from "./EditableOverlay";

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

    // Store matching logic
    const { activeDocument, documents, updateDocument } = useResumeBuilderStore();
    // Ensure activeDocument is a string ID before accessing documents
    const doc = activeDocument && typeof activeDocument === 'string' ? documents[activeDocument] : null;

    // Memoized matching of Store Data -> PDF Text Items
    const [overlays, setOverlays] = useState<any[]>([]);

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

    useEffect(() => {
        if (!doc || textItems.length === 0) return;

        const newOverlays: any[] = [];
        const usedTextIds = new Set<string>();

        // Helper to find text item matching a string
        const findMatches = (value: string, fieldId: string, section: string, isMultiline = false) => {
            if (!value) return;

            // Simple exact match first
            const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
            const target = normalize(value);

            // Try to find single item match
            const exactMatch = textItems.find(item =>
                !usedTextIds.has(item.id) && normalize(item.str).includes(target)
            );

            if (exactMatch) {
                usedTextIds.add(exactMatch.id);
                newOverlays.push({
                    id: `overlay-${fieldId}`,
                    fieldId,
                    section,
                    value,
                    x: exactMatch.x,
                    y: exactMatch.y,
                    width: exactMatch.width,
                    height: exactMatch.height,
                    fontSize: exactMatch.height * 0.8, // Estimate font size
                    isMultiline
                });
            }
        };

        // 1. Personal Info
        if (doc.personal) {
            findMatches(doc.personal.name, 'name', 'personal');
            findMatches(doc.personal.title, 'jobTitle', 'personal');
            findMatches(doc.personal.email, 'email', 'personal');
            findMatches(doc.personal.phone, 'phone', 'personal');
        }

        // 2. Experience (simplified for MVP - matching Company/Position)
        doc.experience?.forEach((exp, idx) => {
            findMatches(exp.company, `exp-${idx}-company`, 'experience');
            findMatches(exp.position, `exp-${idx}-position`, 'experience');
            // Bullets are harder, skipping for initial MVP match
        });

        setOverlays(newOverlays);
        console.log("Generated Overlays:", newOverlays.length);

    }, [doc, textItems]);

    const handleOverlayChange = (id: string, newValue: string, section: string, fieldId: string) => {
        if (!doc) return;

        // Update store based on fieldId
        // This is a naive implementation; needs proper path mapping
        if (section === 'personal') {
            updateDocument(doc.id, {
                personal: { ...doc.personal, [fieldId]: newValue }
            });
        }
        // Experience updates... needed
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
                        {/* RENDER OVERLAYS */}
                        {overlays.map((ov) => (
                            <EditableOverlay
                                key={ov.id}
                                initialValue={ov.value}
                                x={ov.x}
                                y={ov.y}
                                width={ov.width}
                                height={ov.height}
                                fontSize={ov.fontSize}
                                onChange={(val) => handleOverlayChange(ov.id, val, ov.section, ov.fieldId)}
                            />
                        ))}
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
