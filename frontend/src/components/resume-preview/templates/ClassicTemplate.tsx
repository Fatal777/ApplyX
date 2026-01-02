/**
 * ClassicTemplate Component
 * A clean, professional resume template with sections stacked vertically
 */

import { cn } from "@/lib/utils";
import { ResumeDocument } from "@/types/resumeBuilder";
import { Mail, Phone, MapPin, Link, Github, Linkedin, Twitter, Globe } from "lucide-react";

interface TemplateProps {
    data: ResumeDocument;
}

// Icon mapping for social links
const SOCIAL_ICONS: Record<string, React.FC<{ className?: string }>> = {
    linkedin: Linkedin,
    github: Github,
    twitter: Twitter,
    portfolio: Globe,
    website: Globe,
    other: Link,
};

// Helper to shorten URLs for display
const shortenUrl = (url: string): string => {
    try {
        const parsed = new URL(url);
        let result = parsed.hostname.replace("www.", "");
        if (parsed.pathname && parsed.pathname !== "/") {
            result += parsed.pathname.replace(/\/$/, "");
        }
        return result.length > 30 ? result.slice(0, 27) + "..." : result;
    } catch {
        return url.length > 30 ? url.slice(0, 27) + "..." : url;
    }
};

// Section Title Component
const SectionTitle = ({
    title,
    themeColor
}: {
    title: string;
    themeColor?: string;
}) => (
    <div className="mb-3">
        <h2
            className="text-lg font-semibold uppercase tracking-wide"
            style={{ color: themeColor || "#1e40af" }}
        >
            {title}
        </h2>
        <div
            className="h-0.5 w-full mt-1"
            style={{ backgroundColor: themeColor || "#1e40af" }}
        />
    </div>
);

const ClassicTemplate = ({ data }: TemplateProps) => {
    const { personal, education, experience, projects, skillsContent, styleSettings } = data;
    const themeColor = styleSettings?.themeColor || "#000000";
    const sectionSpacing = styleSettings?.sectionSpacing || 16;
    const customFields = personal.customFields || [];

    return (
        <div style={{ color: "#1f2937" }}>
            {/* Header / Personal Info */}
            <div className="text-center mb-4">
                <h1
                    className="text-3xl font-bold"
                    style={{ color: themeColor }}
                >
                    {personal.name || "Your Name"}
                </h1>
                {personal.title && (
                    <p className="text-lg mt-1" style={{ color: "#4b5563" }}>
                        {personal.title}
                    </p>
                )}

                {/* Contact Info - All in one line */}
                <div className="flex flex-wrap justify-center items-center text-sm mt-2" style={{ color: "#4b5563" }}>
                    {personal.phone && (
                        <span>{personal.phone}</span>
                    )}
                    {personal.email && (
                        <>
                            <span className="mx-1">|</span>
                            <span>{personal.email}</span>
                        </>
                    )}
                    {personal.location && (
                        <>
                            <span className="mx-1">|</span>
                            <span>{personal.location}</span>
                        </>
                    )}
                    {/* Social Links inline */}
                    {customFields.filter(f => f.visible !== false && f.value).map((field) => (
                        <span key={field.id} className="flex items-center">
                            <span className="mx-1">|</span>
                            <a
                                href={field.value?.startsWith("http") ? field.value : `https://${field.value}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                                style={{ color: themeColor }}
                            >
                                {field.label}
                            </a>
                        </span>
                    ))}
                </div>
            </div>

            {/* Experience Section */}
            {experience.length > 0 && (
                <div style={{ marginBottom: `${sectionSpacing}px` }}>
                    <SectionTitle title="Experience" themeColor={themeColor} />
                    <div className="space-y-4">
                        {experience.filter(e => e.visible !== false).map((exp) => (
                            <div key={exp.id}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold">{exp.position}</h3>
                                        <p style={{ color: "#4b5563" }}>{exp.company}</p>
                                    </div>
                                    <span className="text-sm" style={{ color: "#6b7280" }}>{exp.date}</span>
                                </div>
                                {exp.details && (
                                    <div
                                        className="mt-2 text-sm [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:pl-1"
                                        dangerouslySetInnerHTML={{ __html: exp.details }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Education Section */}
            {education.length > 0 && (
                <div style={{ marginBottom: `${sectionSpacing}px` }}>
                    <SectionTitle title="Education" themeColor={themeColor} />
                    <div className="space-y-3">
                        {education.filter(e => e.visible !== false).map((edu) => (
                            <div key={edu.id} className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold">{edu.school}</h3>
                                    <p style={{ color: "#4b5563" }}>
                                        {edu.degree} {edu.major ? `in ${edu.major}` : ""}
                                        {edu.gpa ? ` • GPA: ${edu.gpa}` : ""}
                                    </p>
                                    {edu.description && (
                                        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>{edu.description}</p>
                                    )}
                                </div>
                                <span className="text-sm" style={{ color: "#6b7280" }}>
                                    {edu.startDate && new Date(edu.startDate).getFullYear()} - {" "}
                                    {edu.endDate ? new Date(edu.endDate).getFullYear() : "Present"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Projects Section */}
            {projects.length > 0 && (
                <div style={{ marginBottom: `${sectionSpacing}px` }}>
                    <SectionTitle title="Projects" themeColor={themeColor} />
                    <div className="space-y-4">
                        {projects.filter(p => p.visible !== false).map((project) => (
                            <div key={project.id}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold">
                                            {project.name}
                                            {project.link && (
                                                <a
                                                    href={project.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="ml-2 text-sm font-normal underline"
                                                    style={{ color: themeColor }}
                                                >
                                                    [Link]
                                                </a>
                                            )}
                                        </h3>
                                        <p style={{ color: "#4b5563" }}>{project.role}</p>
                                    </div>
                                    <span className="text-sm" style={{ color: "#6b7280" }}>{project.date}</span>
                                </div>
                                {project.description && (
                                    <div
                                        className="mt-2 text-sm prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: project.description }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Skills Section */}
            {skillsContent && (
                <div>
                    <SectionTitle title="Skills" themeColor={themeColor} />
                    <div
                        className="text-sm prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: skillsContent }}
                    />
                </div>
            )}
        </div>
    );
};

export default ClassicTemplate;
