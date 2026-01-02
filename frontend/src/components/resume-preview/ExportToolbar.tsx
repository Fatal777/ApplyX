/**
 * ExportToolbar Component
 * Toolbar with PDF export and other actions for the resume preview
 */

import { useState } from "react";
import { Download, FileText, Loader2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useResumeBuilderStore } from "@/store/resumeBuilderStore";
import { exportResumeToPdf } from "@/utils/pdfExport";
import { cn } from "@/lib/utils";

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
    const { activeDocument } = useResumeBuilderStore();
    const [isExporting, setIsExporting] = useState(false);

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

    return (
        <div
            className={cn(
                "absolute bottom-4 left-1/2 -translate-x-1/2",
                "flex items-center gap-2 p-2 rounded-full",
                "bg-white dark:bg-neutral-900",
                "shadow-lg border border-gray-200 dark:border-neutral-800"
            )}
        >
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 px-2 border-r border-gray-200 dark:border-neutral-800">
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
