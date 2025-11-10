import React from 'react';
import { Tool, ToolContext } from './ToolInterface';
import { Annotation } from '@/types/pdf';

export class TextTool implements Tool {
  name = 'Text';
  type = 'text';
  cursor = 'crosshair';

  onClick = (e: React.MouseEvent, context: ToolContext) => {
    const rect = context.pdfContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Get typography settings from context
    const fontFamily = context.fontFamily || 'Arial';
    const isBold = context.isBold || false;
    const isItalic = context.isItalic || false;
    const isUnderline = context.isUnderline || false;

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'text',
      text: "Double click to edit",
      x,
      y,
      fontSize: context.fontSize,
      fontFamily,
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
      textDecoration: isUnderline ? 'underline' : 'none',
      color: context.drawColor,
      page: context.currentPage,
    };

    context.setAnnotations(prev => [...prev, newAnnotation]);
  };

  render = (annotation: Annotation, zoom: number) => {
    if (annotation.type !== 'text') return null;

    return (
      <div
        key={`text-${annotation.id}`}
        style={{
          position: 'absolute',
          left: `${annotation.x}px`,
          top: `${annotation.y}px`,
          fontSize: `${(annotation.fontSize || 14)}px`,
          fontFamily: annotation.fontFamily || 'Arial',
          fontWeight: annotation.fontWeight || 'normal',
          fontStyle: annotation.fontStyle || 'normal',
          textDecoration: annotation.textDecoration || 'none',
          cursor: 'text',
          border: '1px solid transparent',
          padding: '2px',
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '2px',
          minWidth: '100px',
          minHeight: '20px',
          zIndex: 10,
          color: annotation.color || '#000000',
        }}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => {
          const target = e.target as HTMLElement;
          annotation.text = target.textContent || '';
        }}
        onBlur={(e) => {
          const target = e.target as HTMLElement;
          annotation.text = target.textContent || '';
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLElement).blur();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            (e.target as HTMLElement).blur();
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {annotation.text}
      </div>
    );
  };

  private detectFontAtPosition(x: number, y: number, context: ToolContext) {
    // This would analyze the PDF text layer to detect fonts
    // For now, return default values - will be implemented with font detection library
    return {
      family: 'Arial',
      size: 12,
      weight: 'normal' as const,
      style: 'normal' as const,
    };
  }
}
