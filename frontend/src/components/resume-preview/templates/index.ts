/**
 * Resume Templates
 * Export all available resume templates
 */

export { default as ClassicTemplate } from "./ClassicTemplate";
export { default as ModernTemplate } from "./ModernTemplate";

// Template metadata for selector
export const TEMPLATES = [
    {
        id: "classic",
        name: "Classic",
        description: "Clean professional layout with sections stacked vertically",
        themeColor: "#1e40af",
    },
    {
        id: "modern",
        name: "Modern",
        description: "Contemporary design with a colored sidebar",
        themeColor: "#059669",
    },
];
