/**
 * ModernTemplate Component
 * A modern resume template with a colored sidebar
 */

import { cn } from "@/lib/utils";
import { ResumeDocument } from "@/types/resumeBuilder";
import { Mail, Phone, MapPin, Briefcase, GraduationCap, Folder, Wrench } from "lucide-react";

interface TemplateProps {
    data: ResumeDocument;
}

const ModernTemplate = ({ data }: TemplateProps) => {
    const { personal, education, experience, projects, skillsContent, styleSettings } = data;
    const themeColor = styleSettings?.themeColor || "#1e40af"; // Blue theme

    return (
        <div className="flex min-h-full">
            {/* Sidebar */}
            <div
                className="w-1/3 text-white p-6"
                style={{ backgroundColor: themeColor }}
            >
                {/* Photo - actual or placeholder */}
                {personal.photo ? (
                    <img
                        src={personal.photo}
                        alt={personal.name || "Profile"}
                        className="w-24 h-24 mx-auto mb-4 rounded-full object-cover border-2 border-white/30"
                    />
                ) : (
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="text-3xl font-bold">
                            {personal.name?.charAt(0) || "?"}
                        </span>
                    </div>
                )}

                {/* Name */}
                <h1 className="text-xl font-bold text-center mb-1">
                    {personal.name || "Your Name"}
                </h1>
                <p className="text-sm text-center opacity-90 mb-6">
                    {personal.title || "Professional Title"}
                </p>

                {/* Contact */}
                <div className="space-y-2 text-sm mb-6">
                    {personal.email && (
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span className="break-all">{personal.email}</span>
                        </div>
                    )}
                    {personal.phone && (
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{personal.phone}</span>
                        </div>
                    )}
                    {personal.location && (
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{personal.location}</span>
                        </div>
                    )}
                </div>

                {/* Skills in sidebar */}
                {skillsContent && (
                    <div>
                        <h3 className="font-semibold flex items-center gap-2 mb-2">
                            <Wrench className="h-4 w-4" />
                            Skills
                        </h3>
                        <div
                            className="text-sm opacity-90 prose prose-sm prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: skillsContent }}
                        />
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="w-2/3 p-6" style={{ color: "#1f2937" }}>
                {/* Experience */}
                {experience.length > 0 && (
                    <div className="mb-6">
                        <h2
                            className="text-lg font-bold flex items-center gap-2 mb-3 pb-1 border-b-2"
                            style={{ color: themeColor, borderColor: themeColor }}
                        >
                            <Briefcase className="h-5 w-5" />
                            Experience
                        </h2>
                        <div className="space-y-4">
                            {experience.filter(e => e.visible !== false).map((exp) => (
                                <div key={exp.id}>
                                    <div className="flex justify-between">
                                        <h3 className="font-semibold">{exp.position}</h3>
                                        <span className="text-sm" style={{ color: "#6b7280" }}>{exp.date}</span>
                                    </div>
                                    <p className="text-sm" style={{ color: "#4b5563" }}>{exp.company}</p>
                                    {exp.details && (
                                        <div
                                            className="mt-1 text-sm prose prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{ __html: exp.details }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Education */}
                {education.length > 0 && (
                    <div className="mb-6">
                        <h2
                            className="text-lg font-bold flex items-center gap-2 mb-3 pb-1 border-b-2"
                            style={{ color: themeColor, borderColor: themeColor }}
                        >
                            <GraduationCap className="h-5 w-5" />
                            Education
                        </h2>
                        <div className="space-y-3">
                            {education.filter(e => e.visible !== false).map((edu) => (
                                <div key={edu.id}>
                                    <div className="flex justify-between">
                                        <h3 className="font-semibold">{edu.school}</h3>
                                        <span className="text-sm" style={{ color: "#6b7280" }}>
                                            {edu.startDate && new Date(edu.startDate).getFullYear()} - {" "}
                                            {edu.endDate ? new Date(edu.endDate).getFullYear() : "Present"}
                                        </span>
                                    </div>
                                    <p className="text-sm" style={{ color: "#4b5563" }}>
                                        {edu.degree} {edu.major ? `in ${edu.major}` : ""}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Projects */}
                {projects.length > 0 && (
                    <div>
                        <h2
                            className="text-lg font-bold flex items-center gap-2 mb-3 pb-1 border-b-2"
                            style={{ color: themeColor, borderColor: themeColor }}
                        >
                            <Folder className="h-5 w-5" />
                            Projects
                        </h2>
                        <div className="space-y-3">
                            {projects.filter(p => p.visible !== false).map((project) => (
                                <div key={project.id}>
                                    <div className="flex justify-between">
                                        <h3 className="font-semibold">{project.name}</h3>
                                        <span className="text-sm" style={{ color: "#6b7280" }}>{project.date}</span>
                                    </div>
                                    <p className="text-sm" style={{ color: "#4b5563" }}>{project.role}</p>
                                    {project.description && (
                                        <div
                                            className="mt-1 text-sm prose prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{ __html: project.description }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModernTemplate;
