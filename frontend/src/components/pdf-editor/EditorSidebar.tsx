/**
 * Editor Sidebar Component
 * ========================
 * Right-panel UI for resume editing with:
 * - Report/Editor/Style tabs
 * - Draggable section cards
 * - Inline content editing
 * - Section visibility toggles
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  GripVertical,
  Edit3,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Check,
  X,
  FileText,
  Briefcase,
  GraduationCap,
  Code,
  Layers,
  Award,
  Star,
  Globe,
  User,
  MoreHorizontal,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Target,
  TrendingUp,
  Loader2,
  Link as LinkIcon,
  Calendar,
  MapPin,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  SectionType,
  SECTION_DISPLAY_NAMES,
  SECTION_COLORS,
} from '@/lib/resumeSectionExtractor';
import { ResumeSection, SectionItem } from '@/stores/documentStore';

// Section icon mapping
const SECTION_ICON_COMPONENTS: Record<SectionType, React.ReactNode> = {
  contact: <User className="w-4 h-4" />,
  summary: <FileText className="w-4 h-4" />,
  experience: <Briefcase className="w-4 h-4" />,
  education: <GraduationCap className="w-4 h-4" />,
  skills: <Code className="w-4 h-4" />,
  projects: <Layers className="w-4 h-4" />,
  certifications: <Award className="w-4 h-4" />,
  awards: <Star className="w-4 h-4" />,
  languages: <Globe className="w-4 h-4" />,
  other: <MoreHorizontal className="w-4 h-4" />,
};

// Props for the editor sidebar
interface EditorSidebarProps {
  sections: ResumeSection[];
  onSectionsReorder: (newOrder: ResumeSection[]) => void;
  onSectionToggle: (sectionId: string) => void;
  onSectionCollapse: (sectionId: string) => void;
  onItemUpdate: (sectionId: string, itemId: string, newText: string) => void;
  onItemAdd: (sectionId: string, text: string, afterItemId?: string) => void;
  onItemDelete: (sectionId: string, itemId: string) => void;
  onSectionDelete: (sectionId: string) => void;
  atsScore?: {
    overall: number;
    keywords: number;
    formatting: number;
    sections: number;
    length: number;
  };
  matchedKeywords?: string[];
  missingKeywords?: string[];
  suggestions?: Array<{
    id: string;
    text: string;
    impact: 'high' | 'medium' | 'low';
    applied: boolean;
  }>;
  onApplySuggestion?: (suggestionId: string) => void;
  isAnalyzing?: boolean;
  onAnalyze?: () => void;
  pageCount?: number;
  className?: string;
}

// Editable item component
const EditableItem = ({
  item,
  sectionId,
  onUpdate,
  onDelete,
  onAddBelow,
}: {
  item: SectionItem;
  sectionId: string;
  onUpdate: (text: string) => void;
  onDelete: () => void;
  onAddBelow: () => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [isHovered, setIsHovered] = useState(false);

  const handleSave = () => {
    if (editText.trim() !== item.text) {
      onUpdate(editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(item.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div
      className={cn(
        'group relative pl-4 py-1.5 rounded-md transition-colors',
        isEditing ? 'bg-blue-50' : 'hover:bg-gray-50',
        item.isEdited && 'border-l-2 border-green-500'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {item.isBullet && (
        <span className="absolute left-1 top-2.5 text-gray-400 text-xs">•</span>
      )}

      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[60px] text-sm resize-none"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} className="h-7">
              <Check className="w-3 h-3 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel} className="h-7">
              <X className="w-3 h-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p
            className={cn(
              'text-sm text-gray-700 pr-16 cursor-pointer',
              item.indent === 1 && 'font-medium',
              item.indent === 2 && 'text-gray-600'
            )}
            onClick={() => setIsEditing(true)}
          >
            {item.text}
          </p>

          {/* Action buttons on hover */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="absolute right-1 top-1 flex items-center gap-1"
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={onAddBelow}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add below</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={onDelete}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

