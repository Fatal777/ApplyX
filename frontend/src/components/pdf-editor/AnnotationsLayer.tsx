import React from 'react';
import { ToolRegistry } from '@/tools/ToolRegistry';
import { Annotation, ToolType } from '@/types/pdf';
import { ToolContext } from '@/tools/ToolInterface';

interface AnnotationsLayerProps {
  pageNumber: number;
  zoom: number;
  pageRef: React.RefObject<HTMLDivElement>;
  activeTool: ToolType;
  annotations: Annotation[];
  setAnnotations: React.Dispatch<React.SetStateAction<Annotation[]>>;
  drawColor: string;
  highlightColor: string;
  fontSize: number;
  fontFamily?: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
}

const AnnotationsLayer: React.FC<AnnotationsLayerProps> = ({
  pageNumber,
  zoom,
  pageRef,
  activeTool,
  annotations,
  setAnnotations,
  drawColor,
  highlightColor,
  fontSize,
  fontFamily,
  isBold,
  isItalic,
  isUnderline,
}) => {
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [startPos, setStartPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const tool = ToolRegistry.getTool(activeTool);

  const context: ToolContext = React.useMemo(() => ({
    pdfContainerRef: pageRef,
    annotations,
    setAnnotations,
    currentPage: pageNumber,
    zoom,
    drawColor,
    highlightColor,
    fontSize,
    fontFamily,
    isBold,
    isItalic,
    isUnderline,
    saveToHistory: () => {},
    setIsDrawing,
    setStartPos,
    isDrawing,
    startPos,
  }), [pageRef, annotations, setAnnotations, pageNumber, zoom, drawColor, highlightColor, fontSize, fontFamily, isBold, isItalic, isUnderline, isDrawing, startPos]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tool || activeTool === 'select') return;
    tool.onMouseDown?.(e, context);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!tool || activeTool === 'select') return;
    tool.onMouseMove?.(e, context);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!tool || activeTool === 'select') return;
    tool.onMouseUp?.(e, context);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!tool || activeTool === 'select') return;
    tool.onClick?.(e, context);
  };

  return (
    /* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */
    <div
      role="application"
      aria-label="PDF annotations layer"
      className="absolute inset-0"
      style={{ cursor: tool?.cursor || 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
    >
      {annotations.filter(a => a.page === pageNumber).map(a => (
        <React.Fragment key={a.id}>
          {ToolRegistry.getTool(a.type)?.render?.(a, zoom) || null}
        </React.Fragment>
      ))}
    </div>
  );
};

export default AnnotationsLayer;
