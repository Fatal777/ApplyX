/**
 * Type declarations for html2pdf.js
 */

declare module "html2pdf.js" {
    interface Html2PdfOptions {
        margin?: number | number[];
        filename?: string;
        image?: {
            type?: "jpeg" | "png" | "webp";
            quality?: number;
        };
        enableLinks?: boolean;
        html2canvas?: {
            scale?: number;
            useCORS?: boolean;
            letterRendering?: boolean;
            logging?: boolean;
            allowTaint?: boolean;
            backgroundColor?: string;
        };
        jsPDF?: {
            unit?: "pt" | "mm" | "cm" | "in";
            format?: "a4" | "letter" | "legal" | [number, number];
            orientation?: "portrait" | "landscape";
            compress?: boolean;
        };
    }

    interface Html2Pdf {
        set(options: Html2PdfOptions): Html2Pdf;
        from(element: HTMLElement | string): Html2Pdf;
        save(): Promise<void>;
        outputPdf(type: "blob"): Promise<Blob>;
        outputPdf(type: "datauristring"): Promise<string>;
        outputPdf(type: "arraybuffer"): Promise<ArrayBuffer>;
    }

    function html2pdf(): Html2Pdf;
    export = html2pdf;
}
