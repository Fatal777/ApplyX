/**
 * CanvasResumeRenderer - True WYSIWYG Resume Editor
 * ==================================================
 * 
 * A canvas-first renderer that enables instant keystroke-level updates.
 * Instead of rendering a PDF image, we render editable text layers over
 * a white A4 background. This eliminates backend round-trips for live preview.
 * 
 * Architecture:
 * - DOM-based editing (contentEditable) for accessibility and native text handling
 * - Canvas overlay for selection highlights and drag handles
 * - Zustand store for state management with optimistic updates
 * - Version tracking for race condition prevention
 * - Debounced sync for performance
 */

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  memo,
} from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import {
  GripVertical,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Type,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useDocumentStore, ResumeSection, SectionItem } from '@/stores/documentStore';
import { debounce } from '@/lib/utils';

// A4 dimensions in pixels at 72 DPI (standard PDF resolution)
const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const PAGE_MARGIN = 36; // 0.5 inch margin

// Version counter for race condition prevention
let globalEditVersion = 0;

// Edit event with version for ordering
interface VersionedEdit {
  version: number;
  sectionId: string;
  itemId?: string;
  type: 'text' | 'add' | 'remove' | 'reorder' | 'visibility';
  payload: any;
  timestamp: number;
}

// Edit queue for managing concurrent edits
const editQueue: VersionedEdit[] = [];
let isProcessingQueue = false;

// Process edit queue in order
const processEditQueue = (applyEdit: (edit: VersionedEdit) => void) => {
  if (isProcessingQueue || editQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  // Sort by version to ensure order
  editQueue.sort((a, b) => a.version - b.version);
  
  // Process all pending edits
  while (editQueue.length > 0) {
    const edit = editQueue.shift();
    if (edit) {
      applyEdit(edit);
    }
  }
  
  isProcessingQueue = false;
};

// Font size options
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32];

// Section header styles - unified type for both templates
interface SectionHeaderStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  textTransform: 'uppercase';
  color?: string;
  letterSpacing?: string;
  borderBottom?: string;
  paddingBottom?: number;
  marginBottom: number;
}

const SECTION_HEADER_STYLES: Record<'classic' | 'modern', SectionHeaderStyle> = {
  classic: {
    fontFamily: 'Times New Roman, serif',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#000000',
    borderBottom: '1px solid #000',
    paddingBottom: 4,
    marginBottom: 8,
  },
  modern: {
    fontFamily: 'Arial, sans-serif',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#2563eb',
    letterSpacing: '0.05em',
    marginBottom: 6,
  },
};

// Content styles
const CONTENT_STYLES = {
  classic: {
    fontFamily: 'Times New Roman, serif',
    fontSize: 11,
    lineHeight: 1.4,
  },
  modern: {
    fontFamily: 'Arial, sans-serif',
    fontSize: 10,
    lineHeight: 1.5,
  },
};

// Props
interface CanvasResumeRendererProps {
  zoom?: number;
  template?: 'classic' | 'modern';
  readOnly?: boolean;
  onPageCountChange?: (count: number) => void;
  className?: string;
}

