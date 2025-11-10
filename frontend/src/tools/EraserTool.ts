import React from 'react';
import { Tool, ToolContext } from './ToolInterface';

export class EraserTool implements Tool {
  name = 'Eraser';
  type = 'eraser';
  cursor = 'pointer';

  onClick = (e: React.MouseEvent, context: ToolContext) => {
    // Find annotation under cursor and remove it
    const rect = context.pdfContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Find annotation that contains this point
    const annotationToDelete = context.annotations.find(ann => {
      if (ann.page !== context.currentPage) return false;

      switch (ann.type) {
        case 'text':
          return clickX >= ann.x && clickX <= ann.x + 100 && // rough text width
                 clickY >= ann.y && clickY <= ann.y + 30;    // rough text height

        case 'rectangle':
        case 'circle':
          return clickX >= ann.x && clickX <= ann.x + (ann.width || 0) &&
                 clickY >= ann.y && clickY <= ann.y + (ann.height || 0);

        case 'draw':
        case 'highlight':
          if (!ann.points) return false;
          // Check if click is near any point in the path
          for (let i = 0; i < ann.points.length; i += 2) {
            const dx = clickX - ann.points[i];
            const dy = clickY - ann.points[i + 1];
            if (Math.sqrt(dx * dx + dy * dy) < 10) return true;
          }
          return false;

        default:
          return false;
      }
    });

    if (annotationToDelete) {
      context.setAnnotations(prev =>
        prev.filter(ann => ann.id !== annotationToDelete.id)
      );
      context.saveToHistory();
    }
  };
}
