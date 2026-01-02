/**
 * ResumePreview Component
 * Renders a live preview of the resume with A4 paper styling
 */

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useResumeBuilderStore } from "@/store/resumeBuilderStore";
import ClassicTemplate from "./templates/ClassicTemplate";

const ResumePreview = () => {
    const { activeDocument } = useResumeBuilderStore();
    const previewRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    if (!activeDocument) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <p>Select or create a resume to preview</p>
            </div>
        );
    }

    const { styleSettings } = activeDocument;

    return (
        <div
            ref={previewRef}
            className="relative w-full h-full bg-gray-200 dark:bg-neutral-900 overflow-auto"
        >
            {/* Centered A4 Paper */}
            <div className="py-8 px-4 flex justify-center">
                <div
                    ref={contentRef}
                    id="resume-preview"
                    className={cn(
                        "w-[210mm] min-h-[297mm]",
                        "bg-white",
                        "shadow-xl",
                        "relative"
                    )}
                    style={{
                        padding: `${styleSettings?.pagePadding || 40}px`,
                        fontFamily: styleSettings?.fontFamily || "Inter, sans-serif",
                        fontSize: `${styleSettings?.baseFontSize || 14}px`,
                        lineHeight: styleSettings?.lineHeight || 1.5,
                    }}
                >
                    {/* Render template */}
                    <ClassicTemplate data={activeDocument} />
                </div>
            </div>
        </div>
    );
};

export default ResumePreview;
