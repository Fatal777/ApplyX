/**
 * Resume Builder Types
 * Data models for the ApplyX resume editor
 */

// Photo configuration for profile picture
export interface ProfilePhotoConfig {
    width: number;
    height: number;
    aspectRatio: "1:1" | "4:3" | "3:4" | "16:9" | "custom";
    borderRadius: "none" | "medium" | "full" | "custom";
    customBorderRadius: number;
    visible?: boolean;
}

export const DEFAULT_PHOTO_CONFIG: ProfilePhotoConfig = {
    width: 90,
    height: 120,
    aspectRatio: "1:1",
    borderRadius: "none",
    customBorderRadius: 0,
    visible: true,
};

// Helper functions for photo config
export const getAspectRatioMultiplier = (ratio: ProfilePhotoConfig["aspectRatio"]) => {
    switch (ratio) {
        case "4:3": return 3 / 4;
        case "3:4": return 4 / 3;
        case "16:9": return 9 / 16;
        default: return 1;
    }
};

export const getBorderRadiusValue = (config?: ProfilePhotoConfig) => {
    if (!config) return "0";
    switch (config.borderRadius) {
        case "medium": return "0.5rem";
        case "full": return "9999px";
        case "custom": return `${config.customBorderRadius}px`;
        default: return "0";
    }
};

// Field type for basic info
export interface BasicFieldConfig {
    id: string;
    key: keyof PersonalInfo;
    label: string;
    type?: "date" | "textarea" | "text" | "editor";
    visible: boolean;
    custom?: boolean;
}

// Custom field for user-defined info
export interface CustomFieldConfig {
    id: string;
    label: string;
    value: string;
    icon?: string;
    visible?: boolean;
    custom?: boolean;
}

// Personal information section
export interface PersonalInfo {
    name: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    birthDate: string;
    employmentStatus: string;
    photo: string;
    photoConfig: ProfilePhotoConfig;
    icons: Record<string, string>;
    fieldOrder?: BasicFieldConfig[];
    customFields: CustomFieldConfig[];
    layout?: "left" | "center" | "right";
}

// Education entry
export interface EducationEntry {
    id: string;
    school: string;
    major: string;
    degree: string;
    startDate: string;
    endDate: string;
    gpa?: string;
    description?: string;
    visible?: boolean;
}

// Work experience entry
export interface ExperienceEntry {
    id: string;
    company: string;
    position: string;
    date: string;
    details: string;
    visible?: boolean;
}

// Skill entry
export interface SkillEntry {
    id: string;
    name: string;
    level: number;
}

// Project entry
export interface ProjectEntry {
    id: string;
    name: string;
    role: string;
    date: string;
    description: string;
    visible: boolean;
    link?: string;
}

// Custom section item
export interface CustomSectionItem {
    id: string;
    title: string;
    subtitle: string;
    dateRange: string;
    description: string;
    visible: boolean;
}

// Global styling settings
export interface ResumeStyleSettings {
    themeColor?: string;
    fontFamily?: string;
    baseFontSize?: number;
    pagePadding?: number;
    paragraphSpacing?: number;
    lineHeight?: number;
    sectionSpacing?: number;
    headerSize?: number;
    subheaderSize?: number;
    useIconMode?: boolean;
    centerSubtitle?: boolean;
}

// Resume theme
export interface ResumeTheme {
    id: string;
    name: string;
    color: string;
}

// Menu section configuration
export interface SectionConfig {
    id: string;
    title: string;
    icon: string;
    enabled: boolean;
    order: number;
}

// Theme color presets
export const THEME_COLOR_PRESETS = [
    "#000000",
    "#1A1A1A",
    "#333333",
    "#4D4D4D",
    "#666666",
    "#808080",
    "#0047AB",
    "#8B0000",
    "#FF4500",
    "#4B0082",
    "#2E8B57",
    "#1e40af", // ApplyX blue
];

// Complete resume data structure
export interface ResumeDocument {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    templateId: string | null;
    personal: PersonalInfo;
    education: EducationEntry[];
    experience: ExperienceEntry[];
    projects: ProjectEntry[];
    customSections: Record<string, CustomSectionItem[]>;
    skillsContent: string;
    activeSection: string;
    draggingProjectId: string | null;
    sections: SectionConfig[];
    styleSettings: ResumeStyleSettings;
}

// Default resume document template
export const createDefaultResume = (id: string): ResumeDocument => ({
    id,
    title: "Untitled Resume",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateId: null,
    personal: {
        name: "",
        title: "",
        email: "",
        phone: "",
        location: "",
        birthDate: "",
        employmentStatus: "",
        photo: "",
        photoConfig: DEFAULT_PHOTO_CONFIG,
        icons: {},
        customFields: [],
    },
    education: [],
    experience: [],
    projects: [],
    customSections: {},
    skillsContent: "",
    activeSection: "personal",
    draggingProjectId: null,
    sections: [
        { id: "personal", title: "Personal Info", icon: "User", enabled: true, order: 0 },
        { id: "education", title: "Education", icon: "GraduationCap", enabled: true, order: 1 },
        { id: "experience", title: "Experience", icon: "Briefcase", enabled: true, order: 2 },
        { id: "projects", title: "Projects", icon: "Folder", enabled: true, order: 3 },
        { id: "skills", title: "Skills", icon: "Wrench", enabled: true, order: 4 },
    ],
    styleSettings: {
        themeColor: "#000000", // Black (Classic theme default)
        fontFamily: "Inter",
        baseFontSize: 14,
        pagePadding: 40,
        paragraphSpacing: 8,
        lineHeight: 1.5,
        sectionSpacing: 16,
        headerSize: 24,
        subheaderSize: 16,
        useIconMode: false,
        centerSubtitle: false,
    },
});

// Generate unique ID
export const generateId = (): string => {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
};
