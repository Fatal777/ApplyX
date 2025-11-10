import React from 'react';
import { Tool, ToolContext } from './ToolInterface';
import { Annotation } from '@/types/pdf';

export class RectangleTool implements Tool {
  name = 'Rectangle';
  type = 'rectangle';
  cursor = 'crosshair';

  onMouseDown = (e: React.MouseEvent, context: ToolContext) => {
    const rect = context.pdfContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.setIsDrawing(true);
    context.setStartPos({ x, y });
  };

  onMouseUp = (e: React.MouseEvent, context: ToolContext) => {
    if (!context.isDrawing) return;

    const rect = context.pdfContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'rectangle',
      x: context.startPos.x,
      y: context.startPos.y,
      width: x - context.startPos.x,
      height: y - context.startPos.y,
      color: context.drawColor,
      page: context.currentPage
    };

    context.setAnnotations(prev => [...prev, newAnnotation]);
    context.setIsDrawing(false);
    context.saveToHistory();
  };

  render = (annotation: Annotation, zoom: number) => {
    if (annotation.type !== 'rectangle') return null;

    return (
      <div
        style={{
          position: 'absolute',
          left: `${annotation.x}px`,
          top: `${annotation.y}px`,
          width: `${annotation.width}px`,
          height: `${annotation.height}px`,
          border: `2px solid ${annotation.color}`,
          background: 'transparent',
          zIndex: 10,
        }}
      />
    );
  };
}

export class CircleTool implements Tool {
  name = 'Circle';
  type = 'circle';
  cursor = 'crosshair';

  onMouseDown = (e: React.MouseEvent, context: ToolContext) => {
    const rect = context.pdfContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.setIsDrawing(true);
    context.setStartPos({ x, y });
  };

  onMouseUp = (e: React.MouseEvent, context: ToolContext) => {
    if (!context.isDrawing) return;

    const rect = context.pdfContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'circle',
      x: context.startPos.x,
      y: context.startPos.y,
      width: x - context.startPos.x,
      height: y - context.startPos.y,
      color: context.drawColor,
      page: context.currentPage
    };

    context.setAnnotations(prev => [...prev, newAnnotation]);
    context.setIsDrawing(false);
    context.saveToHistory();
  };

  render = (annotation: Annotation, zoom: number) => {
    if (annotation.type !== 'circle') return null;

    return (
      <div
        style={{
          position: 'absolute',
          left: `${annotation.x}px`,
          top: `${annotation.y}px`,
          width: `${Math.abs(annotation.width!)}px`,
          height: `${Math.abs(annotation.height!)}px`,
          border: `2px solid ${annotation.color}`,
          borderRadius: '50%',
          background: 'transparent',
          zIndex: 10,
        }}
      />
    );
  };
}
