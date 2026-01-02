/**
 * PersonalInfoEditor Component
 * Form for editing personal information section with social links
 */

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    User, Mail, Phone, MapPin, Briefcase, Calendar,
    Plus, Trash2, Link, Github, Linkedin, Twitter, Globe, Camera, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import FormField from "../FormField";
import { cn } from "@/lib/utils";
import { useResumeBuilderStore } from "@/store/resumeBuilderStore";
import { CustomFieldConfig, generateId } from "@/types/resumeBuilder";
import { toast } from "sonner";

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

// Predefined social link options
const SOCIAL_LINK_PRESETS = [
    { type: "linkedin", label: "LinkedIn", icon: Linkedin, placeholder: "https://linkedin.com/in/username" },
    { type: "github", label: "GitHub", icon: Github, placeholder: "https://github.com/username" },
    { type: "twitter", label: "Twitter", icon: Twitter, placeholder: "https://twitter.com/username" },
    { type: "portfolio", label: "Portfolio", icon: Globe, placeholder: "https://yourportfolio.com" },
    { type: "website", label: "Website", icon: Globe, placeholder: "https://yourwebsite.com" },
    { type: "other", label: "Custom Link", icon: Link, placeholder: "https://..." },
];

const getIconComponent = (iconType?: string) => {
    const found = SOCIAL_LINK_PRESETS.find(opt => opt.type === iconType);
    return found?.icon || Link;
};

const PersonalInfoEditor = () => {
    const { activeDocument, updatePersonalInfo } = useResumeBuilderStore();
    const personal = activeDocument?.personal;
    const [showAddLink, setShowAddLink] = useState(false);
    const [selectedLinkType, setSelectedLinkType] = useState("linkedin");
    const [customLinkLabel, setCustomLinkLabel] = useState("");
    const photoInputRef = useRef<HTMLInputElement>(null);

    if (!personal) return null;

    const customFields = personal.customFields || [];

    const fields = [
        { key: "name", label: "Full Name", icon: User, placeholder: "John Doe" },
        { key: "title", label: "Job Title", icon: Briefcase, placeholder: "Software Engineer" },
        { key: "email", label: "Email", icon: Mail, placeholder: "john@example.com" },
        { key: "phone", label: "Phone", icon: Phone, placeholder: "+1 (555) 000-0000" },
        { key: "location", label: "Location", icon: MapPin, placeholder: "New York, NY" },
        { key: "employmentStatus", label: "Status", icon: Calendar, placeholder: "Available for hire" },
    ];

    // Photo upload handler
    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            toast.error("Please upload an image file (JPG, PNG, etc.)");
            return;
        }

        // Validate file size (5MB max)
        if (file.size > MAX_PHOTO_SIZE) {
            toast.error("Image too large. Maximum size is 5MB.");
            return;
        }

        // Convert to base64
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            updatePersonalInfo({ photo: base64 });
            toast.success("Photo uploaded successfully!");
        };
        reader.onerror = () => {
            toast.error("Failed to read image file.");
        };
        reader.readAsDataURL(file);
    };

    const handleRemovePhoto = () => {
        updatePersonalInfo({ photo: "" });
        if (photoInputRef.current) {
            photoInputRef.current.value = "";
        }
    };

    const handleAddLink = () => {
        const preset = SOCIAL_LINK_PRESETS.find(p => p.type === selectedLinkType);
        const label = selectedLinkType === "other" ? customLinkLabel : preset?.label || "Link";

        if (selectedLinkType === "other" && !customLinkLabel.trim()) return;

        const newField: CustomFieldConfig = {
            id: generateId(),
            label,
            value: "",
            icon: selectedLinkType,
            visible: true,
        };

        updatePersonalInfo({
            customFields: [...customFields, newField],
        });

        setCustomLinkLabel("");
        setSelectedLinkType("linkedin");
        setShowAddLink(false);
    };

    const handleUpdateCustomField = (id: string, value: string) => {
        const updated = customFields.map(field =>
            field.id === id ? { ...field, value } : field
        );
        updatePersonalInfo({ customFields: updated });
    };

    const handleDeleteCustomField = (id: string) => {
        const updated = customFields.filter(field => field.id !== id);
        updatePersonalInfo({ customFields: updated });
    };

    const selectedPreset = SOCIAL_LINK_PRESETS.find(p => p.type === selectedLinkType);

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Personal Information
            </h2>

            {/* Standard Fields */}
            <div className="space-y-3">
                {fields.map((field, index) => (
                    <motion.div
                        key={field.key}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={cn(
                            "flex items-start gap-3 p-3",
                            "bg-white dark:bg-neutral-900",
                            "rounded-lg border border-gray-200 dark:border-neutral-800"
                        )}
                    >
                        <div className="mt-2 text-gray-400">
                            <field.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                            <FormField
                                label={field.label}
                                value={(personal[field.key as keyof typeof personal] as string) || ""}
                                onChange={(value) =>
                                    updatePersonalInfo({ [field.key]: value })
                                }
                                placeholder={field.placeholder}
                            />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Social Links Section */}
            <div className="pt-4 border-t border-gray-200 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Social Links
                    </h3>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddLink(!showAddLink)}
                        className="gap-1"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add Link
                    </Button>
                </div>

                {/* Add Link Form */}
                <AnimatePresence>
                    {showAddLink && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                        >
                            <div className="space-y-3">
                                <Select value={selectedLinkType} onValueChange={setSelectedLinkType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SOCIAL_LINK_PRESETS.map((opt) => (
                                            <SelectItem key={opt.type} value={opt.type}>
                                                <div className="flex items-center gap-2">
                                                    <opt.icon className="h-4 w-4" />
                                                    {opt.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {selectedLinkType === "other" && (
                                    <Input
                                        placeholder="Link label (e.g. Dribbble)"
                                        value={customLinkLabel}
                                        onChange={(e) => setCustomLinkLabel(e.target.value)}
                                    />
                                )}

                                <div className="flex gap-2 justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowAddLink(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleAddLink}
                                        disabled={selectedLinkType === "other" && !customLinkLabel.trim()}
                                    >
                                        Add {selectedPreset?.label || "Link"}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Links List */}
                <AnimatePresence mode="popLayout">
                    {customFields.map((field, index) => {
                        const IconComponent = getIconComponent(field.icon);
                        const preset = SOCIAL_LINK_PRESETS.find(p => p.type === field.icon);

                        return (
                            <motion.div
                                key={field.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ delay: index * 0.03 }}
                                className={cn(
                                    "flex items-start gap-3 p-3 mb-2",
                                    "bg-white dark:bg-neutral-900",
                                    "rounded-lg border border-gray-200 dark:border-neutral-800"
                                )}
                            >
                                <div className="mt-2 text-gray-400">
                                    <IconComponent className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                    <FormField
                                        label={field.label}
                                        value={field.value || ""}
                                        onChange={(value) => handleUpdateCustomField(field.id, value)}
                                        placeholder={preset?.placeholder || "Enter URL"}
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteCustomField(field.id)}
                                    className="text-red-500 hover:text-red-600 mt-5"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {customFields.length === 0 && !showAddLink && (
                    <p className="text-sm text-gray-500 text-center py-4">
                        Add links to LinkedIn, GitHub, Portfolio, etc.
                    </p>
                )}
            </div>
        </div>
    );
};

export default PersonalInfoEditor;
