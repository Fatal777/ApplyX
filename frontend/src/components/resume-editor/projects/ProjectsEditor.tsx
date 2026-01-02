/**
 * ProjectsEditor Component
 * Form for editing projects section of resume
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Folder, ChevronDown, ChevronUp, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import FormField from "../FormField";
import { cn } from "@/lib/utils";
import { useResumeBuilderStore } from "@/store/resumeBuilderStore";
import { ProjectEntry, generateId } from "@/types/resumeBuilder";

const ProjectsEditor = () => {
    const { activeDocument, addProject, updateProject, deleteProject } = useResumeBuilderStore();
    const projectList = activeDocument?.projects || [];
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleAdd = () => {
        const newEntry: ProjectEntry = {
            id: generateId(),
            name: "",
            role: "",
            date: "",
            description: "",
            link: "",
            visible: true,
        };
        addProject(newEntry);
        setExpandedId(newEntry.id);
    };

    const handleUpdate = (id: string, field: string, value: string) => {
        const entry = projectList.find((p) => p.id === id);
        if (entry) {
            updateProject({ ...entry, [field]: value });
        }
    };

    return (
        <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Projects
                </h2>
                <Button onClick={handleAdd} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                </Button>
            </div>

            <AnimatePresence mode="popLayout">
                {projectList.map((project, index) => (
                    <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                            "rounded-lg border border-gray-200 dark:border-neutral-800",
                            "bg-white dark:bg-neutral-900",
                            "overflow-hidden"
                        )}
                    >
                        {/* Header */}
                        <div
                            className={cn(
                                "flex items-center justify-between p-3 cursor-pointer",
                                "hover:bg-gray-50 dark:hover:bg-neutral-800"
                            )}
                            onClick={() => setExpandedId(expandedId === project.id ? null : project.id)}
                        >
                            <div className="flex items-center gap-3">
                                <Folder className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="font-medium text-sm">
                                        {project.name || "New Project"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {project.role || "Your Role"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteProject(project.id);
                                    }}
                                    className="text-red-500 hover:text-red-600"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                {expandedId === project.id ? (
                                    <ChevronUp className="h-4 w-4 text-gray-400" />
                                ) : (
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <AnimatePresence>
                            {expandedId === project.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-gray-200 dark:border-neutral-800"
                                >
                                    <div className="p-4 space-y-3">
                                        <FormField
                                            label="Project Name"
                                            value={project.name}
                                            onChange={(value) => handleUpdate(project.id, "name", value)}
                                            placeholder="E-commerce Platform"
                                        />
                                        <FormField
                                            label="Your Role"
                                            value={project.role}
                                            onChange={(value) => handleUpdate(project.id, "role", value)}
                                            placeholder="Lead Developer"
                                        />
                                        <FormField
                                            label="Date"
                                            value={project.date}
                                            onChange={(value) => handleUpdate(project.id, "date", value)}
                                            placeholder="Mar 2023 - Jun 2023"
                                        />
                                        <div className="flex items-center gap-2">
                                            <Link className="h-4 w-4 text-gray-400 shrink-0 mt-6" />
                                            <div className="flex-1">
                                                <FormField
                                                    label="Project Link"
                                                    value={project.link || ""}
                                                    onChange={(value) => handleUpdate(project.id, "link", value)}
                                                    placeholder="https://github.com/..."
                                                />
                                            </div>
                                        </div>
                                        <FormField
                                            label="Description"
                                            value={project.description}
                                            onChange={(value) => handleUpdate(project.id, "description", value)}
                                            type="editor"
                                            placeholder="• Describe the project, technologies used, and your contributions..."
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </AnimatePresence>

            {projectList.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No projects added yet</p>
                    <Button onClick={handleAdd} size="sm" variant="link">
                        Add your first project
                    </Button>
                </div>
            )}
        </div>
    );
};

export default ProjectsEditor;
