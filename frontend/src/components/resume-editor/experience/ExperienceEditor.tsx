/**
 * ExperienceEditor Component
 * Form for editing work experience section of resume
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Briefcase, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import FormField from "../FormField";
import { cn } from "@/lib/utils";
import { useResumeBuilderStore } from "@/store/resumeBuilderStore";
import { ExperienceEntry, generateId } from "@/types/resumeBuilder";

const ExperienceEditor = () => {
    const { activeDocument, addExperience, updateExperience, deleteExperience } = useResumeBuilderStore();
    const experienceList = activeDocument?.experience || [];
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleAdd = () => {
        const newEntry: ExperienceEntry = {
            id: generateId(),
            company: "",
            position: "",
            date: "",
            details: "",
            visible: true,
        };
        addExperience(newEntry);
        setExpandedId(newEntry.id);
    };

    const handleUpdate = (id: string, field: string, value: string) => {
        const entry = experienceList.find((e) => e.id === id);
        if (entry) {
            updateExperience({ ...entry, [field]: value });
        }
    };

    return (
        <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Work Experience
                </h2>
                <Button onClick={handleAdd} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                </Button>
            </div>

            <AnimatePresence mode="popLayout">
                {experienceList.map((exp, index) => (
                    <motion.div
                        key={exp.id}
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
                            onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                        >
                            <div className="flex items-center gap-3">
                                <Briefcase className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="font-medium text-sm">
                                        {exp.position || "New Position"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {exp.company || "Company"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteExperience(exp.id);
                                    }}
                                    className="text-red-500 hover:text-red-600"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                {expandedId === exp.id ? (
                                    <ChevronUp className="h-4 w-4 text-gray-400" />
                                ) : (
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <AnimatePresence>
                            {expandedId === exp.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-gray-200 dark:border-neutral-800"
                                >
                                    <div className="p-4 space-y-3">
                                        <FormField
                                            label="Company"
                                            value={exp.company}
                                            onChange={(value) => handleUpdate(exp.id, "company", value)}
                                            placeholder="Google, Microsoft, etc."
                                        />
                                        <FormField
                                            label="Position"
                                            value={exp.position}
                                            onChange={(value) => handleUpdate(exp.id, "position", value)}
                                            placeholder="Senior Software Engineer"
                                        />
                                        <FormField
                                            label="Date Range"
                                            value={exp.date}
                                            onChange={(value) => handleUpdate(exp.id, "date", value)}
                                            placeholder="Jan 2020 - Present"
                                        />
                                        <FormField
                                            label="Details"
                                            value={exp.details}
                                            onChange={(value) => handleUpdate(exp.id, "details", value)}
                                            type="editor"
                                            placeholder="• Describe your responsibilities and achievements..."
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </AnimatePresence>

            {experienceList.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No experience added yet</p>
                    <Button onClick={handleAdd} size="sm" variant="link">
                        Add your first experience
                    </Button>
                </div>
            )}
        </div>
    );
};

export default ExperienceEditor;
