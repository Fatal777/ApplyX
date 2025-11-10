import { Tool } from './ToolInterface';
import { TextTool } from './TextTool';
import { DrawTool } from './DrawTool';
import { HighlightTool } from './HighlightTool';
import { RectangleTool, CircleTool } from './ShapeTools';
import { EraserTool } from './EraserTool';

export class ToolRegistry {
  private static tools: Map<string, Tool> = new Map();

  static initialize() {
    this.registerTool(new TextTool());
    this.registerTool(new DrawTool());
    this.registerTool(new HighlightTool());
    this.registerTool(new RectangleTool());
    this.registerTool(new CircleTool());
    this.registerTool(new EraserTool());
  }

  static registerTool(tool: Tool) {
    this.tools.set(tool.type, tool);
  }

  static getTool(type: string): Tool | undefined {
    return this.tools.get(type);
  }

  static getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  static getToolTypes(): string[] {
    return Array.from(this.tools.keys());
  }
}

// Initialize tools on module load
ToolRegistry.initialize();
