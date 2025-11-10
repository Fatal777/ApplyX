export type ToolType = 'select' | 'text' | 'highlight' | 'draw' | 'rectangle' | 'circle' | 'line' | 'eraser';

export interface Annotation {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  color: string;
  page: number;
  points?: number[];
}
