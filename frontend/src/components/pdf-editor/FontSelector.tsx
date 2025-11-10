import React, { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDocumentStore } from '@/stores/documentStore';
import { FontManager } from '@/lib/font-manager';
import { Font } from '@/stores/documentStore';

interface FontSelectorProps {
  value: string;
  onChange: (font: string) => void;
  className?: string;
  showDetectedFonts?: boolean;
}

const FontSelector: React.FC<FontSelectorProps> = ({
  value,
  onChange,
  className = '',
  showDetectedFonts = true,
}) => {
  const { fonts } = useDocumentStore();
  const [availableFonts, setAvailableFonts] = useState<Font[]>([]);

  useEffect(() => {
    // Initialize font manager and get available fonts
    FontManager.initialize().then(() => {
      const systemFonts = FontManager.getAvailableFonts();
      setAvailableFonts(systemFonts);
    });
  }, []);

  // Separate fonts into categories
  const detectedFonts = showDetectedFonts ? fonts.filter(f => f.isEmbedded) : [];
  const standardFonts = availableFonts.filter(f => f.isStandard);
  const webFonts = availableFonts.filter(f => !f.isStandard);

  const renderFontPreview = (font: Font) => (
    <div 
      style={{ fontFamily: font.family }}
      className="flex items-center justify-between"
    >
      <span>{font.family}</span>
      <span className="text-sm text-gray-500 ml-2" style={{ fontFamily: font.family }}>
        Aa Bb Cc
      </span>
    </div>
  );

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select a font">
          <span style={{ fontFamily: value }}>{value}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {/* Detected PDF Fonts */}
        {showDetectedFonts && detectedFonts.length > 0 && (
          <SelectGroup>
            <SelectLabel>Document Fonts</SelectLabel>
            {detectedFonts.map((font) => (
              <SelectItem key={font.family} value={font.family}>
                {renderFontPreview(font)}
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {/* Standard System Fonts */}
        {standardFonts.length > 0 && (
          <SelectGroup>
            <SelectLabel>Standard Fonts</SelectLabel>
            {standardFonts.map((font) => (
              <SelectItem key={font.family} value={font.family}>
                {renderFontPreview(font)}
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {/* Web Fonts */}
        {webFonts.length > 0 && (
          <SelectGroup>
            <SelectLabel>Web Fonts</SelectLabel>
            {webFonts.map((font) => (
              <SelectItem key={font.family} value={font.family}>
                {renderFontPreview(font)}
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {/* Fallback options if no fonts detected */}
        {!detectedFonts.length && !standardFonts.length && !webFonts.length && (
          <SelectGroup>
            <SelectLabel>Default Fonts</SelectLabel>
            {['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'].map((fontName) => (
              <SelectItem key={fontName} value={fontName}>
                <span style={{ fontFamily: fontName }}>{fontName}</span>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
};

export default FontSelector;