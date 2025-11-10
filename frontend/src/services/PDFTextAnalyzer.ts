import * as pdfjs from 'react-pdf';
import * as opentype from 'opentype.js';
import { getDocument } from 'pdfjs-dist';

export interface FontInfo {
  family: string;
  size: number;
  weight: 'normal' | 'bold';
  style: 'normal' | 'italic';
  color: string;
}

export interface TextBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  font: FontInfo;
}

export class PDFTextAnalyzer {
  private static pdfDocument: any = null;

  static async analyzePDF(pdfData: string): Promise<TextBlock[]> {
    try {
      const loadingTask = getDocument(pdfData);
      const pdf = await loadingTask.promise;
      this.pdfDocument = pdf;

      const textBlocks: TextBlock[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });

        const blocks = this.processTextContent(textContent, viewport, pageNum);
        textBlocks.push(...blocks);
      }

      return textBlocks;
    } catch (error) {
      console.error('Error analyzing PDF:', error);
      return [];
    }
  }

  static detectFontAtPosition(x: number, y: number, textBlocks: TextBlock[]): FontInfo | null {
    // Find the closest text block to the click position
    let closestBlock: TextBlock | null = null;
    let minDistance = Infinity;

    for (const block of textBlocks) {
      const centerX = block.x + block.width / 2;
      const centerY = block.y + block.height / 2;
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

      if (distance < minDistance && distance < 50) { // 50px tolerance
        minDistance = distance;
        closestBlock = block;
      }
    }

    return closestBlock ? closestBlock.font : null;
  }

  private static processTextContent(textContent: any, viewport: any, pageNum: number): TextBlock[] {
    const blocks: TextBlock[] = [];

    // Group text items by their transform and style
    const textGroups: { [key: string]: any[] } = {};

    textContent.items.forEach((item: any) => {
      const transform = item.transform.join(',');
      const fontName = item.fontName;
      const fontSize = item.height;

      const key = `${transform}-${fontName}-${fontSize}`;

      if (!textGroups[key]) {
        textGroups[key] = [];
      }

      textGroups[key].push(item);
    });

    // Process each group into text blocks
    Object.values(textGroups).forEach(group => {
      if (group.length === 0) return;

      const firstItem = group[0];
      const fontInfo = this.extractFontInfo(firstItem);

      // Calculate bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      group.forEach((item: any) => {
        const [scaleX, skewX, skewY, scaleY, translateX, translateY] = item.transform;
        const width = item.width || (item.str.length * item.height * 0.6); // Estimate width

        minX = Math.min(minX, translateX);
        minY = Math.min(minY, translateY);
        maxX = Math.max(maxX, translateX + width);
        maxY = Math.max(maxY, translateY + item.height);
      });

      const text = group.map(item => item.str).join('');

      blocks.push({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        text,
        font: fontInfo
      });
    });

    return blocks;
  }

  private static extractFontInfo(item: any): FontInfo {
    const fontName = item.fontName || '';
    const fontSize = Math.abs(item.height) || 12;

    // Enhanced font family extraction
    let family = 'Arial'; // Default fallback

    // Clean up font name - remove common prefixes and suffixes
    let cleanFontName = fontName.replace(/^[A-Z]{6}\+/g, '') // Remove PDF font prefixes like ABCDEF+
                               .replace(/[,].*$/g, '') // Remove anything after comma
                               .replace(/[-_]\w+$/g, '') // Remove style suffixes
                               .replace(/\d+$/g, '') // Remove trailing numbers
                               .trim();

    // Common PDF font name mappings to web fonts
    const fontMappings: { [key: string]: string } = {
      'TimesNewRoman': 'Times New Roman',
      'TimesNewRomanPS': 'Times New Roman',
      'Times-Roman': 'Times New Roman',
      'Times-Bold': 'Times New Roman',
      'Times-Italic': 'Times New Roman',
      'Times-BoldItalic': 'Times New Roman',

      'Helvetica': 'Helvetica',
      'Helvetica-Bold': 'Helvetica',
      'Helvetica-Oblique': 'Helvetica',
      'Helvetica-BoldOblique': 'Helvetica',

      'Courier': 'Courier New',
      'CourierNew': 'Courier New',
      'Courier-Bold': 'Courier New',
      'Courier-Oblique': 'Courier New',
      'Courier-BoldOblique': 'Courier New',

      'ArialMT': 'Arial',
      'Arial-BoldMT': 'Arial',
      'Arial-ItalicMT': 'Arial',
      'Arial-BoldItalicMT': 'Arial',

      'Georgia': 'Georgia',
      'Georgia-Bold': 'Georgia',
      'Georgia-Italic': 'Georgia',
      'Georgia-BoldItalic': 'Georgia',

      'Verdana': 'Verdana',
      'Verdana-Bold': 'Verdana',
      'Verdana-Italic': 'Verdana',
      'Verdana-BoldItalic': 'Verdana',

      'Tahoma': 'Tahoma',
      'Tahoma-Bold': 'Tahoma',

      'TrebuchetMS': 'Trebuchet MS',
      'TrebuchetMS-Bold': 'Trebuchet MS',
      'TrebuchetMS-Italic': 'Trebuchet MS',
      'TrebuchetMS-BoldItalic': 'Trebuchet MS'
    };

    // Check for exact matches in mappings
    if (fontMappings[cleanFontName]) {
      family = fontMappings[cleanFontName];
    } else {
      // Try to find partial matches
      for (const [pdfFont, webFont] of Object.entries(fontMappings)) {
        if (cleanFontName.includes(pdfFont.replace(/[-_]/g, ''))) {
          family = webFont;
          break;
        }
      }

      // If no match found, try common font name patterns
      if (cleanFontName.toLowerCase().includes('times')) {
        family = 'Times New Roman';
      } else if (cleanFontName.toLowerCase().includes('arial')) {
        family = 'Arial';
      } else if (cleanFontName.toLowerCase().includes('helvetica') || cleanFontName.toLowerCase().includes('helv')) {
        family = 'Helvetica';
      } else if (cleanFontName.toLowerCase().includes('courier')) {
        family = 'Courier New';
      } else if (cleanFontName.toLowerCase().includes('georgia')) {
        family = 'Georgia';
      } else if (cleanFontName.toLowerCase().includes('verdana')) {
        family = 'Verdana';
      } else if (cleanFontName.toLowerCase().includes('tahoma')) {
        family = 'Tahoma';
      } else if (cleanFontName.toLowerCase().includes('trebuchet')) {
        family = 'Trebuchet MS';
      }
    }

    // Detect font weight and style from font name patterns
    const lowerFontName = fontName.toLowerCase();
    const cleanLowerName = cleanFontName.toLowerCase();

    const isBold = lowerFontName.includes('bold') ||
                   lowerFontName.includes('black') ||
                   lowerFontName.includes('heavy') ||
                   lowerFontName.includes('extrabold') ||
                   cleanLowerName.includes('bd') ||
                   cleanLowerName.includes('bold');

    const isItalic = lowerFontName.includes('italic') ||
                     lowerFontName.includes('oblique') ||
                     cleanLowerName.includes('it') ||
                     cleanLowerName.includes('italic') ||
                     cleanLowerName.includes('oblique');

    return {
      family: family || 'Arial',
      size: Math.round(Math.max(6, Math.min(128, fontSize))), // Clamp between 6-128pt
      weight: isBold ? 'bold' : 'normal',
      style: isItalic ? 'italic' : 'normal',
      color: '#000000' // Default black, could be enhanced to detect actual color
    };
  }
}
