import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, Type } from 'lucide-react';
import WebFont from 'webfontloader';

interface TypographyControlsProps {
  fontFamily: string;
  setFontFamily: (font: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  isBold: boolean;
  setIsBold: (bold: boolean) => void;
  isItalic: boolean;
  setIsItalic: (italic: boolean) => void;
  isUnderline: boolean;
  setIsUnderline: (underline: boolean) => void;
  detectedFonts: string[];
}

// Comprehensive font list including popular Google Fonts
const GOOGLE_FONTS = [
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Raleway', 'Ubuntu', 'Nunito',
  'Inter', 'Work Sans', 'Playfair Display', 'Source Sans Pro', 'Quicksand', 'Fira Sans',
  'Oxygen', 'Karla', 'Libre Franklin', 'Cabin', 'Rubik', 'Hammersmith One', 'Comfortaa',
  'Space Grotesk', 'DM Sans', 'Barlow', 'Heebo', 'Outfit', 'Manrope', 'Plus Jakarta Sans',
  'Figtree', 'Lexend', 'Epilogue', 'Chivo', 'Readex Pro', 'Atkinson Hyperlegible',
  'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'IBM Plex Mono', 'Cascadia Code',
  'Victor Mono', 'Space Mono', 'Roboto Mono', 'Ubuntu Mono', 'Fira Mono'
];

const STANDARD_FONTS = [
  'Arial', 'Times New Roman', 'Helvetica', 'Courier New', 'Georgia', 'Verdana',
  'Tahoma', 'Trebuchet MS', 'Impact', 'Comic Sans MS', 'Lucida Console',
  'Palatino Linotype', 'Book Antiqua', 'Arial Black', 'Lucida Sans Unicode'
];

export const TypographyControls: React.FC<TypographyControlsProps> = ({
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  isBold,
  setIsBold,
  isItalic,
  setIsItalic,
  isUnderline,
  setIsUnderline,
  detectedFonts
}) => {
  useEffect(() => {
    // Load Google Fonts dynamically
    WebFont.load({
      google: {
        families: GOOGLE_FONTS
      },
      loading: () => {
        console.log('🎨 Loading Google Fonts...');
      },
      active: () => {
        console.log('✅ Google Fonts loaded successfully');
      },
      inactive: () => {
        console.log('⚠️ Google Fonts failed to load');
      }
    });
  }, []);

  // Combine all fonts: detected, Google Fonts, standard fonts
  const allFonts = [...new Set([...detectedFonts, ...GOOGLE_FONTS, ...STANDARD_FONTS])].sort();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Font Family Selector */}
      <select
        value={fontFamily}
        onChange={(e) => setFontFamily(e.target.value)}
        className="border rounded px-2 py-1 text-sm min-w-[140px]"
        style={{ fontFamily: fontFamily }}
      >
        <optgroup label="Detected Fonts">
          {detectedFonts.map(font => (
            <option key={font} value={font} style={{ fontFamily: font }}>
              {font}
            </option>
          ))}
        </optgroup>
        <optgroup label="Google Fonts">
          {GOOGLE_FONTS.filter(font => !detectedFonts.includes(font)).map(font => (
            <option key={font} value={font} style={{ fontFamily: font }}>
              {font}
            </option>
          ))}
        </optgroup>
        <optgroup label="System Fonts">
          {STANDARD_FONTS.filter(font => !detectedFonts.includes(font) && !GOOGLE_FONTS.includes(font)).map(font => (
            <option key={font} value={font} style={{ fontFamily: font }}>
              {font}
            </option>
          ))}
        </optgroup>
      </select>

      {/* Font Size */}
      <select
        value={fontSize}
        onChange={(e) => setFontSize(Number(e.target.value))}
        className="border rounded px-2 py-1 text-sm w-16"
      >
        {[6, 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 48, 56, 64, 72, 96, 128].map(size => (
          <option key={size} value={size}>{size}px</option>
        ))}
      </select>

      {/* Typography Buttons */}
      <div className="flex gap-1">
        <Button
          variant={isBold ? "default" : "outline"}
          size="sm"
          onClick={() => setIsBold(!isBold)}
          title="Bold"
          className="w-8 h-8 p-0"
        >
          <Bold className="w-4 h-4" />
        </Button>

        <Button
          variant={isItalic ? "default" : "outline"}
          size="sm"
          onClick={() => setIsItalic(!isItalic)}
          title="Italic"
          className="w-8 h-8 p-0"
        >
          <Italic className="w-4 h-4" />
        </Button>

        <Button
          variant={isUnderline ? "default" : "outline"}
          size="sm"
          onClick={() => setIsUnderline(!isUnderline)}
          title="Underline"
          className="w-8 h-8 p-0"
        >
          <Underline className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
