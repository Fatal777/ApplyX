import React from 'react';
import { Tool, ToolContext } from './ToolInterface';
import { Annotation } from '@/types/pdf';

export class DrawTool implements Tool {
  name = 'Draw';
  type = 'draw';
  cursor = 'crosshair';

  onMouseDown = (e: React.MouseEvent, context: ToolContext) => {
    const rect = context.pdfContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.setIsDrawing(true);
    context.setStartPos({ x, y });

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'draw',
      x,
      y,
      color: context.drawColor,
      page: context.currentPage,
      points: [x, y]
    };

    context.setAnnotations(prev => [...prev, newAnnotation]);
  };

  onMouseMove = (e: React.MouseEvent, context: ToolContext) => {
    if (!context.isDrawing) return;

    const rect = context.pdfContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.setAnnotations(prev => {
      const newAnnotations = [...prev];
      const lastAnnotation = newAnnotations[newAnnotations.length - 1];
      if (lastAnnotation && lastAnnotation.points) {
        lastAnnotation.points.push(x, y);
      }
      return newAnnotations;
    });
  };

  onMouseUp = (e: React.MouseEvent, context: ToolContext) => {
    if (!context.isDrawing) return;
    context.setIsDrawing(false);
    context.saveToHistory();
  };

  render = (annotation: Annotation, zoom: number) => {
    if (annotation.type !== 'draw' || !annotation.points) return null;

    const pathData = [];
    for (let i = 0; i < annotation.points.length; i += 2) {
      const x = annotation.points[i];
      const y = annotation.points[i + 1];
      pathData.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
    }

    return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <path
          d={pathData.join(' ')}
          stroke={annotation.color}
          strokeWidth={2}
          fill="none"
        />
      </svg>
    );
  };
}
