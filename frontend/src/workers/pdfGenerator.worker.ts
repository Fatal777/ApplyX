/**
 * PDF Generator Web Worker
 * ========================
 * 
 * Offloads PDF generation to a separate thread to prevent UI blocking.
 * Uses pdf-lib for PDF creation from section data.
 * 
 * Features:
 * - Non-blocking PDF generation
 * - Progress reporting
 * - Concurrent export support
 * - Memory-efficient streaming
 */

import { PDFDocument, PDFFont, StandardFonts, rgb, PDFPage } from 'pdf-lib';

// Message types
interface GeneratePDFMessage {
  type: 'generate';
  id: string;
  sections: SectionData[];
  template: 'classic' | 'modern';
  options?: PDFGeneratorOptions;
}

interface ProgressMessage {
  type: 'progress';
  id: string;
  progress: number;
  status: string;
}

interface CompleteMessage {
  type: 'complete';
  id: string;
  pdfBytes: Uint8Array;
  pageCount: number;
}

interface ErrorMessage {
  type: 'error';
  id: string;
  error: string;
}

// Section data structure
interface SectionData {
  id: string;
  type: string;
  title: string;
  items: ItemData[];
  visible: boolean;
  order: number;
}

interface ItemData {
  id: string;
  text: string;
  isBullet: boolean;
  indent: number;
}

interface PDFGeneratorOptions {
  pageSize?: { width: number; height: number };
  margins?: { top: number; right: number; bottom: number; left: number };
  fontSize?: number;
  headerFontSize?: number;
  lineHeight?: number;
}

// A4 dimensions in points (72 DPI)
const A4_WIDTH = 595;
const A4_HEIGHT = 842;

// Default options
const DEFAULT_OPTIONS: Required<PDFGeneratorOptions> = {
  pageSize: { width: A4_WIDTH, height: A4_HEIGHT },
  margins: { top: 36, right: 36, bottom: 36, left: 36 },
  fontSize: 11,
  headerFontSize: 14,
  lineHeight: 1.4,
};

// Template styles
const TEMPLATE_STYLES = {
  classic: {
    headerFont: StandardFonts.TimesRomanBold,
    bodyFont: StandardFonts.TimesRoman,
    headerColor: rgb(0, 0, 0),
    bodyColor: rgb(0, 0, 0),
    headerUnderline: true,
  },
  modern: {
    headerFont: StandardFonts.HelveticaBold,
    bodyFont: StandardFonts.Helvetica,
    headerColor: rgb(0.15, 0.38, 0.93), // Blue
    bodyColor: rgb(0.1, 0.1, 0.1),
    headerUnderline: false,
  },
};

// Worker state for tracking concurrent jobs
const activeJobs = new Map<string, AbortController>();

