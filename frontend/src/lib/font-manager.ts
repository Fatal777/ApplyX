import { Font } from '@/stores/documentStore';

/**
 * FontManager - Manages available fonts for the PDF editor
 * Handles both standard PDF fonts and web fonts loaded via Google Fonts
 */
class FontManagerClass {
  private fonts: Font[] = [];
  private initialized = false;

  /**
   * Standard PDF fonts that are always available
   */
  private readonly standardFonts: Font[] = [
    {
      family: 'Helvetica',
      fullName: 'Helvetica',
      postscriptName: 'Helvetica',
      isStandard: true,
      isEmbedded: false,
      availableWeights: ['normal', 'bold'],
      availableStyles: ['normal', 'italic'],
    },
    {
      family: 'Times-Roman',
      fullName: 'Times Roman',
      postscriptName: 'Times-Roman',
      isStandard: true,
      isEmbedded: false,
      availableWeights: ['normal', 'bold'],
      availableStyles: ['normal', 'italic'],
    },
    {
      family: 'Courier',
      fullName: 'Courier',
      postscriptName: 'Courier',
      isStandard: true,
      isEmbedded: false,
      availableWeights: ['normal', 'bold'],
      availableStyles: ['normal', 'italic'],
    },
    {
      family: 'Symbol',
      fullName: 'Symbol',
      postscriptName: 'Symbol',
      isStandard: true,
      isEmbedded: false,
      availableWeights: ['normal'],
      availableStyles: ['normal'],
    },
    {
      family: 'ZapfDingbats',
      fullName: 'Zapf Dingbats',
      postscriptName: 'ZapfDingbats',
      isStandard: true,
      isEmbedded: false,
      availableWeights: ['normal'],
      availableStyles: ['normal'],
    },
  ];

  /**
   * Popular Google Fonts to load for the editor
   */
  private readonly googleFonts: string[] = [
    'Arial',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Poppins',
    'Oswald',
    'Raleway',
    'PT Sans',
    'Merriweather',
    'Nunito',
    'Playfair Display',
    'Ubuntu',
    'Libre Baskerville',
    'Source Sans Pro',
    'Inter',
  ];

