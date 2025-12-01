import React, { useEffect, useRef, useState } from 'react';
import { Page, useDocumentStore } from '@/stores/documentStore';

interface EditableTextLayerProps {
  pageNumber: number;
  pageData: Page;
  editMode?: boolean;
}

/**
 * This component makes the PDF.js text layer editable by intercepting
 * the rendered text spans and adding contenteditable functionality.
 * This ensures perfect alignment with the actual PDF rendering.
 */
const EditableTextLayer: React.FC<EditableTextLayerProps> = ({
  pageNumber,
  pageData,
  editMode = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [initialized, setInitialized] = useState(false);
  const { updateTextRun, addEditOperation } = useDocumentStore();
  const editMapRef = useRef<Map<HTMLElement, { runId: string; originalText: string }>>(new Map());

  useEffect(() => {
    if (!editMode || initialized) return;

    // Wait for PDF.js to render the text layer
    const interval = setInterval(() => {
      const pageContainer = document.querySelector(`[data-page-number="${pageNumber}"]`);
      const textLayer = pageContainer?.querySelector('.textLayer') as HTMLElement;
      
      if (textLayer && textLayer.children.length > 0) {
        // Ensure the text layer itself can receive pointer/selection events
        textLayer.style.pointerEvents = 'auto';
        textLayer.style.userSelect = 'text';
        // Keep text layer above the canvas but below any overlays
        // pdf.js sets z-index: 2 by default; keep or slightly raise if needed
        if (!textLayer.style.zIndex) {
          textLayer.style.zIndex = '2';
        }

        clearInterval(interval);
        makeTextLayerEditable(textLayer);
        setInitialized(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [pageNumber, editMode, initialized]);

  const makeTextLayerEditable = (textLayer: HTMLElement) => {
    // Get all text spans from PDF.js text layer
    const textSpans = Array.from(textLayer.querySelectorAll('span[role="presentation"]')) as HTMLElement[];
    
    console.log(`[EditableTextLayer] Making ${textSpans.length} text spans editable on page ${pageNumber}`);

    textSpans.forEach((span, index) => {
      const originalText = span.textContent || '';
      const runId = `page-${pageNumber}-text-${index}`;
      
      // Store mapping for later reference
      editMapRef.current.set(span, { runId, originalText });

      // Make the span itself editable
      span.contentEditable = 'false'; // Start as non-editable
      span.style.cursor = 'text';
      span.style.userSelect = 'text';
      span.style.pointerEvents = 'auto';
      
      // Add hover effect
      span.addEventListener('mouseenter', () => {
        if (span.contentEditable === 'false') {
          span.style.outline = '1px dashed #3b82f6';
          span.style.outlineOffset = '1px';
        }
      });
      
      span.addEventListener('mouseleave', () => {
        if (span.contentEditable === 'false') {
          span.style.outline = 'none';
        }
      });

      // Double-click to edit
      span.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Store original color
        const originalColor = span.style.color || getComputedStyle(span).color;
        span.dataset.originalColor = originalColor;
        
        // Make editable with white background that covers original PDF text
        span.contentEditable = 'true';
        span.style.outline = '2px solid #3b82f6';
        span.style.background = '#ffffff';
        span.style.color = '#000000';
        span.style.padding = '0px 2px';
        span.style.margin = '0';
        span.style.position = 'relative';
        span.style.zIndex = '1000';
        span.style.pointerEvents = 'auto';
        span.focus();
        
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(span);
        const sel = globalThis.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      });

      // Handle blur (save changes)
      span.addEventListener('blur', () => {
        const newText = span.textContent || '';
        const mapping = editMapRef.current.get(span);
        
        if (mapping && newText !== mapping.originalText) {
          console.log(`[EditableTextLayer] Text changed: "${mapping.originalText}" -> "${newText}"`);
          
          // Update store
          const runIndex = pageData.textRuns.findIndex(r => r.text === mapping.originalText);
          if (runIndex >= 0) {
            const run = pageData.textRuns[runIndex];
            updateTextRun(pageData.index, run.id, { text: newText, isEdited: true });
            addEditOperation({
              pageIndex: pageData.index,
              textRunId: run.id,
              originalText: mapping.originalText,
              newText,
            });
            
            // Update mapping
            editMapRef.current.set(span, { ...mapping, originalText: newText });
            
            // Visual feedback - show edited text in blue
            span.style.color = '#0066cc';
          }
        } else if (mapping) {
          // Restore original color if no change
          const originalColor = span.dataset.originalColor;
          if (originalColor) {
            span.style.color = originalColor;
          }
        }
        
        // Make non-editable again
        span.contentEditable = 'false';
        span.style.outline = 'none';
        span.style.background = 'transparent';
        span.style.padding = '0';
        span.style.zIndex = '';
        span.style.pointerEvents = 'auto';
      });

      // Handle ESC key
      span.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          // Revert changes
          const mapping = editMapRef.current.get(span);
          if (mapping) {
            span.textContent = mapping.originalText;
          }
          span.blur();
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          span.blur();
        }
      });
    });
  };

  return (
    null
  );
};

export default EditableTextLayer;
