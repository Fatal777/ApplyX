import { create } from 'zustand/react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker using jsDelivr CDN (more reliable than cdnjs)
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Types
export interface TextRun {
  id: string;
  pageIndex: number;
  text: string;
  // UI coordinates (top-left origin, for React rendering)
  x: number;
  y: number;
  width: number;
  height: number;
  // Original PDF coordinates (bottom-left origin, for pdf-lib export)
  pdfX: number;
  pdfBaselineY: number;
  pdfFontName: string;  // Original font name from PDF
  fontSize: number;
  fontFamily: string;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  fontStyle?: 'normal' | 'italic';
  color: string;
  transform?: number[];
  isEdited?: boolean;
  originalText?: string;
}

export interface Page {
  index: number;
  width: number;
  height: number;
  textRuns: TextRun[];
  rotation: number;
}

export interface Font {
  family: string;
  fullName?: string;
  postscriptName?: string;
  isEmbedded?: boolean;
  isStandard?: boolean;
  availableWeights?: string[];
  availableStyles?: string[];
}

export interface EditOperation {
  id: string;
  pageIndex: number;
  textRunId: string;
  originalText: string;
  newText: string;
  timestamp: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  color?: string;
  x?: number;
  y?: number;
}

export interface PDFDocumentState {
  id: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  pages: Page[];
  fonts: Font[];
  editOperations: EditOperation[];
  currentPage: number;
  zoom: number;
  isLoading: boolean;
  error: string | null;
  pdfBytes: Uint8Array | null;
  pdfDocument: pdfjs.PDFDocumentProxy | null; // pdfjs document
  modifiedPdfDocument: PDFDocument | null; // pdf-lib document for modifications
}

interface DocumentStore extends PDFDocumentState {
  // Actions
  loadPDF: (file: File | Blob | ArrayBuffer | string) => Promise<void>;
  setCurrentPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  updateTextRun: (pageIndex: number, textRunId: string, updates: Partial<TextRun>) => void;
  addEditOperation: (operation: Omit<EditOperation, 'id' | 'timestamp'>) => void;
  undoLastEdit: () => void;
  redoEdit: () => void;
  exportPDF: () => Promise<Blob>;
  applyEditsViaAPI: () => Promise<Blob>;
  reset: () => void;
  detectFonts: () => void;
  replaceAllText: (searchText: string, replaceText: string) => void;
  getTextAtPosition: (pageIndex: number, x: number, y: number) => TextRun | null;
}