  /**
   * Initialize the font manager and load web fonts
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Start with standard fonts
      this.fonts = [...this.standardFonts];

      // Load Google Fonts
      await this.loadGoogleFonts();

      // Check for system fonts (using CSS Font Loading API if available)
      if ('fonts' in document) {
        await this.loadSystemFonts();
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize FontManager:', error);
      // Fallback to just standard fonts
      this.fonts = [...this.standardFonts];
      this.initialized = true;
    }
  }

  /**
   * Load Google Fonts dynamically
   */
  private async loadGoogleFonts(): Promise<void> {
    try {
      // Create a link element for Google Fonts
      // Using Google Fonts API v2 with proper format
      const fontFamilies = this.googleFonts.map(font => 
        `family=${encodeURIComponent(font)}:wght@400;700&family=${encodeURIComponent(font)}:ital,wght@1,400;1,700`
      ).join('&');

      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`;
      link.rel = 'stylesheet';
      
      // Wait for fonts to load
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          // Don't reject, just resolve after timeout
          console.warn('Google Fonts loading timed out, continuing with fallback fonts');
          resolve();
        }, 5000); // 5 second timeout

        link.onload = () => {
          clearTimeout(timeout);
          resolve();
        };
        link.onerror = () => {
          clearTimeout(timeout);
          console.warn('Failed to load Google Fonts, continuing with fallback fonts');
          resolve(); // Resolve instead of reject to not break initialization
        };
        document.head.appendChild(link);
      });

      // Add Google Fonts to available fonts
      this.googleFonts.forEach(family => {
        this.fonts.push({
          family,
          fullName: family,
          postscriptName: family.replace(/ /g, ''),
          isStandard: false,
          isEmbedded: false,
          availableWeights: ['400', '700'],
          availableStyles: ['normal', 'italic'],
        });
      });
    } catch (error) {
      console.warn('Failed to load Google Fonts:', error);
      // Don't throw, just continue with standard fonts
    }
  }

  /**
   * Detect and load system fonts
   */
  private async loadSystemFonts(): Promise<void> {
    try {
      // Check common system fonts
      const commonSystemFonts = [
        'Arial',
        'Georgia',
        'Verdana',
        'Tahoma',
        'Trebuchet MS',
        'Impact',
        'Comic Sans MS',
        'Arial Black',
        'Palatino',
        'Garamond',
        'Bookman',
        'Avant Garde',
      ];

      for (const fontFamily of commonSystemFonts) {
        // Skip if already added
        if (this.fonts.some(f => f.family === fontFamily)) {
          continue;
        }

        // Check if font is available
        if (await this.checkFontAvailability(fontFamily)) {
          this.fonts.push({
            family: fontFamily,
            fullName: fontFamily,
            postscriptName: fontFamily.replace(/ /g, ''),
            isStandard: false,
            isEmbedded: false,
            availableWeights: ['normal', 'bold'],
            availableStyles: ['normal', 'italic'],
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load system fonts:', error);
    }
  }

  /**
   * Check if a font is available on the system
   */
  private async checkFontAvailability(fontFamily: string): Promise<boolean> {
    try {
      // Use CSS Font Loading API
      if (typeof FontFace !== 'undefined') {
        try {
          const fontFace = new FontFace(
            fontFamily,
            `local("${fontFamily}")`
          );
          
          await fontFace.load();
          return true;
        } catch {
          // Font not available or error loading
          return false;
        }
      }

      // Fallback method: use canvas to detect font
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        return false;
      }

      const testString = 'abcdefghijklmnopqrstuvwxyz0123456789';
      const fontSize = '72px';
      const baseline = 'monospace';

      context.font = `${fontSize} ${baseline}`;
      const baselineWidth = context.measureText(testString).width;

      context.font = `${fontSize} "${fontFamily}", ${baseline}`;
      const fontWidth = context.measureText(testString).width;

      return baselineWidth !== fontWidth;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all available fonts
   */
  getAvailableFonts(): Font[] {
    if (!this.initialized) {
      console.warn('FontManager not initialized. Call initialize() first.');
      return [...this.standardFonts];
    }
    return [...this.fonts];
  }

  /**
   * Get standard PDF fonts only
   */
  getStandardFonts(): Font[] {
    return [...this.standardFonts];
  }

  /**
   * Find a font by family name
   */
  findFont(family: string): Font | undefined {
    return this.fonts.find(f => 
      f.family.toLowerCase() === family.toLowerCase() ||
      f.postscriptName?.toLowerCase() === family.toLowerCase() ||
      f.fullName?.toLowerCase() === family.toLowerCase()
    );
  }

  /**
   * Check if a font is available
   */
  isFontAvailable(family: string): boolean {
    return this.findFont(family) !== undefined;
  }

  /**
   * Get the closest matching font
   */
  getClosestFont(family: string): Font {
    const exactMatch = this.findFont(family);
    if (exactMatch) {
      return exactMatch;
    }

    // Try partial match
    const partialMatch = this.fonts.find(f => 
      f.family.toLowerCase().includes(family.toLowerCase()) ||
      family.toLowerCase().includes(f.family.toLowerCase())
    );

    if (partialMatch) {
      return partialMatch;
    }

    // Fallback to Helvetica
    return this.standardFonts[0];
  }

  /**
   * Register a custom font
   */
  registerFont(font: Font): void {
    // Check if font already exists
    if (!this.fonts.some(f => f.family === font.family)) {
      this.fonts.push(font);
    }
  }

  /**
   * Remove a custom font
   */
  removeFont(family: string): void {
    // Don't remove standard fonts
    const font = this.findFont(family);
    if (font && !font.isStandard) {
      this.fonts = this.fonts.filter(f => f.family !== family);
    }
  }

  /**
   * Reset to default fonts
   */
  reset(): void {
    this.fonts = [...this.standardFonts];
    this.initialized = false;
  }
}

// Export singleton instance
export const FontManager = new FontManagerClass();
