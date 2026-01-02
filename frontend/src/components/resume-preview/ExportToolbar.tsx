/**
 * ExportToolbar Component
 * Toolbar with PDF export, template selection, and zoom controls
 */

import { useState } from "react";
import { Download, FileText, Loader2, ZoomIn, ZoomOut, RotateCcw, Layout } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useResumeBuilderStore } from "@/store/resumeBuilderStore";
import { exportResumeToPdf } from "@/utils/pdfExport";
import { cn } from "@/lib/utils";
import { TEMPLATES } from "./templates";

interface ExportToolbarProps {
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onResetZoom?: () => void;
    zoom?: number;
}

const ExportToolbar = ({
    onZoomIn,
    onZoomOut,
    onResetZoom,
    zoom = 100,
}: ExportToolbarProps) => {
    const { activeDocument, setTemplate } = useResumeBuilderStore();
    const [isExporting, setIsExporting] = useState(false);

    const currentTemplateId = activeDocument?.templateId || "classic";
    const currentTemplate = TEMPLATES.find(t => t.id === currentTemplateId) || TEMPLATES[0];

    const handleExportPdf = async () => {
        if (!activeDocument) {
            toast.error("No resume to export");
            return;
        }

        setIsExporting(true);
        try {
            await exportResumeToPdf(activeDocument);
            toast.success("Resume exported successfully!");
        } catch (error) {
            console.error("Export failed:", error);
            toast.error("Failed to export resume");
        } finally {
            setIsExporting(false);
        }
    };

    const handleTemplateChange = (templateId: string) => {
        setTemplate(templateId);
        toast.success(`Switched to ${TEMPLATES.find(t => t.id === templateId)?.name} template`);
    };

    return (
        <div
            className={cn(
                "absolute bottom-4 left-1/2 -translate-x-1/2",
                "flex items-center gap-2 p-2 rounded-full",
                "bg-white dark:bg-neutral-900",
                "shadow-lg border border-gray-200 dark:border-neutral-800"
            )}
        >
            {/* Template Selection */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 px-3"
                        title="Change Template"
                    >
                        <Layout className="h-4 w-4" />
                        {currentTemplate.name}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                    <DropdownMenuLabel>Templates</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {TEMPLATES.map((template) => (
                        <DropdownMenuItem
                            key={template.id}
                            onClick={() => handleTemplateChange(template.id)}
                            className={cn(
                                currentTemplateId === template.id && "bg-primary/10"
                            )}
                        >
                            <span className="flex-1">{template.name}</span>
                            {currentTemplateId === template.id && (
                                <span className="text-primary">✓</span>
                            )}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-6 bg-gray-200 dark:bg-neutral-800" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 px-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onZoomOut}
                    className="h-8 w-8 p-0"
                    title="Zoom Out"
                >
                    <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[40px] text-center">
                    {zoom}%
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onZoomIn}
                    className="h-8 w-8 p-0"
                    title="Zoom In"
                >
                    <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onResetZoom}
                    className="h-8 w-8 p-0"
                    title="Reset Zoom"
                >
                    <RotateCcw className="h-4 w-4" />
                </Button>
            </div>

            <div className="w-px h-6 bg-gray-200 dark:bg-neutral-800" />

            {/* Export Button */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="default"
                        size="sm"
                        disabled={isExporting || !activeDocument}
                        className="gap-2"
                    >
                        {isExporting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4" />
                        )}
                        Export
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                    <DropdownMenuItem onClick={handleExportPdf}>
                        <FileText className="h-4 w-4 mr-2" />
                        Download PDF
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export default ExportToolbar;

