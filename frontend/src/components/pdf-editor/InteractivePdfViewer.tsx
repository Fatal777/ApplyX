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
    // activeDocument is the full document object directly
    const doc = activeDocument;

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

        // Helper: Extract plain text from HTML (for bullet matching)
        const htmlToPlain = (html: string) => {
            if (!html) return '';
            return html
                .replace(/<li>/gi, '• ')
                .replace(/<\/li>/gi, '\n')
                .replace(/<[^>]*>/g, '')
                .trim();
        };

        // Helper: Normalize text for comparison
        const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

        // Helper to find text item matching a string (V2: Better fuzzy matching)
        const findMatches = (value: string, fieldId: string, section: string, isMultiline = false) => {
            if (!value || value.length < 2) return;

            const target = normalize(value);

            // Try exact match first
            let match = textItems.find(item =>
                !usedTextIds.has(item.id) && normalize(item.str) === target
            );

            // Fallback: Substring match (for partial matches)
            if (!match) {
                match = textItems.find(item =>
                    !usedTextIds.has(item.id) &&
                    item.str.length > 3 &&
                    (normalize(item.str).includes(target) || target.includes(normalize(item.str)))
                );
            }

            if (match) {
                usedTextIds.add(match.id);
                newOverlays.push({
                    id: `overlay-${fieldId}`,
                    fieldId,
                    section,
                    value,
                    x: match.x,
                    y: match.y,
                    width: Math.max(match.width, 100), // Min width for editability
                    height: match.height,
                    fontSize: match.height * 0.8,
                    isMultiline
                });
            }
        };

        // Helper: Find contiguous text block (for multi-word matches like company names)
        const findTextBlock = (value: string, fieldId: string, section: string) => {
            if (!value || value.length < 2) return;

            const words = value.split(/\s+/).filter(w => w.length > 1);
            if (words.length === 0) return;

            // Find first word
            const firstWord = normalize(words[0]);
            const startMatch = textItems.find(item =>
                !usedTextIds.has(item.id) && normalize(item.str).includes(firstWord)
            );

            if (startMatch) {
                // Get bounding box covering all words (simplified: use first match width * word count)
                usedTextIds.add(startMatch.id);
                newOverlays.push({
                    id: `overlay-${fieldId}`,
                    fieldId,
                    section,
                    value,
                    x: startMatch.x,
                    y: startMatch.y,
                    width: Math.max(startMatch.width * words.length * 0.8, 150),
                    height: startMatch.height,
                    fontSize: startMatch.height * 0.8,
                    isMultiline: false
                });
            }
        };

        // 1. Personal Info
        if (doc.personal) {
            findTextBlock(doc.personal.name, 'name', 'personal');
            findMatches(doc.personal.title, 'title', 'personal');
            findMatches(doc.personal.email, 'email', 'personal');
            findMatches(doc.personal.phone, 'phone', 'personal');
            findMatches(doc.personal.location, 'location', 'personal');
        }

        // 2. Experience - Company, Position, and bullet points
        doc.experience?.forEach((exp: any, idx: number) => {
            findTextBlock(exp.company, `exp-${idx}-company`, 'experience');
            findMatches(exp.position, `exp-${idx}-position`, 'experience');
            findMatches(exp.date, `exp-${idx}-date`, 'experience');

            // Parse bullets from HTML details
            if (exp.details) {
                const bullets = htmlToPlain(exp.details).split('\n').filter((b: string) => b.trim());
                bullets.forEach((bullet: string, bIdx: number) => {
                    const cleanBullet = bullet.replace(/^[•\-\*]\s*/, '').trim();
                    if (cleanBullet.length > 10) { // Only match substantial bullets
                        findMatches(cleanBullet.substring(0, 30), `exp-${idx}-bullet-${bIdx}`, 'experience', true);
                    }
                });
            }
        });

        // 3. Education
        doc.education?.forEach((edu: any, idx: number) => {
            findTextBlock(edu.school, `edu-${idx}-school`, 'education');
            findMatches(edu.degree, `edu-${idx}-degree`, 'education');
            findMatches(edu.major, `edu-${idx}-major`, 'education');
        });

        // 4. Projects
        doc.projects?.forEach((proj: any, idx: number) => {
            findTextBlock(proj.name, `proj-${idx}-name`, 'projects');
            findMatches(proj.role, `proj-${idx}-role`, 'projects');
        });

        setOverlays(newOverlays);
        console.log("Generated Overlays (V2):", newOverlays.length, newOverlays);

    }, [doc, textItems]);

    const handleOverlayChange = (id: string, newValue: string, section: string, fieldId: string) => {
        if (!doc) return;

        // Parse fieldId to determine what to update
        const parts = fieldId.split('-');

        if (section === 'personal') {
            updateDocument(doc.id, {
                personal: { ...doc.personal, [fieldId]: newValue }
            });
        } else if (section === 'experience' && parts.length >= 3) {
            const expIdx = parseInt(parts[1]);
            const field = parts[2]; // 'company', 'position', 'date', or 'bullet'

            if (doc.experience && doc.experience[expIdx]) {
                const updatedExp = [...doc.experience];
                if (field === 'bullet' && parts[3]) {
                    // Handle bullet update - would need to parse/reconstruct HTML
                    console.log('Bullet update:', newValue);
                } else {
                    updatedExp[expIdx] = { ...updatedExp[expIdx], [field]: newValue };
                }
                updateDocument(doc.id, { experience: updatedExp });
            }
        } else if (section === 'education' && parts.length >= 3) {
            const eduIdx = parseInt(parts[1]);
            const field = parts[2];

            if (doc.education && doc.education[eduIdx]) {
                const updatedEdu = [...doc.education];
                updatedEdu[eduIdx] = { ...updatedEdu[eduIdx], [field]: newValue };
                updateDocument(doc.id, { education: updatedEdu });
            }
        } else if (section === 'projects' && parts.length >= 3) {
            const projIdx = parseInt(parts[1]);
            const field = parts[2];

            if (doc.projects && doc.projects[projIdx]) {
                const updatedProj = [...doc.projects];
                updatedProj[projIdx] = { ...updatedProj[projIdx], [field]: newValue };
                updateDocument(doc.id, { projects: updatedProj });
            }
        }
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
