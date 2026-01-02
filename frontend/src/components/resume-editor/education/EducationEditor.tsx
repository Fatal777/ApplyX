/**
 * EducationEditor Component
 * Form for editing education section of resume
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, GraduationCap, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import FormField from "../FormField";
import { cn } from "@/lib/utils";
import { useResumeBuilderStore } from "@/store/resumeBuilderStore";
import { EducationEntry, generateId } from "@/types/resumeBuilder";

const EducationEditor = () => {
    const { activeDocument, addEducation, updateEducation, deleteEducation } = useResumeBuilderStore();
    const educationList = activeDocument?.education || [];
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleAdd = () => {
        const newEntry: EducationEntry = {
            id: generateId(),
            school: "",
            major: "",
            degree: "",
            startDate: "",
            endDate: "",
            gpa: "",
            description: "",
            visible: true,
        };
        addEducation(newEntry);
        setExpandedId(newEntry.id);
    };

    const handleUpdate = (id: string, field: string, value: string) => {
        const entry = educationList.find((e) => e.id === id);
        if (entry) {
            updateEducation({ ...entry, [field]: value });
        }
    };

    return (
        <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Education
                </h2>
                <Button onClick={handleAdd} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                </Button>
            </div>

            <AnimatePresence mode="popLayout">
                {educationList.map((edu, index) => (
                    <motion.div
                        key={edu.id}
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
                            onClick={() => setExpandedId(expandedId === edu.id ? null : edu.id)}
                        >
                            <div className="flex items-center gap-3">
                                <GraduationCap className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="font-medium text-sm">
                                        {edu.school || "New Education"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {edu.degree} {edu.major ? `in ${edu.major}` : ""}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteEducation(edu.id);
                                    }}
                                    className="text-red-500 hover:text-red-600"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                {expandedId === edu.id ? (
                                    <ChevronUp className="h-4 w-4 text-gray-400" />
                                ) : (
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <AnimatePresence>
                            {expandedId === edu.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-gray-200 dark:border-neutral-800"
                                >
                                    <div className="p-4 space-y-3">
                                        <FormField
                                            label="School/University"
                                            value={edu.school}
                                            onChange={(value) => handleUpdate(edu.id, "school", value)}
                                            placeholder="Stanford University"
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            <FormField
                                                label="Degree"
                                                value={edu.degree}
                                                onChange={(value) => handleUpdate(edu.id, "degree", value)}
                                                placeholder="Bachelor's"
                                            />
                                            <FormField
                                                label="Major"
                                                value={edu.major}
                                                onChange={(value) => handleUpdate(edu.id, "major", value)}
                                                placeholder="Computer Science"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <FormField
                                                label="Start Date"
                                                value={edu.startDate}
                                                onChange={(value) => handleUpdate(edu.id, "startDate", value)}
                                                type="date"
                                            />
                                            <FormField
                                                label="End Date"
                                                value={edu.endDate}
                                                onChange={(value) => handleUpdate(edu.id, "endDate", value)}
                                                type="date"
                                            />
                                        </div>
                                        <FormField
                                            label="GPA"
                                            value={edu.gpa || ""}
                                            onChange={(value) => handleUpdate(edu.id, "gpa", value)}
                                            placeholder="3.8/4.0"
                                        />
                                        <FormField
                                            label="Description"
                                            value={edu.description || ""}
                                            onChange={(value) => handleUpdate(edu.id, "description", value)}
                                            type="textarea"
                                            placeholder="Relevant coursework, achievements..."
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </AnimatePresence>

            {educationList.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No education added yet</p>
                    <Button onClick={handleAdd} size="sm" variant="link">
                        Add your first education
                    </Button>
                </div>
            )}
        </div>
    );
};

export default EducationEditor;
