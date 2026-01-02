/**
 * PDF Export Utility
 * Export resume to PDF using html2pdf.js
 */

import html2pdf from "html2pdf.js";
import { ResumeDocument } from "@/types/resumeBuilder";

interface ExportOptions {
    filename?: string;
    margin?: number;
    pageSize?: "a4" | "letter";
    orientation?: "portrait" | "landscape";
}

/**
 * Export resume preview element to PDF
 */
export const exportToPdf = async (
    elementId: string = "resume-preview",
    options: ExportOptions = {}
): Promise<void> => {
    const element = document.getElementById(elementId);

    if (!element) {
        throw new Error(`Element with id "${elementId}" not found`);
    }

    const {
        filename = "resume.pdf",
        margin = 0,
        pageSize = "a4",
        orientation = "portrait",
    } = options;

    const opt = {
        margin,
        filename,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
        },
        jsPDF: {
            unit: "mm" as const,
            format: pageSize,
            orientation
        },
    };

    try {
        await html2pdf().set(opt).from(element).save();
    } catch (error) {
        console.error("Error exporting to PDF:", error);
        throw error;
    }
};

/**
 * Export with resume data (for filename)
 */
export const exportResumeToPdf = async (
    document: ResumeDocument,
    options: ExportOptions = {}
): Promise<void> => {
    const filename = options.filename ||
        `${document.title.replace(/[^a-z0-9]/gi, "_")}_resume.pdf`;

    await exportToPdf("resume-preview", { ...options, filename });
};

/**
 * Get PDF as Blob (for upload or preview)
 */
export const getPdfBlob = async (
    elementId: string = "resume-preview",
    options: ExportOptions = {}
): Promise<Blob> => {
    const element = document.getElementById(elementId);

    if (!element) {
        throw new Error(`Element with id "${elementId}" not found`);
    }

    const {
        margin = 0,
        pageSize = "a4",
        orientation = "portrait",
    } = options;

    const opt = {
        margin,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
        },
        jsPDF: {
            unit: "mm" as const,
            format: pageSize,
            orientation
        },
    };

    return await html2pdf().set(opt).from(element).outputPdf("blob");
};

export default exportToPdf;
