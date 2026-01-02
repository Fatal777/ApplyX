/**
 * EditorSidebar Component
 * Sidebar panel to switch between different resume sections
 */

import { useRef } from "react";
import { User, GraduationCap, Briefcase, Folder, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResumeBuilderStore } from "@/store/resumeBuilderStore";
import PersonalInfoEditor from "./basic/PersonalInfoEditor";
import EducationEditor from "./education/EducationEditor";
import ExperienceEditor from "./experience/ExperienceEditor";
import ProjectsEditor from "./projects/ProjectsEditor";
import SkillsEditor from "./skills/SkillsEditor";

const sections = [
    { id: "personal", label: "Personal", icon: User },
    { id: "education", label: "Education", icon: GraduationCap },
    { id: "experience", label: "Experience", icon: Briefcase },
    { id: "projects", label: "Projects", icon: Folder },
    { id: "skills", label: "Skills", icon: Wrench },
];

const EditorSidebar = () => {
    const { activeDocument, setActiveSection } = useResumeBuilderStore();
    const activeSection = activeDocument?.activeSection || "personal";
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const renderEditor = () => {
        switch (activeSection) {
            case "personal":
                return <PersonalInfoEditor />;
            case "education":
                return <EducationEditor />;
            case "experience":
                return <ExperienceEditor />;
            case "projects":
                return <ProjectsEditor />;
            case "skills":
                return <SkillsEditor />;
            default:
                return <PersonalInfoEditor />;
        }
    };

    // Explicit wheel handler to ensure scroll works
    const handleWheel = (e: React.WheelEvent) => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop += e.deltaY;
        }
    };

    return (
        <div className="flex h-full">
            {/* Section Navigation */}
            <div
                className={cn(
                    "w-14 flex-shrink-0 border-r border-gray-200 dark:border-neutral-800",
                    "bg-gray-50 dark:bg-neutral-900",
                    "flex flex-col items-center py-4 gap-2"
                )}
            >
                {sections.map((section) => (
                    <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            "transition-all duration-200",
                            activeSection === section.id
                                ? "bg-primary text-white shadow-md"
                                : "text-gray-500 hover:bg-gray-200 dark:hover:bg-neutral-800"
                        )}
                        title={section.label}
                    >
                        <section.icon className="h-5 w-5" />
                    </button>
                ))}
            </div>

            {/* Editor Content - scrollable with explicit wheel handling */}
            <div className="flex-1 relative bg-gray-50 dark:bg-neutral-950">
                <div
                    ref={scrollContainerRef}
                    className="absolute inset-0 overflow-y-auto"
                    onWheel={handleWheel}
                >
                    <div className="p-4 pb-8">
                        {renderEditor()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditorSidebar;
