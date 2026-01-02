/**
 * Resume Builder Store
 * Zustand store for managing resume data in the ApplyX editor
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
    ResumeDocument,
    PersonalInfo,
    EducationEntry,
    ExperienceEntry,
    ProjectEntry,
    CustomSectionItem,
    SectionConfig,
    ResumeStyleSettings,
    createDefaultResume,
    generateId,
} from "@/types/resumeBuilder";

// Store interface
interface ResumeBuilderState {
    // State
    documents: Record<string, ResumeDocument>;
    activeDocumentId: string | null;
    activeDocument: ResumeDocument | null;

    // Document management
    createDocument: (templateId?: string | null) => string;
    deleteDocument: (documentId: string) => void;
    duplicateDocument: (documentId: string) => string;
    updateDocument: (documentId: string, data: Partial<ResumeDocument>) => void;
    setActiveDocument: (documentId: string) => void;
    importDocument: (document: ResumeDocument) => string;

    // Title
    updateTitle: (title: string) => void;

    // Personal info
    updatePersonalInfo: (data: Partial<PersonalInfo>) => void;

    // Education
    addEducation: (education: EducationEntry) => void;
    updateEducation: (education: EducationEntry) => void;
    updateEducationList: (educations: EducationEntry[]) => void;
    deleteEducation: (id: string) => void;

    // Experience
    addExperience: (experience: ExperienceEntry) => void;
    updateExperience: (experience: ExperienceEntry) => void;
    updateExperienceList: (experiences: ExperienceEntry[]) => void;
    deleteExperience: (id: string) => void;

    // Projects
    addProject: (project: ProjectEntry) => void;
    updateProject: (project: ProjectEntry) => void;
    updateProjectList: (projects: ProjectEntry[]) => void;
    deleteProject: (id: string) => void;
    setDraggingProjectId: (id: string | null) => void;

    // Skills
    updateSkillsContent: (content: string) => void;

    // Sections
    reorderSections: (sections: SectionConfig[]) => void;
    toggleSectionVisibility: (sectionId: string) => void;
    setActiveSection: (sectionId: string) => void;
    updateSections: (sections: SectionConfig[]) => void;

    // Custom sections
    addCustomSection: (sectionId: string) => void;
    updateCustomSection: (sectionId: string, items: CustomSectionItem[]) => void;
    removeCustomSection: (sectionId: string) => void;
    addCustomItem: (sectionId: string) => void;
    updateCustomItem: (sectionId: string, itemId: string, updates: Partial<CustomSectionItem>) => void;
    removeCustomItem: (sectionId: string, itemId: string) => void;

    // Styling
    updateStyleSettings: (settings: Partial<ResumeStyleSettings>) => void;
    setThemeColor: (color: string) => void;
    setTemplate: (templateId: string) => void;
}

// Create the store
export const useResumeBuilderStore = create(
    persist<ResumeBuilderState>(
        (set, get) => ({
            documents: {},
            activeDocumentId: null,
            activeDocument: null,

            // Create a new document
            createDocument: (templateId = null) => {
                const id = generateId();
                const newDocument = createDefaultResume(id);

                if (templateId) {
                    newDocument.templateId = templateId;
                }

                newDocument.title = `Resume ${id.slice(0, 6)}`;

                set((state) => ({
                    documents: {
                        ...state.documents,
                        [id]: newDocument,
                    },
                    activeDocumentId: id,
                    activeDocument: newDocument,
                }));

                return id;
            },

            // Delete a document
            deleteDocument: (documentId) => {
                set((state) => {
                    const { [documentId]: _, ...rest } = state.documents;
                    return {
                        documents: rest,
                        activeDocumentId: state.activeDocumentId === documentId ? null : state.activeDocumentId,
                        activeDocument: state.activeDocumentId === documentId ? null : state.activeDocument,
                    };
                });
            },

            // Duplicate a document
            duplicateDocument: (documentId) => {
                const newId = generateId();
                const original = get().documents[documentId];

                if (!original) return "";

                const duplicated: ResumeDocument = {
                    ...JSON.parse(JSON.stringify(original)),
                    id: newId,
                    title: `${original.title} (Copy)`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                set((state) => ({
                    documents: {
                        ...state.documents,
                        [newId]: duplicated,
                    },
                    activeDocumentId: newId,
                    activeDocument: duplicated,
                }));

                return newId;
            },

            // Update a document
            updateDocument: (documentId, data) => {
                set((state) => {
                    const doc = state.documents[documentId];
                    if (!doc) return state;

                    const updated: ResumeDocument = {
                        ...doc,
                        ...data,
                        updatedAt: new Date().toISOString(),
                    };

                    return {
                        documents: {
                            ...state.documents,
                            [documentId]: updated,
                        },
                        activeDocument: state.activeDocumentId === documentId ? updated : state.activeDocument,
                    };
                });
            },

            // Set active document
            setActiveDocument: (documentId) => {
                const doc = get().documents[documentId];
                if (doc) {
                    set({ activeDocument: doc, activeDocumentId: documentId });
                }
            },

            // Import a document
            importDocument: (document) => {
                set((state) => ({
                    documents: {
                        ...state.documents,
                        [document.id]: document,
                    },
                    activeDocumentId: document.id,
                    activeDocument: document,
                }));
                return document.id;
            },

            // Update title
            updateTitle: (title) => {
                const { activeDocumentId } = get();
                if (activeDocumentId) {
                    get().updateDocument(activeDocumentId, { title });
                }
            },

            // Update personal info
            updatePersonalInfo: (data) => {
                set((state) => {
                    if (!state.activeDocument) return state;

                    const updated: ResumeDocument = {
                        ...state.activeDocument,
                        personal: {
                            ...state.activeDocument.personal,
                            ...data,
                        },
                        updatedAt: new Date().toISOString(),
                    };

                    return {
                        documents: {
                            ...state.documents,
                            [state.activeDocument.id]: updated,
                        },
                        activeDocument: updated,
                    };
                });
            },

            // Education methods
            addEducation: (education) => {
                const { activeDocumentId, documents } = get();
                if (!activeDocumentId) return;

                const doc = documents[activeDocumentId];
                get().updateDocument(activeDocumentId, {
                    education: [...doc.education, education],
                });
            },

            updateEducation: (education) => {
                const { activeDocumentId, documents } = get();
                if (!activeDocumentId) return;

                const doc = documents[activeDocumentId];
                const exists = doc.education.some((e) => e.id === education.id);

                const updated = exists
                    ? doc.education.map((e) => (e.id === education.id ? education : e))
                    : [...doc.education, education];

                get().updateDocument(activeDocumentId, { education: updated });
            },

            updateEducationList: (educations) => {
                const { activeDocumentId } = get();
                if (activeDocumentId) {
                    get().updateDocument(activeDocumentId, { education: educations });
                }
            },

            deleteEducation: (id) => {
                const { activeDocumentId, documents } = get();
                if (!activeDocumentId) return;

                const doc = documents[activeDocumentId];
                get().updateDocument(activeDocumentId, {
                    education: doc.education.filter((e) => e.id !== id),
                });
            },

            // Experience methods
            addExperience: (experience) => {
                const { activeDocumentId, documents } = get();
                if (!activeDocumentId) return;

                const doc = documents[activeDocumentId];
                get().updateDocument(activeDocumentId, {
                    experience: [...doc.experience, experience],
                });
            },

            updateExperience: (experience) => {
                const { activeDocumentId, documents } = get();
                if (!activeDocumentId) return;

                const doc = documents[activeDocumentId];
                const exists = doc.experience.some((e) => e.id === experience.id);

                const updated = exists
                    ? doc.experience.map((e) => (e.id === experience.id ? experience : e))
                    : [...doc.experience, experience];

                get().updateDocument(activeDocumentId, { experience: updated });
            },

            updateExperienceList: (experiences) => {
                const { activeDocumentId } = get();
                if (activeDocumentId) {
                    get().updateDocument(activeDocumentId, { experience: experiences });
                }
            },

            deleteExperience: (id) => {
                const { activeDocumentId, documents } = get();
                if (!activeDocumentId) return;

                const doc = documents[activeDocumentId];
                get().updateDocument(activeDocumentId, {
                    experience: doc.experience.filter((e) => e.id !== id),
                });
            },

            // Project methods
            addProject: (project) => {
                const { activeDocumentId, documents } = get();
                if (!activeDocumentId) return;

                const doc = documents[activeDocumentId];
                get().updateDocument(activeDocumentId, {
                    projects: [...doc.projects, project],
                });
            },

            updateProject: (project) => {
                const { activeDocumentId, documents } = get();
                if (!activeDocumentId) return;

                const doc = documents[activeDocumentId];
                const exists = doc.projects.some((p) => p.id === project.id);

                const updated = exists
                    ? doc.projects.map((p) => (p.id === project.id ? project : p))
                    : [...doc.projects, project];

                get().updateDocument(activeDocumentId, { projects: updated });
            },

            updateProjectList: (projects) => {
                const { activeDocumentId } = get();
                if (activeDocumentId) {
                    get().updateDocument(activeDocumentId, { projects });
                }
            },

            deleteProject: (id) => {
                const { activeDocumentId, documents } = get();
                if (!activeDocumentId) return;

                const doc = documents[activeDocumentId];
                get().updateDocument(activeDocumentId, {
                    projects: doc.projects.filter((p) => p.id !== id),
                });
            },

            setDraggingProjectId: (id) => {
                const { activeDocumentId } = get();
                if (activeDocumentId) {
                    get().updateDocument(activeDocumentId, { draggingProjectId: id });
                }
            },

            // Skills
            updateSkillsContent: (content) => {
                const { activeDocumentId } = get();
                if (activeDocumentId) {
                    get().updateDocument(activeDocumentId, { skillsContent: content });
                }
            },

            // Section methods
            reorderSections: (sections) => {
                const { activeDocumentId, documents } = get();
                if (!activeDocumentId) return;

                const doc = documents[activeDocumentId];
                const personalSection = doc.sections.find((s) => s.id === "personal");

                const reordered = [
                    personalSection,
                    ...sections.filter((s) => s.id !== "personal"),
                ].map((section, index) => ({
                    ...section,
                    order: index,
                })) as SectionConfig[];

                get().updateDocument(activeDocumentId, { sections: reordered });
            },

            toggleSectionVisibility: (sectionId) => {
                const { activeDocumentId, documents } = get();
                if (!activeDocumentId) return;

                const doc = documents[activeDocumentId];
                const updated = doc.sections.map((section) =>
                    section.id === sectionId
                        ? { ...section, enabled: !section.enabled }
                        : section
                );

                get().updateDocument(activeDocumentId, { sections: updated });
            },

            setActiveSection: (sectionId) => {
                const { activeDocumentId } = get();
                if (activeDocumentId) {
                    get().updateDocument(activeDocumentId, { activeSection: sectionId });
                }
            },

            updateSections: (sections) => {
                const { activeDocumentId } = get();
                if (activeDocumentId) {
                    get().updateDocument(activeDocumentId, { sections });
                }
            },

            // Custom section methods
            addCustomSection: (sectionId) => {
                const { activeDocumentId, documents } = get();
                if (!activeDocumentId) return;

                const doc = documents[activeDocumentId];
                const updated = {
                    ...doc.customSections,
                    [sectionId]: [
                        {
                            id: generateId(),
                            title: "New Section",
                            subtitle: "",
                            dateRange: "",
                            description: "",
                            visible: true,
                        },
                    ],
                };

                get().updateDocument(activeDocumentId, { customSections: updated });
            },

            updateCustomSection: (sectionId, items) => {
                const { activeDocumentId, documents } = get();
                if (!activeDocumentId) return;

                const doc = documents[activeDocumentId];
                const updated = {
                    ...doc.customSections,
                    [sectionId]: items,
                };

                get().updateDocument(activeDocumentId, { customSections: updated });
            },

            removeCustomSection: (sectionId) => {
                const { activeDocumentId, documents } = get();
                if (!activeDocumentId) return;

                const doc = documents[activeDocumentId];
                const { [sectionId]: _, ...rest } = doc.customSections;
                get().updateDocument(activeDocumentId, { customSections: rest });
            },

            addCustomItem: (sectionId) => {
                const { activeDocumentId, documents } = get();
                if (!activeDocumentId) return;

                const doc = documents[activeDocumentId];
                const updated = {
                    ...doc.customSections,
                    [sectionId]: [
                        ...(doc.customSections[sectionId] || []),
                        {
                            id: generateId(),
                            title: "New Item",
                            subtitle: "",
                            dateRange: "",
                            description: "",
                            visible: true,
                        },
                    ],
                };

                get().updateDocument(activeDocumentId, { customSections: updated });
            },

            updateCustomItem: (sectionId, itemId, updates) => {
                const { activeDocumentId, documents } = get();
                if (!activeDocumentId) return;

                const doc = documents[activeDocumentId];
                const updated = {
                    ...doc.customSections,
                    [sectionId]: doc.customSections[sectionId]?.map((item) =>
                        item.id === itemId ? { ...item, ...updates } : item
                    ) || [],
                };

                get().updateDocument(activeDocumentId, { customSections: updated });
            },

            removeCustomItem: (sectionId, itemId) => {
                const { activeDocumentId, documents } = get();
                if (!activeDocumentId) return;

                const doc = documents[activeDocumentId];
                const updated = {
                    ...doc.customSections,
                    [sectionId]: doc.customSections[sectionId]?.filter(
                        (item) => item.id !== itemId
                    ) || [],
                };

                get().updateDocument(activeDocumentId, { customSections: updated });
            },

            // Styling methods
            updateStyleSettings: (settings) => {
                const { activeDocumentId, activeDocument, updateDocument } = get();
                if (activeDocumentId && activeDocument) {
                    updateDocument(activeDocumentId, {
                        styleSettings: {
                            ...activeDocument.styleSettings,
                            ...settings,
                        },
                    });
                }
            },

            setThemeColor: (color) => {
                const { activeDocumentId, activeDocument, updateDocument } = get();
                if (activeDocumentId && activeDocument) {
                    updateDocument(activeDocumentId, {
                        styleSettings: {
                            ...activeDocument.styleSettings,
                            themeColor: color,
                        },
                    });
                }
            },

            setTemplate: (templateId) => {
                const { activeDocumentId } = get();
                if (activeDocumentId) {
                    get().updateDocument(activeDocumentId, { templateId });
                }
            },
        }),
        {
            name: "applyx-resume-builder",
        }
    )
);