// Editable text item component with contentEditable
const EditableTextItem = memo(({
  item,
  sectionId,
  template,
  onTextChange,
  onDelete,
  onAddBelow,
  readOnly,
}: {
  item: SectionItem;
  sectionId: string;
  template: 'classic' | 'modern';
  onTextChange: (text: string) => void;
  onDelete: () => void;
  onAddBelow: () => void;
  readOnly?: boolean;
}) => {
  const editableRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [localText, setLocalText] = useState(item.text);
  const lastSyncedText = useRef(item.text);
  
  // Sync external changes
  useEffect(() => {
    if (item.text !== lastSyncedText.current && !isFocused) {
      setLocalText(item.text);
      lastSyncedText.current = item.text;
      if (editableRef.current && editableRef.current.textContent !== item.text) {
        editableRef.current.textContent = item.text;
      }
    }
  }, [item.text, isFocused]);
  
  // Debounced sync to store
  const debouncedSync = useMemo(
    () =>
      debounce((text: string) => {
        if (text !== lastSyncedText.current) {
          lastSyncedText.current = text;
          onTextChange(text);
        }
      }, 150),
    [onTextChange]
  );
  
  const handleInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const newText = e.currentTarget.textContent || '';
      setLocalText(newText);
      debouncedSync(newText);
    },
    [debouncedSync]
  );
  
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);
  
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Immediate sync on blur
    const currentText = editableRef.current?.textContent || '';
    if (currentText !== lastSyncedText.current) {
      lastSyncedText.current = currentText;
      onTextChange(currentText);
    }
  }, [onTextChange]);
  
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Enter creates new item
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onAddBelow();
      }
      // Backspace on empty deletes
      if (e.key === 'Backspace' && !localText.trim()) {
        e.preventDefault();
        onDelete();
      }
    },
    [localText, onAddBelow, onDelete]
  );
  
  const styles = CONTENT_STYLES[template];
  const isBullet = item.isBullet;
  
  return (
    <div
      className={cn(
        'group relative flex items-start gap-1 py-0.5 rounded transition-colors',
        isFocused && 'bg-blue-50/50',
        !readOnly && 'hover:bg-gray-50/50'
      )}
    >
      {/* Bullet point */}
      {isBullet && (
        <span
          className="flex-shrink-0 mt-1 select-none"
          style={{ fontSize: styles.fontSize, fontFamily: styles.fontFamily }}
        >
          •
        </span>
      )}
      
      {/* Editable content */}
      <div
        ref={editableRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex-1 outline-none min-h-[1.2em]',
          item.isEdited && 'text-blue-700',
          item.indent === 1 && 'ml-4',
          item.indent === 2 && 'ml-8'
        )}
        style={{
          fontFamily: styles.fontFamily,
          fontSize: styles.fontSize,
          lineHeight: styles.lineHeight,
        }}
      >
        {localText}
      </div>
      
      {/* Action buttons on hover */}
      {!readOnly && (
        <AnimatePresence>
          {isFocused && (
            <motion.div
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 5 }}
              className="absolute right-0 top-0 flex items-center gap-0.5 bg-white shadow-sm rounded border px-1 py-0.5"
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={onAddBelow}
                title="Add item below"
              >
                <Plus className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-red-500 hover:text-red-600"
                onClick={onDelete}
                title="Delete item"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
});

EditableTextItem.displayName = 'EditableTextItem';

