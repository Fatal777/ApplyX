import { Annotation } from '@/types/pdf';

export interface Tool {
  name: string;
  type: string;
  cursor?: string;

  // Event handlers
  onMouseDown?: (e: React.MouseEvent, context: ToolContext) => void;
  onMouseMove?: (e: React.MouseEvent, context: ToolContext) => void;
  onMouseUp?: (e: React.MouseEvent, context: ToolContext) => void;
  onClick?: (e: React.MouseEvent, context: ToolContext) => void;

  // Rendering
  render?: (annotation: Annotation, zoom: number) => React.ReactNode;
}

export interface ToolContext {
  pdfContainerRef: React.RefObject<HTMLDivElement>;
  annotations: Annotation[];
  setAnnotations: React.Dispatch<React.SetStateAction<Annotation[]>>;
  currentPage: number;
  zoom: number;
  drawColor: string;
  highlightColor: string;
  fontSize: number;
  saveToHistory: () => void;
  setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>;
  setStartPos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  isDrawing: boolean;
  startPos: { x: number; y: number };
  // Typography properties
  fontFamily?: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
}
