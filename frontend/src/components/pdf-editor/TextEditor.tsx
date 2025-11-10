import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Bold, 
  Italic, 
  Underline, 
  Type, 
  Palette,
  Check,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify
} from 'lucide-react';
import { TextRun } from '@/stores/documentStore';
import { useDocumentStore } from '@/stores/documentStore';
import FontSelector from './FontSelector';
import { ChromePicker } from 'react-color';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TextEditorProps {
  textRun: TextRun | null;
  onClose?: () => void;
  className?: string;
}

const TextEditor: React.FC<TextEditorProps> = ({ 
  textRun, 
  onClose,
  className = '' 
}) => {
  const { updateTextRun, addEditOperation } = useDocumentStore();
  const [editedText, setEditedText] = useState('');
  const [fontSize, setFontSize] = useState(12);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontWeight, setFontWeight] = useState<string>('normal');
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal');
  const [textDecoration, setTextDecoration] = useState<'none' | 'underline'>('none');
  const [color, setColor] = useState('#000000');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize with text run data
  useEffect(() => {
    if (textRun) {
      setEditedText(textRun.text);
      setFontSize(textRun.fontSize);
      setFontFamily(textRun.fontFamily);
      setFontWeight(textRun.fontWeight || 'normal');
      setFontStyle(textRun.fontStyle || 'normal');
      setColor(textRun.color);
    }
  }, [textRun]);

  // Focus textarea when opened
  useEffect(() => {
    if (textRun && textAreaRef.current) {
      textAreaRef.current.focus();
      textAreaRef.current.select();
    }
  }, [textRun]);

  const handleSave = () => {
    if (!textRun) return;

    // Update the text run
    updateTextRun(textRun.pageIndex, textRun.id, {
      text: editedText,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      color,
      isEdited: true,
    });

    // Add edit operation
    addEditOperation({
      pageIndex: textRun.pageIndex,
      textRunId: textRun.id,
      originalText: textRun.originalText || textRun.text,
      newText: editedText,
      fontFamily,
      fontSize,
      fontWeight,
      fontStyle,
      color,
    });

    onClose?.();
  };

  const handleCancel = () => {
    onClose?.();
  };

  const toggleBold = () => {
    setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold');
  };

  const toggleItalic = () => {
    setFontStyle(fontStyle === 'italic' ? 'normal' : 'italic');
  };

  const toggleUnderline = () => {
    setTextDecoration(textDecoration === 'underline' ? 'none' : 'underline');
  };

  if (!textRun) {
    return null;
  }

  return (
    <Card className={`p-4 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Type className="w-5 h-5" />
          Edit Text
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Text Content */}
      <div>
        <Label htmlFor="text-content">Text Content</Label>
        <Textarea
          ref={textAreaRef}
          id="text-content"
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className="mt-1 min-h-[100px]"
          style={{
            fontFamily,
            fontSize: `${fontSize}px`,
            fontWeight,
            fontStyle,
            textDecoration,
            color,
          }}
        />
      </div>

      {/* Font Controls */}
      <div className="space-y-3">
        {/* Font Family */}
        <div>
          <Label>Font Family</Label>
          <FontSelector
            value={fontFamily}
            onChange={setFontFamily}
            className="mt-1"
          />
        </div>

        {/* Font Size */}
        <div>
          <Label>Font Size: {fontSize}px</Label>
          <Slider
            value={[fontSize]}
            onValueChange={([value]) => setFontSize(value)}
            min={8}
            max={72}
            step={1}
            className="mt-1"
          />
        </div>

        {/* Style Buttons */}
        <div className="flex gap-2">
          <Button
            variant={fontWeight === 'bold' ? 'default' : 'outline'}
            size="sm"
            onClick={toggleBold}
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            variant={fontStyle === 'italic' ? 'default' : 'outline'}
            size="sm"
            onClick={toggleItalic}
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            variant={textDecoration === 'underline' ? 'default' : 'outline'}
            size="sm"
            onClick={toggleUnderline}
          >
            <Underline className="w-4 h-4" />
          </Button>
        </div>

        {/* Text Alignment */}
        <div>
          <Label>Text Alignment</Label>
          <div className="flex gap-2 mt-1">
            <Button
              variant={textAlign === 'left' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTextAlign('left')}
            >
              <AlignLeft className="w-4 h-4" />
            </Button>
            <Button
              variant={textAlign === 'center' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTextAlign('center')}
            >
              <AlignCenter className="w-4 h-4" />
            </Button>
            <Button
              variant={textAlign === 'right' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTextAlign('right')}
            >
              <AlignRight className="w-4 h-4" />
            </Button>
            <Button
              variant={textAlign === 'justify' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTextAlign('justify')}
            >
              <AlignJustify className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Color Picker */}
        <div>
          <Label>Text Color</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 mt-1"
              >
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: color }}
                />
                <span>{color}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <ChromePicker
                color={color}
                onChange={(newColor) => setColor(newColor.hex)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          variant="outline"
          onClick={handleCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className="flex-1"
        >
          <Check className="w-4 h-4 mr-2" />
          Apply Changes
        </Button>
      </div>
    </Card>
  );
};

export default TextEditor;