const initialState: PDFDocumentState = {
  id: '',
  fileName: '',
  fileSize: 0,
  pageCount: 0,
  pages: [],
  fonts: [],
  editOperations: [],
  currentPage: 1,
  zoom: 1,
  isLoading: false,
  error: null,
  pdfBytes: null,
  pdfDocument: null,
  modifiedPdfDocument: null,
};

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  ...initialState,

  loadPDF: async (input: File | Blob | ArrayBuffer | string) => {
    set({ isLoading: true, error: null });

    try {
      let arrayBuffer: ArrayBuffer;
      let fileName = 'document.pdf';

      if (input instanceof File) {
        arrayBuffer = await input.arrayBuffer();
        fileName = input.name;
      } else if (input instanceof Blob) {
        arrayBuffer = await input.arrayBuffer();
      } else if (input instanceof ArrayBuffer) {
        arrayBuffer = input;
      } else if (typeof input === 'string') {
        // URL or base64
        const response = await fetch(input);
        arrayBuffer = await response.arrayBuffer();
      } else {
        throw new TypeError('Invalid input type for PDF loading');
      }

      const pdfBytes = new Uint8Array(arrayBuffer);

      // Create a copy for pdf-lib BEFORE PDF.js detaches the ArrayBuffer
      const pdfBytesCopy = new Uint8Array(pdfBytes).slice();
      
      // Load with pdfjs for text extraction (this will detach the ArrayBuffer)
      const loadingTask = pdfjs.getDocument({ data: pdfBytes });
      const pdfDocument = await loadingTask.promise;
      
      // Load with pdf-lib for modifications using the copy we made earlier
      const modifiedPdfDocument = await PDFDocument.load(pdfBytesCopy);

      const pages: Page[] = [];
      const allFonts = new Set<string>();

      // Process each page
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const viewport = page.getViewport({ scale: 1 });
        const textContent = await page.getTextContent();

        const textRuns: TextRun[] = [];

        for (const [index, item] of textContent.items.entries()) {
          if ('str' in item && item.str.trim()) {
            // Extract transform matrix: [scaleX, skewX, skewY, scaleY, translateX, translateY]
            // translateX, translateY are in PDF coordinate system (bottom-left origin)
            // translateY is the text BASELINE position
            const [, , , , x, baselineY] = item.transform;
            
            // Extract font information
            const fontName = item.fontName || 'Helvetica';
            allFonts.add(fontName);

            const textHeight = item.height || 12;
            const fontSize = Math.abs(textHeight);

            // For UI rendering (top-left origin):
            // Approximate top edge of text bounding box
            const uiY = viewport.height - baselineY - (textHeight * 0.75);

            textRuns.push({
              id: `page-${i}-text-${index}`,
              pageIndex: i - 1,
              text: item.str,
              // UI coordinates (top-left origin for React)
              x: x,
              y: uiY,
              width: item.width || item.str.length * textHeight * 0.6,
              height: textHeight,
              // Original PDF coordinates (bottom-left origin for export)
              pdfX: x,
              pdfBaselineY: baselineY,
              pdfFontName: fontName,
              fontSize: fontSize,
              fontFamily: fontName.replace(/[+-].*$/, ''), // Clean font name
              fontWeight: fontName.includes('Bold') ? 'bold' : 'normal',
              fontStyle: fontName.includes('Italic') || fontName.includes('Oblique') ? 'italic' : 'normal',
              color: '#000000',
              transform: item.transform,
              isEdited: false,
            });
          }
        }

        pages.push({
          index: i - 1,
          width: viewport.width,
          height: viewport.height,
          textRuns,
          rotation: viewport.rotation || 0,
        });
      }

      // Create font list
      const fonts: Font[] = Array.from(allFonts).map(fontName => ({
        family: fontName.replace(/[+-].*$/, ''),
        fullName: fontName,
        isEmbedded: !fontName.startsWith('g_'),
        isStandard: Object.values(StandardFonts).some(sf => fontName.includes(sf)),
      }));

      // Add standard web fonts
      const standardWebFonts = [
        'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana',
        'Courier New', 'Trebuchet MS', 'Comic Sans MS', 'Impact', 'Tahoma'
      ];
      
      for (const font of standardWebFonts) {
        if (!fonts.some(f => f.family === font)) {
          fonts.push({
            family: font,
            isStandard: true,
            isEmbedded: false,
          });
        }
      }

      set({
        id: `pdf-${Date.now()}`,
        fileName,
        fileSize: pdfBytesCopy.length,
        pageCount: pdfDocument.numPages,
        pages,
        fonts,
        pdfBytes: pdfBytesCopy,
        pdfDocument,
        modifiedPdfDocument,
        isLoading: false,
        editOperations: [],
      });

    } catch (error: any) {
      console.error('Error loading PDF:', error);
      set({
        error: error.message || 'Failed to load PDF',
        isLoading: false,
      });
    }
  },

  setCurrentPage: (page: number) => {
    const { pageCount } = get();
    if (page >= 1 && page <= pageCount) {
      set({ currentPage: page });
    }
  },

  setZoom: (zoom: number) => {
    const clampedZoom = Math.max(0.25, Math.min(4, zoom));
    set({ zoom: clampedZoom });
  },

  updateTextRun: (pageIndex: number, textRunId: string, updates: Partial<TextRun>) => {
    const { pages } = get();
    const newPages = [...pages];
    const page = newPages[pageIndex];
    
    if (page) {
      const textRunIndex = page.textRuns.findIndex(tr => tr.id === textRunId);
      if (textRunIndex !== -1) {
        const textRun = page.textRuns[textRunIndex];
        
        // Store original text if this is the first edit
        if (!textRun.isEdited) {
          updates.originalText = textRun.text;
          updates.isEdited = true;
        }
        
        page.textRuns[textRunIndex] = {
          ...textRun,
          ...updates,
        };
        
        set({ pages: newPages });
      }
    }
  },

  addEditOperation: (operation: Omit<EditOperation, 'id' | 'timestamp'>) => {
    const { editOperations } = get();
    const newOperation: EditOperation = {
      ...operation,
      id: `edit-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };
    
    set({ editOperations: [...editOperations, newOperation] });
  },

  undoLastEdit: () => {
    const { editOperations, pages } = get();
    if (editOperations.length === 0) return;

    const lastEdit = editOperations.at(-1)!;
    const newPages = [...pages];
    const page = newPages[lastEdit.pageIndex];

    if (page) {
      const textRun = page.textRuns.find(tr => tr.id === lastEdit.textRunId);
      if (textRun) {
        textRun.text = lastEdit.originalText;
        if (textRun.originalText === lastEdit.originalText) {
          textRun.isEdited = false;
          textRun.originalText = undefined;
        }
      }
    }

    set({
      pages: newPages,
      editOperations: editOperations.slice(0, -1),
    });
  },

  redoEdit: () => {
    // Implementation for redo functionality
    console.log('Redo functionality to be implemented');
  },

  exportPDF: async () => {
    // Use the new API-based method for better quality
    return get().applyEditsViaAPI();
  },

  applyEditsViaAPI: async () => {
    const { pdfBytes, editOperations, pages } = get();
    
    if (!pdfBytes || editOperations.length === 0) {
      // No edits, return original
      if (!pdfBytes) throw new Error('No PDF loaded');
      return new Blob([Uint8Array.from(pdfBytes)], { type: 'application/pdf' });
    }

    try {
      // Convert edits to API format
      const edits = editOperations.map(op => {
        const textRun = pages[op.pageIndex]?.textRuns.find(
          tr => tr.id === op.textRunId
        );
        
        if (!textRun) return null;
        
        return {
          page_index: op.pageIndex,
          original_text: op.originalText,
          new_text: op.newText,
          x: textRun.x,
          y: textRun.y,
          width: textRun.width,
          height: textRun.height,
          font_size: textRun.fontSize,
          color: textRun.color?.startsWith('#') ? textRun.color.substring(1) : textRun.color || '000000',
        };
      }).filter(Boolean);

      if (edits.length === 0) {
        return new Blob([Uint8Array.from(pdfBytes)], { type: 'application/pdf' });
      }

      // Convert PDF to base64
      const base64 = btoa(
        new Uint8Array(pdfBytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Call backend API
      const response = await fetch('http://localhost:8000/api/v1/pdf/apply-edits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdf_base64: base64,
          edits,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to apply edits');
      }

      const result = await response.json();
      
      // Decode base64 response
      const binaryString = atob(result.pdf_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      return new Blob([bytes], { type: 'application/pdf' });
      
    } catch (error: any) {
      console.error('Error applying edits via API:', error);
      throw new Error('Failed to export PDF: ' + error.message);
    }
  },

  oldExportPDF: async () => {
    const { modifiedPdfDocument, pages, editOperations } = get();
    
    if (!modifiedPdfDocument) {
      throw new Error('No PDF document loaded');
    }

    try {
      // Create a copy to modify
      const pdfDoc = await PDFDocument.load(await modifiedPdfDocument.save());
      const pdfPages = pdfDoc.getPages();

      // Font mapping: PDF font name -> pdf-lib StandardFont
      const getFontMapping = (pdfFontName: string, fontWeight?: string, fontStyle?: string) => {
        const isBold = pdfFontName.includes('Bold') || fontWeight === 'bold';
        const isItalic = pdfFontName.includes('Italic') || pdfFontName.includes('Oblique') || fontStyle === 'italic';

        // Times family
        if (pdfFontName.includes('Times')) {
          if (isBold && isItalic) return StandardFonts.TimesRomanBoldItalic;
          if (isBold) return StandardFonts.TimesRomanBold;
          if (isItalic) return StandardFonts.TimesRomanItalic;
          return StandardFonts.TimesRoman;
        }
        
        // Courier family
        if (pdfFontName.includes('Courier')) {
          if (isBold && isItalic) return StandardFonts.CourierBoldOblique;
          if (isBold) return StandardFonts.CourierBold;
          if (isItalic) return StandardFonts.CourierOblique;
          return StandardFonts.Courier;
        }

        // Helvetica family (default for sans-serif)
        if (isBold && isItalic) return StandardFonts.HelveticaBoldOblique;
        if (isBold) return StandardFonts.HelveticaBold;
        if (isItalic) return StandardFonts.HelveticaOblique;
        return StandardFonts.Helvetica;
      };

      // Pre-embed all required fonts
      const fontCache = new Map<string, any>();
      const fontsToEmbed = new Set<string>();

      // Collect unique fonts from edit operations
      for (const operation of editOperations) {
        const textRun = pages[operation.pageIndex]?.textRuns.find(
          tr => tr.id === operation.textRunId
        );
        if (textRun) {
          const fontKey = `${textRun.pdfFontName}-${textRun.fontWeight}-${textRun.fontStyle}`;
          fontsToEmbed.add(fontKey);
        }
      }

      // Embed fonts
      for (const fontKey of fontsToEmbed) {
        const [pdfFontName, fontWeight, fontStyle] = fontKey.split('-');
        const standardFont = getFontMapping(pdfFontName, fontWeight, fontStyle);
        const embeddedFont = await pdfDoc.embedFont(standardFont);
        fontCache.set(fontKey, embeddedFont);
      }

      // Always embed Helvetica as fallback
      if (!fontCache.has('Helvetica-normal-normal')) {
        fontCache.set('Helvetica-normal-normal', await pdfDoc.embedFont(StandardFonts.Helvetica));
      }

      // Apply all edit operations
      for (const operation of editOperations) {
        const page = pdfPages[operation.pageIndex];
        if (!page) continue;

        const { height } = page.getSize();

        // Find the text run for positioning
        const textRun = pages[operation.pageIndex]?.textRuns.find(
          tr => tr.id === operation.textRunId
        );

        if (textRun) {
          // Get embedded font
          const fontKey = `${textRun.pdfFontName}-${textRun.fontWeight}-${textRun.fontStyle}`;
          const font = fontCache.get(fontKey) || fontCache.get('Helvetica-normal-normal');

          // Calculate rectangle position (bottom-left corner of bounding box)
          const rectX = textRun.pdfX;
          const rectY = textRun.pdfBaselineY - (textRun.height * 0.25);  // Bottom edge of text
          const rectHeight = textRun.height;

          // Measure new text width
          const fontSize = operation.fontSize ?? textRun.fontSize;
          const newTextWidth = font.widthOfTextAtSize(operation.newText, fontSize);
          const rectWidth = Math.max(textRun.width, newTextWidth);

          // Cover the old text with a white rectangle
          page.drawRectangle({
            x: rectX,
            y: rectY,
            width: rectWidth,
            height: rectHeight,
            color: rgb(1, 1, 1), // White color
            opacity: 1,
            borderWidth: 0,
          });
          
          // Draw the new text at baseline position
          const hexColor = operation.color ?? textRun.color ?? '#000000';
          const r = Number.parseInt(hexColor.slice(1, 3), 16) / 255;
          const g = Number.parseInt(hexColor.slice(3, 5), 16) / 255;
          const b = Number.parseInt(hexColor.slice(5, 7), 16) / 255;
          
          page.drawText(operation.newText, {
            x: textRun.pdfX,  // Use original PDF X coordinate
            y: textRun.pdfBaselineY,  // Use original PDF baseline Y coordinate
            size: fontSize,
            font: font,  // Use embedded font
            color: rgb(r, g, b),
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const arrayBuffer = pdfBytes.buffer as ArrayBuffer;
      return new Blob([arrayBuffer], { type: 'application/pdf' });
      
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      throw new Error('Failed to export PDF: ' + error.message);
    }
  },

  reset: () => {
    set(initialState);
  },

  detectFonts: () => {
    // Font detection is done during PDF loading
    console.log('Fonts detected during PDF load');
  },

  replaceAllText: (searchText: string, replaceText: string) => {
    const { pages } = get();
    const newPages = [...pages];
    const operations: EditOperation[] = [];

    for (const [pageIndex, page] of newPages.entries()) {
      for (const textRun of page.textRuns) {
        if (textRun.text.includes(searchText)) {
          const newText = textRun.text.split(searchText).join(replaceText);
          
          if (!textRun.isEdited) {
            textRun.originalText = textRun.text;
            textRun.isEdited = true;
          }
          
          textRun.text = newText;

          operations.push({
            id: `edit-${Date.now()}-${Math.random()}`,
            pageIndex,
            textRunId: textRun.id,
            originalText: textRun.originalText || textRun.text,
            newText,
            timestamp: Date.now(),
          });
        }
      }
    }

    const { editOperations } = get();
    set({
      pages: newPages,
      editOperations: [...editOperations, ...operations],
    });
  },

  getTextAtPosition: (pageIndex: number, x: number, y: number) => {
    const { pages } = get();
    const page = pages[pageIndex];
    
    if (!page) return null;

    // Find the text run at the given position (with some tolerance)
    const tolerance = 5;
    
    for (const textRun of page.textRuns) {
      if (
        x >= textRun.x - tolerance &&
        x <= textRun.x + textRun.width + tolerance &&
        y >= textRun.y - tolerance &&
        y <= textRun.y + textRun.height + tolerance
      ) {
        return textRun;
      }
    }

    return null;
  },
}));