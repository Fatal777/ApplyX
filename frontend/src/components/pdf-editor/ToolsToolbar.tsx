import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useDocumentStore } from '@/stores/documentStore';
import { ToolType } from '@/types/pdf';
import {
  Type as TypeIcon,
  Pencil as DrawIcon,
  Highlighter as HighlightIcon,
  RectangleHorizontal as RectIcon,
  Circle as CircleIcon,
  Eraser as EraserIcon,
  MousePointer as SelectIcon,
  Bold,
  Italic,
  Underline,
  Replace,
} from 'lucide-react';

interface ToolsToolbarProps {
  activeTool: ToolType;
  onChangeTool: (tool: ToolType) => void;
  drawColor: string;
  onChangeDrawColor: (color: string) => void;
  highlightColor: string;
  onChangeHighlightColor: (color: string) => void;
  fontSize: number;
  onChangeFontSize: (size: number) => void;
  fontFamily?: string;
  onChangeFontFamily?: (family: string) => void;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  onToggleBold?: () => void;
  onToggleItalic?: () => void;
  onToggleUnderline?: () => void;
}

const ToolsToolbar: React.FC<ToolsToolbarProps> = ({
  activeTool,
  onChangeTool,
  drawColor,
  onChangeDrawColor,
  highlightColor,
  onChangeHighlightColor,
  fontSize,
  onChangeFontSize,
  fontFamily,
  onChangeFontFamily,
  isBold,
  isItalic,
  isUnderline,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
}) => {
  const { replaceAllText } = useDocumentStore();
  const [findText, setFindText] = React.useState('');
  const [replaceText, setReplaceText] = React.useState('');

  const handleReplace = () => {
    if (!findText) return;
    replaceAllText(findText, replaceText);
    setFindText('');
    setReplaceText('');
  };

  return (
    <Card className="p-2 flex items-center gap-2">
      {/* Tool selection */}
      <div className="flex items-center gap-1">
        <Button variant={activeTool === 'select' ? 'default' : 'outline'} size="icon" title="Select" onClick={() => onChangeTool('select')}>
          <SelectIcon className="h-4 w-4" />
        </Button>
        <Button variant={activeTool === 'text' ? 'default' : 'outline'} size="icon" title="Text" onClick={() => onChangeTool('text')}>
          <TypeIcon className="h-4 w-4" />
        </Button>
        <Button variant={activeTool === 'highlight' ? 'default' : 'outline'} size="icon" title="Highlight" onClick={() => onChangeTool('highlight')}>
          <HighlightIcon className="h-4 w-4" />
        </Button>
        <Button variant={activeTool === 'draw' ? 'default' : 'outline'} size="icon" title="Draw" onClick={() => onChangeTool('draw')}>
          <DrawIcon className="h-4 w-4" />
        </Button>
        <Button variant={activeTool === 'rectangle' ? 'default' : 'outline'} size="icon" title="Rectangle" onClick={() => onChangeTool('rectangle')}>
          <RectIcon className="h-4 w-4" />
        </Button>
        <Button variant={activeTool === 'circle' ? 'default' : 'outline'} size="icon" title="Circle" onClick={() => onChangeTool('circle')}>
          <CircleIcon className="h-4 w-4" />
        </Button>
        <Button variant={activeTool === 'eraser' ? 'default' : 'outline'} size="icon" title="Eraser" onClick={() => onChangeTool('eraser')}>
          <EraserIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-200" />

      {/* Colors */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Ink</span>
        <input type="color" value={drawColor} onChange={(e) => onChangeDrawColor(e.target.value)} className="w-6 h-6 p-0 border rounded" title="Draw color" />
        <span className="text-xs text-gray-500 ml-2">Highlight</span>
        <input type="color" value={highlightColor} onChange={(e) => onChangeHighlightColor(e.target.value)} className="w-6 h-6 p-0 border rounded" title="Highlight color" />
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-200" />

      {/* Typography (for Text tool) */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Size</span>
        <Input
          type="number"
          min={8}
          max={96}
          value={fontSize}
          onChange={(e) => onChangeFontSize(Number(e.target.value) || 12)}
          className="w-16 h-8"
        />
        <Button variant={isBold ? 'default' : 'outline'} size="icon" title="Bold" onClick={onToggleBold}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button variant={isItalic ? 'default' : 'outline'} size="icon" title="Italic" onClick={onToggleItalic}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button variant={isUnderline ? 'default' : 'outline'} size="icon" title="Underline" onClick={onToggleUnderline}>
          <Underline className="h-4 w-4" />
        </Button>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-200" />

      {/* Find & Replace (linked to Text tool behavior) */}
      <div className="flex items-center gap-2">
        <Replace className="h-4 w-4 text-gray-500" />
        <Input placeholder="Find" value={findText} onChange={(e) => setFindText(e.target.value)} className="h-8 w-28" />
        <Input placeholder="Replace" value={replaceText} onChange={(e) => setReplaceText(e.target.value)} className="h-8 w-28" />
        <Button size="sm" onClick={handleReplace} disabled={!findText}>
          Replace
        </Button>
      </div>
    </Card>
  );
};

export default ToolsToolbar;
