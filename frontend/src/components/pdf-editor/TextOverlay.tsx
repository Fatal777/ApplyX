import React, { useRef, useEffect, useState } from 'react';
import { fabric } from 'fabric';
import { Page, TextRun } from '@/stores/documentStore';
import { useDocumentStore } from '@/stores/documentStore';
import { FontManager } from '@/lib/font-manager';

interface TextOverlayProps {
  pageData: Page;
  zoom: number;
  onTextClick?: (textRunId: string) => void;
  selectedTextRun?: string | null;
  className?: string;
}

const TextOverlay: React.FC<TextOverlayProps> = ({
  pageData,
  zoom,
  onTextClick,
  selectedTextRun,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const textObjectMap = useRef<Map<string, fabric.IText>>(new Map());
  const { updateTextRun, addEditOperation } = useDocumentStore();

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: pageData.width * zoom,
      height: pageData.height * zoom,
      backgroundColor: 'transparent',
      selection: true,
      renderOnAddRemove: true,
    });

    setCanvas(fabricCanvas);

    return () => {
      fabricCanvas.dispose();
    };
  }, [pageData.width, pageData.height, zoom]);

  // Render text runs on canvas
  useEffect(() => {
    if (!canvas) return;

    // Clear existing text objects
    canvas.clear();
    textObjectMap.current.clear();

    // Add text runs to canvas
    pageData.textRuns.forEach((textRun) => {
      const fontCSS = FontManager.getFontCSS(
        textRun.fontFamily,
        textRun.fontSize * zoom,
        textRun.fontWeight,
        textRun.fontStyle
      );

      const text = new fabric.IText(textRun.text, {
        left: textRun.x * zoom,
        top: textRun.y * zoom,
        fontSize: textRun.fontSize * zoom,
        fontFamily: textRun.fontFamily,
        fontWeight: textRun.fontWeight as any,
        fontStyle: textRun.fontStyle,
        fill: textRun.isEdited ? '#0066cc' : textRun.color,
        selectable: true,
        editable: true,
        hasControls: true,
        hasBorders: true,
        borderColor: '#0066cc',
        borderOpacityWhenMoving: 0.5,
        borderScaleFactor: 2,
        lockRotation: true,
        lockScalingX: false,
        lockScalingY: false,
        transparentCorners: false,
        cornerSize: 8,
        cornerColor: '#0066cc',
        data: { textRunId: textRun.id },
      });

      // Handle text click
      text.on('selected', () => {
        if (onTextClick) {
          onTextClick(textRun.id);
        }
      });

      // Handle text editing
      text.on('editing:exited', () => {
        const newText = text.text || '';
        if (newText !== textRun.text) {
          // Update text run in store
          updateTextRun(pageData.index, textRun.id, {
            text: newText,
            isEdited: true,
          });

          // Add edit operation
          addEditOperation({
            pageIndex: pageData.index,
            textRunId: textRun.id,
            originalText: textRun.originalText || textRun.text,
            newText: newText,
          });

          // Update visual feedback
          text.set('fill', '#0066cc');
          canvas.renderAll();
        }
      });

      // Handle position changes
      text.on('moved', () => {
        const newX = (text.left || 0) / zoom;
        const newY = (text.top || 0) / zoom;

        updateTextRun(pageData.index, textRun.id, {
          x: newX,
          y: newY,
          isEdited: true,
        });
      });

      // Handle font size changes (via scaling)
      text.on('scaled', () => {
        const scaleX = text.scaleX || 1;
        const newFontSize = textRun.fontSize * scaleX;

        text.set({
          fontSize: newFontSize * zoom,
          scaleX: 1,
          scaleY: 1,
        });

        updateTextRun(pageData.index, textRun.id, {
          fontSize: newFontSize,
          isEdited: true,
        });

        canvas.renderAll();
      });

      canvas.add(text);
      textObjectMap.current.set(textRun.id, text);
    });

    // Handle selection
    if (selectedTextRun) {
      const selectedObject = textObjectMap.current.get(selectedTextRun);
      if (selectedObject) {
        canvas.setActiveObject(selectedObject);
        canvas.renderAll();
      }
    }
  }, [canvas, pageData, zoom, onTextClick, selectedTextRun, updateTextRun, addEditOperation]);

  // Enable text editing on double click
  useEffect(() => {
    if (!canvas) return;

    const handleDoubleClick = (event: fabric.IEvent) => {
      const target = event.target;
      if (target && target.type === 'i-text') {
        const textObject = target as fabric.IText;
        textObject.enterEditing();
        textObject.selectAll();
        canvas.renderAll();
      }
    };

    canvas.on('mouse:dblclick', handleDoubleClick);

    return () => {
      canvas.off('mouse:dblclick', handleDoubleClick);
    };
  }, [canvas]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!canvas) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeObject = canvas.getActiveObject();
      
      if (!activeObject || activeObject.type !== 'i-text') return;

      const textObject = activeObject as fabric.IText;

      // Delete text on Delete/Backspace (when not editing)
      if ((e.key === 'Delete' || e.key === 'Backspace') && !textObject.isEditing) {
        e.preventDefault();
        canvas.remove(textObject);
        canvas.renderAll();
        return;
      }

      // Bold (Ctrl/Cmd + B)
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        const isBold = textObject.fontWeight === 'bold';
        textObject.set('fontWeight', isBold ? 'normal' : 'bold');
        canvas.renderAll();
      }

      // Italic (Ctrl/Cmd + I)
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        const isItalic = textObject.fontStyle === 'italic';
        textObject.set('fontStyle', isItalic ? 'normal' : 'italic');
        canvas.renderAll();
      }

      // Increase font size (Ctrl/Cmd + ])
      if ((e.ctrlKey || e.metaKey) && e.key === ']') {
        e.preventDefault();
        const currentSize = textObject.fontSize || 12;
        textObject.set('fontSize', currentSize + 2);
        canvas.renderAll();
      }

      // Decrease font size (Ctrl/Cmd + [)
      if ((e.ctrlKey || e.metaKey) && e.key === '[') {
        e.preventDefault();
        const currentSize = textObject.fontSize || 12;
        textObject.set('fontSize', Math.max(8, currentSize - 2));
        canvas.renderAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canvas]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute top-0 left-0 ${className}`}
      style={{ pointerEvents: 'auto' }}
    />
  );
};

export default TextOverlay;