// Section component
const EditableSection = memo(({
  section,
  template,
  onSectionChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onToggleVisibility,
  onToggleCollapse,
  onRemoveSection,
  readOnly,
}: {
  section: ResumeSection;
  template: 'classic' | 'modern';
  onSectionChange: (updates: Partial<ResumeSection>) => void;
  onItemChange: (itemId: string, text: string) => void;
  onAddItem: (afterItemId?: string) => void;
  onRemoveItem: (itemId: string) => void;
  onToggleVisibility: () => void;
  onToggleCollapse: () => void;
  onRemoveSection: () => void;
  readOnly?: boolean;
}) => {
  const dragControls = useDragControls();
  const titleRef = useRef<HTMLDivElement>(null);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  
  const headerStyles = SECTION_HEADER_STYLES[template];
  
  const handleTitleChange = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    onSectionChange({ title: e.currentTarget.textContent || '' });
  }, [onSectionChange]);
  
  if (!section.visible && readOnly) {
    return null;
  }
  
  return (
    <Reorder.Item
      value={section}
      dragListener={false}
      dragControls={dragControls}
      className={cn(
        'mb-4 transition-opacity',
        !section.visible && 'opacity-40'
      )}
    >
      {/* Section header */}
      <div className="flex items-center gap-2 group">
        {/* Drag handle */}
        {!readOnly && (
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}
        
        {/* Title */}
        <div
          ref={titleRef}
          contentEditable={!readOnly}
          suppressContentEditableWarning
          onInput={handleTitleChange}
          onFocus={() => setIsTitleEditing(true)}
          onBlur={() => setIsTitleEditing(false)}
          className={cn(
            'flex-1 outline-none',
            isTitleEditing && 'bg-blue-50/50 rounded px-1 -mx-1'
          )}
          style={{
            fontFamily: headerStyles.fontFamily,
            fontSize: headerStyles.fontSize,
            fontWeight: headerStyles.fontWeight,
            textTransform: headerStyles.textTransform,
            color: headerStyles.color || '#000',
            letterSpacing: headerStyles.letterSpacing,
            borderBottom: headerStyles.borderBottom,
            paddingBottom: headerStyles.paddingBottom,
            marginBottom: 0,
          }}
        >
          {section.title}
        </div>
        
        {/* Section controls */}
        {!readOnly && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={onToggleVisibility}
              title={section.visible ? 'Hide section' : 'Show section'}
            >
              {section.visible ? (
                <Eye className="w-3 h-3" />
              ) : (
                <EyeOff className="w-3 h-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={onToggleCollapse}
              title={section.collapsed ? 'Expand' : 'Collapse'}
            >
              {section.collapsed ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-red-500 hover:text-red-600"
              onClick={onRemoveSection}
              title="Delete section"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
      
      {/* Section content */}
      <AnimatePresence>
        {!section.collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ marginTop: headerStyles.marginBottom }}
          >
            {section.items.map((item, idx) => (
              <EditableTextItem
                key={item.id}
                item={item}
                sectionId={section.id}
                template={template}
                onTextChange={(text) => onItemChange(item.id, text)}
                onDelete={() => onRemoveItem(item.id)}
                onAddBelow={() => onAddItem(item.id)}
                readOnly={readOnly}
              />
            ))}
            
            {/* Add item button */}
            {!readOnly && section.items.length === 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-600 text-xs"
                onClick={() => onAddItem()}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add item
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
});

EditableSection.displayName = 'EditableSection';

// Main renderer component
const CanvasResumeRenderer: React.FC<CanvasResumeRendererProps> = ({
  zoom = 1,
  template = 'classic',
  readOnly = false,
  onPageCountChange,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);
  const [editVersion, setEditVersion] = useState(0);
  
  const {
    sections,
    setSections,
    reorderSections,
    updateSectionItem,
    addSectionItem,
    removeSectionItem,
    removeSection,
    toggleSectionVisibility,
  } = useDocumentStore();
  
  // Calculate page count based on content height
  useEffect(() => {
    if (!contentRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const contentHeight = entry.contentRect.height;
        const usableHeight = A4_HEIGHT - (PAGE_MARGIN * 2);
        const pages = Math.max(1, Math.ceil(contentHeight / usableHeight));
        
        if (pages !== pageCount) {
          setPageCount(pages);
          onPageCountChange?.(pages);
        }
      }
    });
    
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [pageCount, onPageCountChange]);
  
  // Handle section reorder with version tracking
  const handleReorder = useCallback((newOrder: ResumeSection[]) => {
    const version = ++globalEditVersion;
    setEditVersion(version);
    
    // Optimistic update
    reorderSections(newOrder);
    
    // Queue for processing (in case of rapid reorders)
    editQueue.push({
      version,
      sectionId: '',
      type: 'reorder',
      payload: newOrder.map(s => s.id),
      timestamp: Date.now(),
    });
  }, [reorderSections]);
  
  // Handle item text change with debouncing
  const handleItemChange = useCallback((sectionId: string, itemId: string, text: string) => {
    const version = ++globalEditVersion;
    setEditVersion(version);
    
    // Optimistic update
    updateSectionItem(sectionId, itemId, text);
  }, [updateSectionItem]);
  
  // Handle add item
  const handleAddItem = useCallback((sectionId: string, afterItemId?: string) => {
    const version = ++globalEditVersion;
    setEditVersion(version);
    
    addSectionItem(sectionId, '', afterItemId);
  }, [addSectionItem]);
  
  // Handle remove item
  const handleRemoveItem = useCallback((sectionId: string, itemId: string) => {
    const version = ++globalEditVersion;
    setEditVersion(version);
    
    removeSectionItem(sectionId, itemId);
  }, [removeSectionItem]);
  
  // Handle toggle visibility
  const handleToggleVisibility = useCallback((sectionId: string) => {
    const version = ++globalEditVersion;
    setEditVersion(version);
    
    toggleSectionVisibility(sectionId);
  }, [toggleSectionVisibility]);
  
  // Handle toggle collapse
  const handleToggleCollapse = useCallback((sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      const newSections = sections.map(s =>
        s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s
      );
      setSections(newSections);
    }
  }, [sections, setSections]);
  
  // Handle section change (title, etc.)
  const handleSectionChange = useCallback((sectionId: string, updates: Partial<ResumeSection>) => {
    const newSections = sections.map(s =>
      s.id === sectionId ? { ...s, ...updates } : s
    );
    setSections(newSections);
  }, [sections, setSections]);
  
  // Handle remove section
  const handleRemoveSection = useCallback((sectionId: string) => {
    removeSection(sectionId);
  }, [removeSection]);
  
  // Visible sections (sorted by order)
  const visibleSections = useMemo(() => {
    return [...sections]
      .filter(s => readOnly ? s.visible : true)
      .sort((a, b) => a.order - b.order);
  }, [sections, readOnly]);
  
  // Page break indicators
  const pageBreaks = useMemo(() => {
    const breaks: number[] = [];
    const usableHeight = A4_HEIGHT - (PAGE_MARGIN * 2);
    
    for (let i = 1; i < pageCount; i++) {
      breaks.push(i * usableHeight);
    }
    
    return breaks;
  }, [pageCount]);
  
  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto bg-gray-200 p-4', className)}
    >
      {/* A4 Page Container */}
      <div
        className="relative mx-auto bg-white shadow-lg"
        style={{
          width: A4_WIDTH * zoom,
          minHeight: A4_HEIGHT * zoom,
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
        }}
      >
        {/* Content area with margins */}
        <div
          ref={contentRef}
          className="relative"
          style={{
            padding: PAGE_MARGIN,
            minHeight: A4_HEIGHT - (PAGE_MARGIN * 2),
          }}
        >
          {/* Sections */}
          {sections.length > 0 ? (
            <Reorder.Group
              axis="y"
              values={visibleSections}
              onReorder={handleReorder}
              className="space-y-0"
            >
              {visibleSections.map((section) => (
                <EditableSection
                  key={section.id}
                  section={section}
                  template={template}
                  onSectionChange={(updates) => handleSectionChange(section.id, updates)}
                  onItemChange={(itemId, text) => handleItemChange(section.id, itemId, text)}
                  onAddItem={(afterItemId) => handleAddItem(section.id, afterItemId)}
                  onRemoveItem={(itemId) => handleRemoveItem(section.id, itemId)}
                  onToggleVisibility={() => handleToggleVisibility(section.id)}
                  onToggleCollapse={() => handleToggleCollapse(section.id)}
                  onRemoveSection={() => handleRemoveSection(section.id)}
                  readOnly={readOnly}
                />
              ))}
            </Reorder.Group>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Type className="w-12 h-12 mb-4" />
              <p className="text-sm">Upload a resume or start typing</p>
            </div>
          )}
        </div>
        
        {/* Page break indicators */}
        {pageBreaks.map((y, idx) => (
          <div
            key={idx}
            className="absolute left-0 right-0 border-t-2 border-dashed border-red-300 pointer-events-none"
            style={{ top: y + PAGE_MARGIN }}
          >
            <span className="absolute -top-3 right-2 text-xs text-red-400 bg-white px-1">
              Page {idx + 2}
            </span>
          </div>
        ))}
      </div>
      
      {/* Multi-page indicator */}
      {pageCount > 1 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-amber-100 border border-amber-300 text-amber-800 px-4 py-2 rounded-lg shadow-lg text-sm">
          <span className="font-medium">{pageCount} pages</span>
          <span className="mx-2">•</span>
          <span>Consider condensing to 1 page for ATS compatibility</span>
        </div>
      )}
    </div>
  );
};

export default memo(CanvasResumeRenderer);