// Section card component
const SectionCard = ({
  section,
  onToggle,
  onCollapse,
  onItemUpdate,
  onItemAdd,
  onItemDelete,
  onDelete,
}: {
  section: ResumeSection;
  onToggle: () => void;
  onCollapse: () => void;
  onItemUpdate: (itemId: string, newText: string) => void;
  onItemAdd: (text: string, afterItemId?: string) => void;
  onItemDelete: (itemId: string) => void;
  onDelete: () => void;
}) => {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemText, setNewItemText] = useState('');

  const handleAddItem = () => {
    if (newItemText.trim()) {
      onItemAdd(newItemText.trim());
      setNewItemText('');
      setIsAddingItem(false);
    }
  };

  const sectionColor = SECTION_COLORS[section.type];

  return (
    <Reorder.Item
      value={section}
      className="list-none"
      whileDrag={{ scale: 1.02, boxShadow: '0 8px 20px rgba(0,0,0,0.12)' }}
    >
      <Card
        className={cn(
          'transition-all',
          !section.visible && 'opacity-50',
          'hover:shadow-md'
        )}
      >
        <CardHeader className="p-3 pb-2">
          <div className="flex items-center gap-2">
            {/* Drag handle */}
            <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
              <GripVertical className="w-4 h-4" />
            </div>

            {/* Section icon with color */}
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: sectionColor }}
            >
              {SECTION_ICON_COMPONENTS[section.type]}
            </div>

            {/* Section title */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{section.title}</h4>
              <p className="text-xs text-muted-foreground">
                {section.items.length} items
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={onToggle}
                    >
                      {section.visible ? (
                        <Eye className="w-4 h-4 text-gray-600" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {section.visible ? 'Hide section' : 'Show section'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={onDelete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete section</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={onCollapse}
              >
                {section.collapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <AnimatePresence>
          {!section.collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="p-3 pt-0">
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {section.items.map((item) => (
                    <EditableItem
                      key={item.id}
                      item={item}
                      sectionId={section.id}
                      onUpdate={(text) => onItemUpdate(item.id, text)}
                      onDelete={() => onItemDelete(item.id)}
                      onAddBelow={() => onItemAdd('New item', item.id)}
                    />
                  ))}

                  {section.items.length === 0 && (
                    <p className="text-sm text-muted-foreground italic py-2">
                      No items in this section
                    </p>
                  )}
                </div>

                {/* Add new item */}
                {isAddingItem ? (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      placeholder="Enter new item..."
                      className="min-h-[60px] text-sm"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={handleAddItem} className="h-7">
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsAddingItem(false);
                          setNewItemText('');
                        }}
                        className="h-7"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsAddingItem(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Item
                  </Button>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </Reorder.Item>
  );
};

// Score gauge component
const ScoreGauge = ({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) => {
  const getColor = (s: number) => {
    if (s >= 80) return '#22c55e';
    if (s >= 60) return '#3b82f6';
    if (s >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getLabel = (s: number) => {
    if (s >= 80) return 'Excellent';
    if (s >= 60) return 'Good';
    if (s >= 40) return 'Fair';
    return 'Needs Work';
  };

  const radius = size === 'lg' ? 45 : size === 'md' ? 35 : 25;
  const stroke = size === 'lg' ? 8 : size === 'md' ? 6 : 4;
  const viewBox = (radius + stroke) * 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg
        width={viewBox}
        height={viewBox}
        className="transform -rotate-90"
      >
        <circle
          cx={radius + stroke}
          cy={radius + stroke}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={radius + stroke}
          cy={radius + stroke}
          r={radius}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn(
          'font-bold',
          size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-sm'
        )}>
          {Math.round(score)}
        </span>
        {size !== 'sm' && (
          <span className="text-[10px] text-muted-foreground">{getLabel(score)}</span>
        )}
      </div>
    </div>
  );
};

// Main EditorSidebar component
const EditorSidebar: React.FC<EditorSidebarProps> = ({
  sections,
  onSectionsReorder,
  onSectionToggle,
  onSectionCollapse,
  onItemUpdate,
  onItemAdd,
  onItemDelete,
  onSectionDelete,
  atsScore,
  matchedKeywords = [],
  missingKeywords = [],
  suggestions = [],
  onApplySuggestion,
  isAnalyzing = false,
  onAnalyze,
  pageCount = 1,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<'report' | 'editor' | 'style'>('editor');

  return (
    <div className={cn('flex flex-col h-full bg-white border-l', className)}>
      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as any)}
        className="flex-1 flex flex-col"
      >
        <div className="border-b px-4 pt-3">
          <TabsList className="w-full">
            <TabsTrigger value="report" className="flex-1 text-xs">
              Report
            </TabsTrigger>
            <TabsTrigger value="editor" className="flex-1 text-xs">
              Editor
            </TabsTrigger>
            <TabsTrigger value="style" className="flex-1 text-xs">
              Style
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          {/* Report Tab */}
          <TabsContent value="report" className="m-0 p-4 space-y-4">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Analyzing resume...</p>
              </div>
            ) : atsScore ? (
              <>
                {/* Overall Score */}
                <div className="text-center pb-4 border-b">
                  <ScoreGauge score={atsScore.overall} size="lg" />
                  <p className="text-sm font-medium mt-2">ATS Compatibility Score</p>
                </div>

                {/* Score Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Score Breakdown
                  </h4>
                  {[
                    { label: 'Keywords', value: atsScore.keywords, icon: <Target className="w-3 h-3" /> },
                    { label: 'Formatting', value: atsScore.formatting, icon: <FileText className="w-3 h-3" /> },
                    { label: 'Sections', value: atsScore.sections, icon: <Layers className="w-3 h-3" /> },
                    { label: 'Length', value: atsScore.length, icon: <TrendingUp className="w-3 h-3" /> },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className="text-muted-foreground">{item.icon}</span>
                      <span className="text-xs flex-1">{item.label}</span>
                      <Progress value={item.value} className="w-16 h-1.5" />
                      <span className="text-xs font-medium w-8 text-right">{item.value}%</span>
                    </div>
                  ))}
                </div>

                {/* Keywords */}
                {(matchedKeywords.length > 0 || missingKeywords.length > 0) && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Keywords
                    </h4>

                    {matchedKeywords.length > 0 && (
                      <div>
                        <p className="text-xs text-green-600 mb-2 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Matched ({matchedKeywords.length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {matchedKeywords.slice(0, 8).map((kw) => (
                            <Badge key={kw} variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {missingKeywords.length > 0 && (
                      <div>
                        <p className="text-xs text-orange-600 mb-2 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Missing ({missingKeywords.length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {missingKeywords.slice(0, 8).map((kw) => (
                            <Badge key={kw} variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                              + {kw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      AI Suggestions
                    </h4>
                    <div className="space-y-2">
                      {suggestions.map((sug) => (
                        <div
                          key={sug.id}
                          className={cn(
                            'p-2 rounded-lg border text-xs',
                            sug.applied
                              ? 'bg-green-50 border-green-200'
                              : 'bg-white border-gray-200'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="flex-1">{sug.text}</p>
                            {!sug.applied && onApplySuggestion && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-primary"
                                onClick={() => onApplySuggestion(sug.id)}
                              >
                                Apply
                              </Button>
                            )}
                            {sug.applied && (
                              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              'mt-1 text-[9px]',
                              sug.impact === 'high' && 'bg-green-50 text-green-700',
                              sug.impact === 'medium' && 'bg-blue-50 text-blue-700',
                              sug.impact === 'low' && 'bg-gray-50 text-gray-700'
                            )}
                          >
                            {sug.impact.toUpperCase()} IMPACT
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {onAnalyze && (
                  <Button variant="outline" className="w-full" onClick={onAnalyze}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Re-analyze
                  </Button>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Target className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a resume to see analysis
                </p>
                {onAnalyze && (
                  <Button onClick={onAnalyze}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze Resume
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          {/* Editor Tab - Section Reordering */}
          <TabsContent value="editor" className="m-0 p-4">
            {sections.length > 0 ? (
              <div className="space-y-4">
                {/* Page count warning */}
                {pageCount > 1 && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      Multi-page Resume
                    </div>
                    <p className="text-xs">
                      Your resume has {pageCount} pages. Single-page resumes perform better with ATS systems.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Resume Sections
                  </h4>
                  <Badge variant="outline" className="text-[10px]">
                    {sections.filter((s) => s.visible).length} visible
                  </Badge>
                </div>

                <Reorder.Group
                  axis="y"
                  values={sections}
                  onReorder={onSectionsReorder}
                  className="space-y-3"
                >
                  {sections.map((section) => (
                    <SectionCard
                      key={section.id}
                      section={section}
                      onToggle={() => onSectionToggle(section.id)}
                      onCollapse={() => onSectionCollapse(section.id)}
                      onItemUpdate={(itemId, text) => onItemUpdate(section.id, itemId, text)}
                      onItemAdd={(text, afterId) => onItemAdd(section.id, text, afterId)}
                      onItemDelete={(itemId) => onItemDelete(section.id, itemId)}
                      onDelete={() => onSectionDelete(section.id)}
                    />
                  ))}
                </Reorder.Group>

                <p className="text-xs text-muted-foreground text-center pt-2">
                  Drag sections to reorder • Click items to edit
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <Layers className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Upload a resume to edit sections
                </p>
              </div>
            )}
          </TabsContent>

          {/* Style Tab */}
          <TabsContent value="style" className="m-0 p-4">
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                ATS Templates
              </h4>

              <div className="grid grid-cols-1 gap-3">
                {/* Classic Template */}
                <Card className="cursor-pointer hover:border-primary transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-16 bg-gray-100 rounded border-2 border-gray-200 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <h5 className="font-medium text-sm">Classic ATS</h5>
                        <p className="text-xs text-muted-foreground">
                          Traditional format, high ATS compatibility
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Modern Template */}
                <Card className="cursor-pointer hover:border-primary transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded border-2 border-primary/20 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h5 className="font-medium text-sm">Modern ATS</h5>
                        <p className="text-xs text-muted-foreground">
                          Contemporary design, ATS optimized
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Font settings placeholder */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Typography
                </h4>
                <p className="text-xs text-muted-foreground italic">
                  Font customization coming soon
                </p>
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export default EditorSidebar;
