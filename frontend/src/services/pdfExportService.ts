/**
 * PDF Export Service
 * Uses pdf-lib to modify the original PDF with user edits
 */

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';

interface TextEdit {
    x: number;
    y: number;
    width: number;
    height: number;
    originalText: string;
    newText: string;
    fontSize: number;
}

/**
 * Apply text edits to a PDF and return the modified PDF bytes
 * 
 * Strategy: For each edit:
 * 1. Draw a white rectangle over the original text (mask it)
 * 2. Draw the new text at the same position
 * 
 * This is a simplified approach. For production, you'd need:
 * - Font matching
 * - Text wrapping for longer replacements
 * - Better positioning
 */
export async function applyEditsToFP(
    pdfBytes: ArrayBuffer,
    edits: TextEdit[]
): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    if (pages.length === 0) {
        throw new Error('PDF has no pages');
    }

    const firstPage = pages[0];
    const { height: pageHeight } = firstPage.getSize();

    // Embed a standard font (Helvetica is similar to most resume fonts)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const edit of edits) {
        // Skip if text hasn't changed
        if (edit.originalText === edit.newText) continue;

        // Convert from screen coordinates to PDF coordinates
        // PDF uses bottom-left origin, screen uses top-left
        const pdfY = pageHeight - edit.y - edit.height;

        // 1. Draw white rectangle to mask original text
        firstPage.drawRectangle({
            x: edit.x,
            y: pdfY,
            width: edit.width + 5, // Slight padding
            height: edit.height + 2,
            color: rgb(1, 1, 1), // White
        });

        // 2. Draw new text
        firstPage.drawText(edit.newText, {
            x: edit.x,
            y: pdfY + 2, // Small offset from bottom
            size: edit.fontSize,
            font,
            color: rgb(0, 0, 0), // Black
        });
    }

    // Save and return
    return pdfDoc.save();
}

/**
 * Download the modified PDF
 */
export function downloadPdf(bytes: Uint8Array, filename: string = 'edited_resume.pdf') {
    // Cast to unknown first to avoid TypeScript strictness with ArrayBufferLike
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}