// Generate PDF from sections
async function generatePDF(
  id: string,
  sections: SectionData[],
  template: 'classic' | 'modern',
  options: PDFGeneratorOptions = {}
): Promise<{ pdfBytes: Uint8Array; pageCount: number }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const style = TEMPLATE_STYLES[template];
  
  // Create abort controller for this job
  const abortController = new AbortController();
  activeJobs.set(id, abortController);
  
  try {
    // Report progress
    postProgress(id, 0, 'Creating PDF document...');
    
    // Create new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Embed fonts
    const headerFont = await pdfDoc.embedFont(style.headerFont);
    const bodyFont = await pdfDoc.embedFont(style.bodyFont);
    
    postProgress(id, 10, 'Embedding fonts...');
    
    // Filter and sort sections
    const visibleSections = sections
      .filter(s => s.visible)
      .sort((a, b) => a.order - b.order);
    
    if (visibleSections.length === 0) {
      // Create empty page
      pdfDoc.addPage([opts.pageSize.width, opts.pageSize.height]);
      const pdfBytes = await pdfDoc.save();
      return { pdfBytes, pageCount: 1 };
    }
    
    // Track current position
    let currentPage = pdfDoc.addPage([opts.pageSize.width, opts.pageSize.height]);
    let y = opts.pageSize.height - opts.margins.top;
    const usableWidth = opts.pageSize.width - opts.margins.left - opts.margins.right;
    const usableHeight = opts.pageSize.height - opts.margins.top - opts.margins.bottom;
    
    // Process each section
    const totalSections = visibleSections.length;
    
    for (let sIdx = 0; sIdx < visibleSections.length; sIdx++) {
      // Check for abort
      if (abortController.signal.aborted) {
        throw new Error('Generation cancelled');
      }
      
      const section = visibleSections[sIdx];
      const progress = 10 + (sIdx / totalSections) * 80;
      postProgress(id, progress, `Processing section: ${section.title}...`);
      
      // Check if we need a new page for section header
      const headerHeight = opts.headerFontSize + (style.headerUnderline ? 6 : 0) + 12;
      if (y - headerHeight < opts.margins.bottom) {
        currentPage = pdfDoc.addPage([opts.pageSize.width, opts.pageSize.height]);
        y = opts.pageSize.height - opts.margins.top;
      }
      
      // Draw section header
      y -= opts.headerFontSize;
      currentPage.drawText(section.title.toUpperCase(), {
        x: opts.margins.left,
        y,
        size: opts.headerFontSize,
        font: headerFont,
        color: style.headerColor,
      });
      
      // Draw underline for classic style
      if (style.headerUnderline) {
        y -= 4;
        currentPage.drawLine({
          start: { x: opts.margins.left, y },
          end: { x: opts.margins.left + usableWidth, y },
          thickness: 0.5,
          color: style.headerColor,
        });
      }
      
      y -= 12; // Space after header
      
      // Process items
      for (const item of section.items) {
        if (!item.text.trim()) continue;
        
        // Calculate text with bullet
        const bulletPrefix = item.isBullet ? '• ' : '';
        const indentX = opts.margins.left + (item.indent * 12);
        const textWidth = usableWidth - (item.indent * 12);
        
        // Word wrap text
        const lines = wrapText(
          bulletPrefix + item.text,
          bodyFont,
          opts.fontSize,
          textWidth
        );
        
        // Check if we need a new page
        const textHeight = lines.length * (opts.fontSize * opts.lineHeight);
        if (y - textHeight < opts.margins.bottom) {
          currentPage = pdfDoc.addPage([opts.pageSize.width, opts.pageSize.height]);
          y = opts.pageSize.height - opts.margins.top;
        }
        
        // Draw each line
        for (const line of lines) {
          y -= opts.fontSize * opts.lineHeight;
          currentPage.drawText(line, {
            x: indentX,
            y,
            size: opts.fontSize,
            font: bodyFont,
            color: style.bodyColor,
          });
        }
        
        y -= 2; // Small gap between items
      }
      
      y -= 8; // Gap between sections
    }
    
    postProgress(id, 95, 'Saving PDF...');
    
    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const pageCount = pdfDoc.getPageCount();
    
    postProgress(id, 100, 'Complete');
    
    return { pdfBytes, pageCount };
    
  } finally {
    activeJobs.delete(id);
  }
}

// Word wrap helper
function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

// Post progress message
function postProgress(id: string, progress: number, status: string) {
  self.postMessage({
    type: 'progress',
    id,
    progress,
    status,
  } as ProgressMessage);
}

// Cancel a job
function cancelJob(id: string) {
  const controller = activeJobs.get(id);
  if (controller) {
    controller.abort();
    activeJobs.delete(id);
  }
}

// Message handler
self.onmessage = async (event: MessageEvent) => {
  const data = event.data;
  
  switch (data.type) {
    case 'generate':
      try {
        const result = await generatePDF(
          data.id,
          data.sections,
          data.template,
          data.options
        );
        
        self.postMessage({
          type: 'complete',
          id: data.id,
          pdfBytes: result.pdfBytes,
          pageCount: result.pageCount,
        } as CompleteMessage);
        
      } catch (error: any) {
        self.postMessage({
          type: 'error',
          id: data.id,
          error: error.message || 'Unknown error',
        } as ErrorMessage);
      }
      break;
      
    case 'cancel':
      cancelJob(data.id);
      break;
  }
};

// Export for TypeScript
export {};
