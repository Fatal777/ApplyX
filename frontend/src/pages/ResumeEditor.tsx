/**
 * ResumeEditor Page
 * Main resume editor page with sidebar, editor, and preview panels
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ChevronLeft,
    Save,
    FileText,
    Download,
    Settings,
    Palette,
    MoreVertical,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useResumeBuilderStore } from "@/store/resumeBuilderStore";
import { EditorSidebar } from "@/components/resume-editor";
import { ResumePreview, ExportToolbar, TEMPLATES } from "@/components/resume-preview";
import { exportResumeToPdf } from "@/utils/pdfExport";
import { cn } from "@/lib/utils";

const ResumeEditor = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const {
        activeDocument,
        documents,
        createDocument,
        setActiveDocument,
        updateTitle,
        setThemeColor,
    } = useResumeBuilderStore();

    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [zoom, setZoom] = useState(100);
    const previewScrollRef = useRef<HTMLDivElement>(null);

    // Explicit wheel handler for preview panel (fixes trackpad scroll)
    const handlePreviewWheel = (e: React.WheelEvent) => {
        if (previewScrollRef.current) {
            previewScrollRef.current.scrollTop += e.deltaY;
            previewScrollRef.current.scrollLeft += e.deltaX;
        }
    };

    // Initialize or load resume
    useEffect(() => {
        const loadDocument = async () => {
            // If we have an ID, check if it's a local ID or a backend ID (numeric)
            if (id) {
                if (documents[id]) {
                    // Local document found
                    setActiveDocument(id);
                    setIsLoading(false);
                } else if (/^\d+$/.test(id)) {
                    // ID is numeric - fetch from backend API
                    try {
                        const { resumeBuilderApi } = await import("@/services/resumeBuilderApi");
                        const { createDefaultResume } = await import("@/types/resumeBuilder");
                        let backendDoc: any = null;
                        try {
                            backendDoc = await resumeBuilderApi.get(parseInt(id));
                        } catch (fetchErr: any) {
                            console.warn("Backend fetch failed, creating local document:", fetchErr?.message);
                        }

                        // Convert backend document to local format and import
                        if (backendDoc && backendDoc.content) {
                            const { importDocument } = useResumeBuilderStore.getState();

                            // Start with default structure to ensure all required fields
                            const defaultDoc = createDefaultResume(id);
                            const content = (backendDoc.content || {}) as Record<string, any>;

                            // Helper to safely filter arrays (remove null/undefined items)
                            const safeArray = <T,>(arr: T[] | null | undefined): T[] =>
                                Array.isArray(arr) ? arr.filter((item): item is NonNullable<T> => item != null) : [];

                            // Merge: default structure + backend content
                            const localDoc = {
                                ...defaultDoc,
                                id: id,
                                title: backendDoc.title || "Imported Resume",
                                templateId: backendDoc.template_id || defaultDoc.templateId || "classic",
                                createdAt: backendDoc.created_at || defaultDoc.createdAt,
                                updatedAt: backendDoc.updated_at || defaultDoc.updatedAt,
                                personal: {
                                    ...defaultDoc.personal,
                                    ...((content.personal || {}) as Record<string, any>),
                                    customFields: safeArray(content.personal?.customFields).length > 0
                                        ? safeArray(content.personal?.customFields)
                                        : defaultDoc.personal.customFields,
                                },
                                education: safeArray(content.education).length > 0 ? safeArray(content.education) : defaultDoc.education,
                                experience: safeArray(content.experience).length > 0 ? safeArray(content.experience) : defaultDoc.experience,
                                projects: safeArray(content.projects).length > 0 ? safeArray(content.projects) : defaultDoc.projects,
                                skillsContent: content.skillsContent || content.skills || defaultDoc.skillsContent,
                                sections: safeArray(content.sections).length > 0 ? safeArray(content.sections) : defaultDoc.sections,
                                customSections: content.customSections || defaultDoc.customSections || {},
                                styleSettings: { ...defaultDoc.styleSettings, ...((content.styleSettings || {}) as Record<string, any>) },
                            };
                            importDocument(localDoc as any);
                            setIsLoading(false);
                            toast.success("Resume loaded from server");
                        } else {
                            createDocument();
                            setIsLoading(false);
                        }
                    } catch (error) {
                        console.error("Failed to load document:", error);
                        // Don't throw — just create a fresh document so the page doesn't crash
                        createDocument();
                        setIsLoading(false);
                    }
                } else {
                    // Unknown ID format, create new
                    createDocument();
                    setIsLoading(false);
                }
            } else if (Object.keys(documents).length === 0) {
                // No ID and no documents - create new
                createDocument();
                setIsLoading(false);
            } else if (Object.keys(documents).length > 0) {
                // No ID but have documents - select first
                const firstId = Object.keys(documents)[0];
                setActiveDocument(firstId);
                setIsLoading(false);
            }
        };

        loadDocument();
    }, [id]);

    const handleTitleEdit = () => {
        if (activeDocument) {
            setEditTitle(activeDocument.title);
            setIsEditing(true);
        }
    };

    const handleTitleSave = () => {
        if (editTitle.trim()) {
            updateTitle(editTitle);
        }
        setIsEditing(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate save - in real app, call API here
        await new Promise((r) => setTimeout(r, 500));
        toast.success("Resume saved!");
        setIsSaving(false);
    };

    const handleExport = async () => {
        if (!activeDocument) return;
        try {
            await exportResumeToPdf(activeDocument);
            toast.success("PDF downloaded!");
        } catch {
            toast.error("Export failed");
        }
    };

    const handleZoomIn = () => setZoom((z) => Math.min(z + 10, 150));
    const handleZoomOut = () => setZoom((z) => Math.max(z - 10, 50));
    const handleResetZoom = () => setZoom(100);

    if (isLoading || !activeDocument) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-100 dark:bg-neutral-950">
            {/* Header */}
            <header
                className={cn(
                    "h-14 border-b border-gray-200 dark:border-neutral-800",
                    "bg-white dark:bg-neutral-900",
                    "flex items-center justify-between px-4"
                )}
            >
                {/* Left */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="gap-2"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                    </Button>

                    <div className="h-6 w-px bg-gray-200 dark:bg-neutral-800" />

                    {/* Title */}
                    {isEditing ? (
                        <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={handleTitleSave}
                            onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
                            autoFocus
                            className="h-8 w-48"
                        />
                    ) : (
                        <button
                            onClick={handleTitleEdit}
                            className="flex items-center gap-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-neutral-800 px-2 py-1 rounded"
                        >
                            <FileText className="h-4 w-4 text-primary" />
                            {activeDocument.title}
                        </button>
                    )}
                </div>

                {/* Right */}
                <div className="flex items-center gap-2">
                    {/* Template/Theme selector */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Palette className="h-4 w-4" />
                                Theme
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {TEMPLATES.map((template) => (
                                <DropdownMenuItem
                                    key={template.id}
                                    onClick={() => setThemeColor(template.themeColor)}
                                >
                                    <div
                                        className="w-3 h-3 rounded-full mr-2"
                                        style={{ backgroundColor: template.themeColor }}
                                    />
                                    {template.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Save */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="gap-2"
                    >
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        Save
                    </Button>

                    {/* Export */}
                    <Button size="sm" onClick={handleExport} className="gap-2">
                        <Download className="h-4 w-4" />
                        Export PDF
                    </Button>

                    {/* More */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                                <Settings className="h-4 w-4 mr-2" />
                                Settings
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Main Content - Resizable Panels */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <ResizablePanelGroup direction="horizontal" className="h-full">
                    {/* Editor Panel */}
                    <ResizablePanel defaultSize={40} minSize={30} maxSize={60}>
                        <div className="h-full bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800">
                            <EditorSidebar />
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Preview Panel */}
                    <ResizablePanel defaultSize={60} minSize={40}>
                        <div className="relative h-full bg-gray-200 dark:bg-neutral-950">
                            <div
                                ref={previewScrollRef}
                                className="absolute inset-0 overflow-auto p-8"
                                onWheel={handlePreviewWheel}
                            >
                                <div className="flex justify-center">
                                    <div
                                        style={{
                                            transform: `scale(${zoom / 100})`,
                                            transformOrigin: "top center",
                                        }}
                                    >
                                        <ResumePreview />
                                    </div>
                                </div>
                            </div>

                            {/* Export Toolbar */}
                            <ExportToolbar
                                zoom={zoom}
                                onZoomIn={handleZoomIn}
                                onZoomOut={handleZoomOut}
                                onResetZoom={handleResetZoom}
                            />
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    );
};

export default ResumeEditor;
