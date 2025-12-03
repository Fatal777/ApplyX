/**
 * Resume Section Extractor
 * ========================
 * Extracts and clusters TextRuns from PDF into editable resume sections.
 * Uses pattern matching similar to backend nlp_analysis.py
 */

import { TextRun } from '@/stores/documentStore';

// Section types
export type SectionType = 
  | 'contact'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'awards'
  | 'languages'
  | 'other';

// Section item (bullet point or line within a section)
export interface SectionItem {
  id: string;
  text: string;
  textRunIds: string[]; // References to original TextRuns
  indent: number; // 0 = heading, 1 = subheading, 2 = bullet
  isBullet: boolean;
  isEdited: boolean;
  originalText?: string;
}

// Resume section
export interface ResumeSection {
  id: string;
  type: SectionType;
  title: string;
  items: SectionItem[];
  visible: boolean;
  order: number;
  collapsed: boolean;
  // Bounding box for the section in PDF coordinates
  bounds: {
    pageIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Styling
  titleStyle: {
    fontSize: number;
    fontFamily: string;
    fontWeight?: string;
    color: string;
  };
}

// Section patterns (matching backend nlp_analysis.py)
const SECTION_PATTERNS: Record<SectionType, RegExp> = {
  contact: /^(contact|personal\s*info|info)/i,
  summary: /^(summary|objective|profile|about\s*me|professional\s*summary|career\s*objective)/i,
  experience: /^(experience|employment|work\s*history|professional\s*experience|work\s*experience)/i,
  education: /^(education|academic|qualification|degree|schooling)/i,
  skills: /^(skills|technical\s*skills|competencies|expertise|technologies|core\s*competencies)/i,
  projects: /^(projects|portfolio|personal\s*projects|key\s*projects)/i,
  certifications: /^(certification|certificate|licenses?|credentials)/i,
  awards: /^(awards?|achievements?|honors?|recognition)/i,
  languages: /^(languages?|language\s*skills)/i,
  other: /^$/,
};

// Section display names
export const SECTION_DISPLAY_NAMES: Record<SectionType, string> = {
  contact: 'Contact Information',
  summary: 'Professional Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  awards: 'Awards & Achievements',
  languages: 'Languages',
  other: 'Other',
};

// Section icons (using Lucide icon names)
export const SECTION_ICONS: Record<SectionType, string> = {
  contact: 'User',
  summary: 'FileText',
  experience: 'Briefcase',
  education: 'GraduationCap',
  skills: 'Code',
  projects: 'Layers',
  certifications: 'Award',
  awards: 'Star',
  languages: 'Globe',
  other: 'MoreHorizontal',
};

// Section colors for timeline
export const SECTION_COLORS: Record<SectionType, string> = {
  contact: '#3b82f6', // blue-500
  summary: '#8b5cf6', // violet-500
  experience: '#22c55e', // green-500
  education: '#f97316', // orange-500
  skills: '#ec4899', // pink-500
  projects: '#06b6d4', // cyan-500
  certifications: '#eab308', // yellow-500
  awards: '#ef4444', // red-500
  languages: '#6366f1', // indigo-500
  other: '#6b7280', // gray-500
};

/**
 * Check if a text run is likely a section header
 */
function isSectionHeader(textRun: TextRun, allTextRuns: TextRun[]): boolean {
  // Headers typically have larger font size than body text
  const avgFontSize = allTextRuns.reduce((sum, tr) => sum + tr.fontSize, 0) / allTextRuns.length;
  
  // Check various indicators of a header
  const isLargerFont = textRun.fontSize > avgFontSize * 1.1;
  const isBold = textRun.fontWeight === 'bold' || textRun.pdfFontName?.includes('Bold');
  const isShortText = textRun.text.trim().split(/\s+/).length <= 5;
  const isAllCaps = textRun.text === textRun.text.toUpperCase() && textRun.text.length > 3;
  const matchesPattern = Object.values(SECTION_PATTERNS).some(pattern => 
    pattern.test(textRun.text.trim())
  );
  
  return (isLargerFont || isBold || isAllCaps) && isShortText && (matchesPattern || isLargerFont);
}

/**
 * Detect section type from header text
 */
function detectSectionType(text: string): SectionType {
  const normalizedText = text.trim().toLowerCase();
  
  for (const [type, pattern] of Object.entries(SECTION_PATTERNS)) {
    if (pattern.test(normalizedText)) {
      return type as SectionType;
    }
  }
  
  return 'other';
}

/**
 * Check if text run is a bullet point
 */
function isBulletPoint(textRun: TextRun): boolean {
  const bulletPatterns = [
    /^[\u2022\u2023\u2043\u204C\u204D\u25E6\u25AA\u25AB\u25CF\u25D8\u25D9•◦●○]\s*/,
    /^[-–—]\s+/,
    /^\d+[.)]\s+/,
    /^[a-zA-Z][.)]\s+/,
    /^\*\s+/,
  ];
  
  return bulletPatterns.some(pattern => pattern.test(textRun.text.trim()));
}

