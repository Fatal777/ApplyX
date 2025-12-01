import React, { useRef, useState } from 'react';
import { useDocumentStore, Page } from '@/stores/documentStore';

interface TextOverlayProps {
  pageData: Page;
  zoom: number;
  editMode?: boolean;
}

const TextOverlay: React.FC<TextOverlayProps> = ({ pageData, zoom, editMode = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { updateTextRun, addEditOperation } = useDocumentStore();
  const [editingRunId, setEditingRunId] = useState<string | null>(null);

  if (!editMode) return null;

  const handleBlur = (runId: string, original: string) => (e: React.FocusEvent<HTMLDivElement>) => {
    const newText = (e.target.textContent || '').replace(/\n/g, '');
    if (newText !== original) {
      updateTextRun(pageData.index, runId, { text: newText, isEdited: true });
      addEditOperation({
        pageIndex: pageData.index,
        textRunId: runId,
        originalText: original,
        newText,
      });
    } else {
      // revert displayed text if unchanged and accidental newline inserted
      e.target.textContent = original;
    }
    setEditingRunId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLDivElement).blur();
    } else if (e.key === 'Escape') {
      const runId = (e.target as HTMLDivElement).dataset.runId;
      if (runId) {
        const run = pageData.textRuns.find(r => r.id === runId);
        if (run) (e.target as HTMLDivElement).textContent = run.text;
      }
      (e.target as HTMLDivElement).blur();
    }
  };

  const handleDoubleClick = (runId: string) => {
    setEditingRunId(runId);
    requestAnimationFrame(() => {
      const el = containerRef.current?.querySelector(`[data-run-id="${runId}"]`) as HTMLDivElement | null;
      if (el) {
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0"
      style={{
        width: pageData.width * zoom,
        height: pageData.height * zoom,
        pointerEvents: 'auto',
      }}
    >
      {pageData.textRuns.filter(run => run.id === editingRunId).map(run => {
        const isEditing = true;
        return (
          <div
            key={run.id}
            data-run-id={run.id}
            contentEditable
            suppressContentEditableWarning
            onBlur={handleBlur(run.id, run.text)}
            onKeyDown={handleKeyDown}
            style={{
              position: 'absolute',
              left: run.x * zoom,
              top: run.y * zoom,
              width: run.width * zoom,
              height: run.height * zoom,
              fontSize: run.fontSize * zoom,
              lineHeight: `${run.fontSize * zoom}px`,
              fontFamily: run.fontFamily,
              fontWeight: run.fontWeight,
              fontStyle: run.fontStyle,
              color: run.color || '#000000',
              whiteSpace: 'pre',
              overflow: 'hidden',
              background: 'transparent',
              outline: '1px solid #3b82f6',
              padding: '2px 4px',
              margin: '-2px -4px',
              userSelect: 'text',
              cursor: 'text',
            }}
          >
            {run.text}
          </div>
        );
      })}
      {/* Invisible click targets to initiate editing */}
      {editingRunId === null && pageData.textRuns.map(run => (
        <div
          key={`target-${run.id}`}
          onDoubleClick={() => handleDoubleClick(run.id)}
          style={{
            position: 'absolute',
            left: run.x * zoom,
            top: run.y * zoom,
            width: run.width * zoom,
            height: run.height * zoom,
            cursor: 'text',
            background: 'transparent',
          }}
          title="Double-click to edit"
        />
      ))}
    </div>
  );
};

export default TextOverlay;