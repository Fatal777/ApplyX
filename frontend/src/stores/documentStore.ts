import { create } from 'zustand';
import { PDFDocument, PDFPage, PDFFont, StandardFonts } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';

// Types
export interface TextRun {
  id: string;
  pageIndex: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
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
  pdfDocument: any | null; // pdfjs document
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
  zoom: 1.0,
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
        throw new Error('Invalid input type for PDF loading');
      }

      const pdfBytes = new Uint8Array(arrayBuffer);

      // Load with pdfjs for text extraction
      const loadingTask = pdfjs.getDocument({ data: pdfBytes });
      const pdfDocument = await loadingTask.promise;

      // Load with pdf-lib for modifications
      const modifiedPdfDocument = await PDFDocument.load(pdfBytes);

      const pages: Page[] = [];
      const allFonts = new Set<string>();

      // Process each page
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent();

        const textRuns: TextRun[] = [];

        textContent.items.forEach((item: any, index: number) => {
          if ('str' in item && item.str.trim()) {
            const [scaleX, , , scaleY, x, y] = item.transform;
            
            // Extract font information
            const fontName = item.fontName || 'Helvetica';
            allFonts.add(fontName);

            textRuns.push({
              id: `page-${i}-text-${index}`,
              pageIndex: i - 1,
              text: item.str,
              x: x,
              y: y,
              width: item.width || item.str.length * (item.height || 12) * 0.6,
              height: item.height || 12,
              fontSize: Math.abs(item.height || 12),
              fontFamily: fontName.replace(/[+-].*$/, ''), // Clean font name
              fontWeight: fontName.includes('Bold') ? 'bold' : 'normal',
              fontStyle: fontName.includes('Italic') || fontName.includes('Oblique') ? 'italic' : 'normal',
              color: '#000000',
              transform: item.transform,
              isEdited: false,
            });
          }
        });

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
      
      standardWebFonts.forEach(font => {
        if (!fonts.some(f => f.family === font)) {
          fonts.push({
            family: font,
            isStandard: true,
            isEmbedded: false,
          });
        }
      });

      set({
        id: `pdf-${Date.now()}`,
        fileName,
        fileSize: pdfBytes.length,
        pageCount: pdfDocument.numPages,
        pages,
        fonts,
        pdfBytes,
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

    const lastEdit = editOperations[editOperations.length - 1];
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
    const { modifiedPdfDocument, pages, editOperations } = get();
    
    if (!modifiedPdfDocument) {
      throw new Error('No PDF document loaded');
    }

    try {
      // Create a copy to modify
      const pdfDoc = await PDFDocument.load(await modifiedPdfDocument.save());
      const pdfPages = pdfDoc.getPages();

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
          // Draw new text (simplified - in production, handle font embedding)
          page.drawText(operation.newText, {
            x: operation.x ?? textRun.x,
            y: height - (operation.y ?? textRun.y) - (textRun.height || 12),
            size: operation.fontSize ?? textRun.fontSize,
            // Note: Font handling would need more sophisticated approach for production
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      return new Blob([pdfBytes], { type: 'application/pdf' });
      
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

    newPages.forEach((page, pageIndex) => {
      page.textRuns.forEach(textRun => {
        if (textRun.text.includes(searchText)) {
          const newText = textRun.text.replace(new RegExp(searchText, 'g'), replaceText);
          
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
      });
    });

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