/**
 * Group text runs by vertical proximity (same line)
 */
function groupTextRunsByLine(textRuns: TextRun[]): TextRun[][] {
  if (textRuns.length === 0) return [];
  
  // Sort by Y position (top to bottom), then X (left to right)
  const sorted = [...textRuns].sort((a, b) => {
    if (Math.abs(a.y - b.y) < 3) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });
  
  const lines: TextRun[][] = [];
  let currentLine: TextRun[] = [sorted[0]];
  let currentY = sorted[0].y;
  
  for (let i = 1; i < sorted.length; i++) {
    const textRun = sorted[i];
    // If within 5px vertically, consider same line
    if (Math.abs(textRun.y - currentY) < 5) {
      currentLine.push(textRun);
    } else {
      lines.push(currentLine);
      currentLine = [textRun];
      currentY = textRun.y;
    }
  }
  
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  
  return lines;
}

/**
 * Combine text runs in a line into a single text
 */
function combineLineText(textRuns: TextRun[]): string {
  return textRuns
    .sort((a, b) => a.x - b.x)
    .map(tr => tr.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate bounding box for a group of text runs
 */
function calculateBounds(textRuns: TextRun[]): ResumeSection['bounds'] {
  if (textRuns.length === 0) {
    return { pageIndex: 0, x: 0, y: 0, width: 0, height: 0 };
  }
  
  const pageIndex = textRuns[0].pageIndex;
  const minX = Math.min(...textRuns.map(tr => tr.x));
  const minY = Math.min(...textRuns.map(tr => tr.y));
  const maxX = Math.max(...textRuns.map(tr => tr.x + tr.width));
  const maxY = Math.max(...textRuns.map(tr => tr.y + tr.height));
  
  return {
    pageIndex,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Extract resume sections from TextRuns
 */
export function extractSections(textRuns: TextRun[]): ResumeSection[] {
  if (textRuns.length === 0) return [];
  
  // Group text runs by page
  const pageGroups = textRuns.reduce((acc, tr) => {
    if (!acc[tr.pageIndex]) acc[tr.pageIndex] = [];
    acc[tr.pageIndex].push(tr);
    return acc;
  }, {} as Record<number, TextRun[]>);
  
  const sections: ResumeSection[] = [];
  let sectionOrder = 0;
  
  // Process each page
  for (const [pageIndex, pageTextRuns] of Object.entries(pageGroups)) {
    const lines = groupTextRunsByLine(pageTextRuns);
    
    let currentSection: ResumeSection | null = null;
    let contactSection: ResumeSection | null = null;
    
    // First few lines are usually contact info
    const contactLines = lines.slice(0, Math.min(5, lines.length));
    const hasEmailOrPhone = contactLines.some(line => {
      const text = combineLineText(line);
      return /[\w.-]+@[\w.-]+\.\w+/.test(text) || /[\d\s()+-]{10,}/.test(text);
    });
    
    if (hasEmailOrPhone) {
      const contactTextRuns = contactLines.flat();
      contactSection = {
        id: `section-contact-${pageIndex}`,
        type: 'contact',
        title: 'Contact Information',
        items: contactLines.map((line, idx) => ({
          id: `item-contact-${pageIndex}-${idx}`,
          text: combineLineText(line),
          textRunIds: line.map(tr => tr.id),
          indent: 0,
          isBullet: false,
          isEdited: false,
        })),
        visible: true,
        order: sectionOrder++,
        collapsed: false,
        bounds: calculateBounds(contactTextRuns),
        titleStyle: {
          fontSize: contactTextRuns[0]?.fontSize || 12,
          fontFamily: contactTextRuns[0]?.fontFamily || 'Arial',
          fontWeight: contactTextRuns[0]?.fontWeight,
          color: contactTextRuns[0]?.color || '#000000',
        },
      };
      sections.push(contactSection);
    }
    
    // Process remaining lines
    const startIdx = hasEmailOrPhone ? Math.min(5, lines.length) : 0;
    
    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      const lineText = combineLineText(line);
      const firstTextRun = line[0];
      
      if (!lineText.trim()) continue;
      
      // Check if this is a section header
      const isHeader = isSectionHeader(firstTextRun, pageTextRuns);
      const sectionType = detectSectionType(lineText);
      
      if (isHeader || (sectionType !== 'other' && lineText.split(/\s+/).length <= 4)) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          id: `section-${sectionType}-${pageIndex}-${i}`,
          type: sectionType,
          title: lineText,
          items: [],
          visible: true,
          order: sectionOrder++,
          collapsed: false,
          bounds: calculateBounds(line),
          titleStyle: {
            fontSize: firstTextRun.fontSize,
            fontFamily: firstTextRun.fontFamily,
            fontWeight: firstTextRun.fontWeight,
            color: firstTextRun.color,
          },
        };
      } else if (currentSection) {
        // Add as item to current section
        const isBullet = isBulletPoint(firstTextRun);
        const indent = isBullet ? 2 : (firstTextRun.x > 50 ? 1 : 0);
        
        currentSection.items.push({
          id: `item-${currentSection.type}-${pageIndex}-${i}`,
          text: lineText,
          textRunIds: line.map(tr => tr.id),
          indent,
          isBullet,
          isEdited: false,
        });
        
        // Update bounds
        const allTextRuns = [...line, ...currentSection.items.flatMap(item => 
          item.textRunIds.map(id => pageTextRuns.find(tr => tr.id === id)).filter(Boolean) as TextRun[]
        )];
        currentSection.bounds = calculateBounds(allTextRuns);
      }
    }
    
    // Add last section
    if (currentSection) {
      sections.push(currentSection);
    }
  }
  
  // If no sections were detected, create a single "other" section
  if (sections.length === 0 && textRuns.length > 0) {
    const lines = groupTextRunsByLine(textRuns);
    sections.push({
      id: 'section-other-0',
      type: 'other',
      title: 'Resume Content',
      items: lines.map((line, idx) => ({
        id: `item-other-${idx}`,
        text: combineLineText(line),
        textRunIds: line.map(tr => tr.id),
        indent: 0,
        isBullet: isBulletPoint(line[0]),
        isEdited: false,
      })),
      visible: true,
      order: 0,
      collapsed: false,
      bounds: calculateBounds(textRuns),
      titleStyle: {
        fontSize: textRuns[0]?.fontSize || 12,
        fontFamily: textRuns[0]?.fontFamily || 'Arial',
        color: textRuns[0]?.color || '#000000',
      },
    });
  }
  
  return sections.sort((a, b) => a.order - b.order);
}

/**
 * Merge sections of the same type
 */
export function mergeSectionsByType(sections: ResumeSection[]): ResumeSection[] {
  const merged = new Map<SectionType, ResumeSection>();
  
  for (const section of sections) {
    if (merged.has(section.type)) {
      const existing = merged.get(section.type)!;
      existing.items.push(...section.items);
      // Update bounds to encompass both
      existing.bounds = {
        pageIndex: Math.min(existing.bounds.pageIndex, section.bounds.pageIndex),
        x: Math.min(existing.bounds.x, section.bounds.x),
        y: Math.min(existing.bounds.y, section.bounds.y),
        width: Math.max(existing.bounds.width, section.bounds.width),
        height: existing.bounds.height + section.bounds.height,
      };
    } else {
      merged.set(section.type, { ...section });
    }
  }
  
  return Array.from(merged.values()).sort((a, b) => a.order - b.order);
}

/**
 * Reorder sections
 */
export function reorderSections(sections: ResumeSection[], newOrder: string[]): ResumeSection[] {
  const sectionMap = new Map(sections.map(s => [s.id, s]));
  
  return newOrder
    .map((id, index) => {
      const section = sectionMap.get(id);
      if (section) {
        return { ...section, order: index };
      }
      return null;
    })
    .filter(Boolean) as ResumeSection[];
}

/**
 * Update section item content
 */
export function updateSectionItem(
  sections: ResumeSection[],
  sectionId: string,
  itemId: string,
  newText: string
): ResumeSection[] {
  return sections.map(section => {
    if (section.id !== sectionId) return section;
    
    return {
      ...section,
      items: section.items.map(item => {
        if (item.id !== itemId) return item;
        
        return {
          ...item,
          text: newText,
          isEdited: true,
          originalText: item.originalText || item.text,
        };
      }),
    };
  });
}

/**
 * Add new item to section
 */
export function addSectionItem(
  sections: ResumeSection[],
  sectionId: string,
  text: string,
  afterItemId?: string
): ResumeSection[] {
  return sections.map(section => {
    if (section.id !== sectionId) return section;
    
    const newItem: SectionItem = {
      id: `item-new-${Date.now()}`,
      text,
      textRunIds: [], // New items don't have text runs yet
      indent: 2,
      isBullet: true,
      isEdited: true,
      originalText: '',
    };
    
    if (afterItemId) {
      const idx = section.items.findIndex(item => item.id === afterItemId);
      const items = [...section.items];
      items.splice(idx + 1, 0, newItem);
      return { ...section, items };
    }
    
    return { ...section, items: [...section.items, newItem] };
  });
}

/**
 * Remove item from section
 */
export function removeSectionItem(
  sections: ResumeSection[],
  sectionId: string,
  itemId: string
): ResumeSection[] {
  return sections.map(section => {
    if (section.id !== sectionId) return section;
    
    return {
      ...section,
      items: section.items.filter(item => item.id !== itemId),
    };
  });
}

/**
 * Toggle section visibility
 */
export function toggleSectionVisibility(
  sections: ResumeSection[],
  sectionId: string
): ResumeSection[] {
  return sections.map(section => {
    if (section.id !== sectionId) return section;
    return { ...section, visible: !section.visible };
  });
}

/**
 * Toggle section collapsed state
 */
export function toggleSectionCollapsed(
  sections: ResumeSection[],
  sectionId: string
): ResumeSection[] {
  return sections.map(section => {
    if (section.id !== sectionId) return section;
    return { ...section, collapsed: !section.collapsed };
  });
}

/**
 * Get edited items for sync back to TextRuns
 */
export function getEditedItems(sections: ResumeSection[]): Array<{
  sectionId: string;
  itemId: string;
  newText: string;
  textRunIds: string[];
}> {
  const edits: Array<{
    sectionId: string;
    itemId: string;
    newText: string;
    textRunIds: string[];
  }> = [];
  
  for (const section of sections) {
    for (const item of section.items) {
      if (item.isEdited && item.textRunIds.length > 0) {
        edits.push({
          sectionId: section.id,
          itemId: item.id,
          newText: item.text,
          textRunIds: item.textRunIds,
        });
      }
    }
  }
  
  return edits;
}

/**
 * Calculate total content length (for one-page enforcement)
 */
export function calculateContentLength(sections: ResumeSection[]): number {
  return sections
    .filter(s => s.visible)
    .reduce((total, section) => {
      return total + section.title.length + section.items.reduce((sum, item) => sum + item.text.length, 0);
    }, 0);
}

/**
 * Estimate if content will fit on one page
 */
export function estimatePageCount(sections: ResumeSection[], charsPerPage = 3500): number {
  const totalChars = calculateContentLength(sections);
  return Math.ceil(totalChars / charsPerPage);
}
