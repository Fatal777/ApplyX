/**
 * RichTextEditor Component
 * Tiptap-based rich text editor for resume content
 */

import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { ListItem } from "@tiptap/extension-list-item";
import { BulletList } from "@tiptap/extension-bullet-list";
import { OrderedList } from "@tiptap/extension-ordered-list";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    AlignLeft,
    AlignCenter,
    AlignRight,
    List,
    ListOrdered,
    Undo,
    Redo,
    PaintBucket,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
    content?: string;
    onChange: (content: string) => void;
    placeholder?: string;
}

// Color palette
const COLORS = [
    { label: "Black", value: "#000000" },
    { label: "Dark Gray", value: "#333333" },
    { label: "Gray", value: "#666666" },
    { label: "Red", value: "#FF0000" },
    { label: "Orange", value: "#FF4D00" },
    { label: "Yellow", value: "#FFCC00" },
    { label: "Green", value: "#00CC00" },
    { label: "Cyan", value: "#00CCCC" },
    { label: "Blue", value: "#0066FF" },
    { label: "Purple", value: "#6600FF" },
];

// Menu Button component
interface MenuButtonProps {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    tooltip?: string;
}

const MenuButton = ({
    onClick,
    isActive = false,
    disabled = false,
    children,
    tooltip,
}: MenuButtonProps) => {
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
    };

    return (
        <Button
            onMouseDown={(e) => e.preventDefault()}
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            className={cn(
                "h-8 w-8 rounded-md transition-all duration-200 p-0",
                isActive
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "hover:bg-primary/5",
                disabled ? "opacity-50" : ""
            )}
            onClick={handleClick}
            disabled={disabled}
            title={tooltip}
        >
            {children}
        </Button>
    );
};

// Text Color Button
const TextColorButton = ({ editor }: { editor: any }) => {
    const [activeColor, setActiveColor] = React.useState<string | null>(null);

    React.useEffect(() => {
        const color = editor?.getAttributes("textStyle").color;
        setActiveColor(color);
    }, [editor]);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-md hover:bg-primary/5"
                    title="Text Color"
                >
                    <PaintBucket
                        className="h-4 w-4"
                        style={{ color: activeColor || "currentColor" }}
                    />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3">
                <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Text Color</span>
                    <div className="grid grid-cols-5 gap-1">
                        <button
                            className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted"
                            onClick={() => {
                                editor.chain().focus().unsetColor().run();
                                setActiveColor(null);
                            }}
                        >
                            <span className="text-sm text-muted-foreground">/</span>
                        </button>
                        {COLORS.map((color) => (
                            <button
                                key={color.value}
                                className={cn(
                                    "h-6 w-6 rounded border hover:scale-110 transition-transform",
                                    activeColor === color.value && "ring-2 ring-primary ring-offset-1"
                                )}
                                style={{ backgroundColor: color.value }}
                                onClick={() => {
                                    editor.chain().focus().setColor(color.value).run();
                                    setActiveColor(color.value);
                                }}
                                title={color.label}
                            />
                        ))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

const RichTextEditor = ({
    content = "",
    onChange,
    placeholder,
}: RichTextEditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: false,
                orderedList: false,
                listItem: false,
                heading: { levels: [1, 2, 3] },
            }),
            BulletList.configure({
                HTMLAttributes: { class: "list-disc pl-4" },
            }),
            OrderedList.configure({
                HTMLAttributes: { class: "list-decimal pl-4" },
            }),
            ListItem,
            TextAlign.configure({
                types: ["heading", "paragraph"],
                alignments: ["left", "center", "right"],
            }),
            TextStyle,
            Underline,
            Color,
            Highlight.configure({ multicolor: true }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: cn(
                    "prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2",
                    "dark:prose-invert"
                ),
                placeholder: placeholder || "Start typing...",
            },
        },
    });

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    if (!editor) {
        return null;
    }

    return (
        <div
            className={cn(
                "rounded-lg overflow-hidden border shadow-sm",
                "bg-card border-gray-200 dark:bg-neutral-900/30 dark:border-neutral-800"
            )}
        >
            {/* Toolbar */}
            <div
                className={cn(
                    "border-b px-2 py-1 flex flex-wrap items-center gap-2",
                    "bg-muted/30 dark:bg-neutral-900/50 dark:border-neutral-800"
                )}
            >
                {/* Text formatting */}
                <div className="flex items-center gap-0.5">
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        isActive={editor.isActive("bold")}
                        tooltip="Bold"
                    >
                        <Bold className="h-4 w-4" />
                    </MenuButton>
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        isActive={editor.isActive("italic")}
                        tooltip="Italic"
                    >
                        <Italic className="h-4 w-4" />
                    </MenuButton>
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        isActive={editor.isActive("underline")}
                        tooltip="Underline"
                    >
                        <UnderlineIcon className="h-4 w-4" />
                    </MenuButton>
                    <TextColorButton editor={editor} />
                </div>

                <div className="h-4 w-px bg-border/60" />

                {/* Alignment */}
                <div className="flex items-center gap-0.5">
                    <MenuButton
                        onClick={() => editor.chain().focus().setTextAlign("left").run()}
                        isActive={editor.isActive({ textAlign: "left" })}
                        tooltip="Align Left"
                    >
                        <AlignLeft className="h-4 w-4" />
                    </MenuButton>
                    <MenuButton
                        onClick={() => editor.chain().focus().setTextAlign("center").run()}
                        isActive={editor.isActive({ textAlign: "center" })}
                        tooltip="Align Center"
                    >
                        <AlignCenter className="h-4 w-4" />
                    </MenuButton>
                    <MenuButton
                        onClick={() => editor.chain().focus().setTextAlign("right").run()}
                        isActive={editor.isActive({ textAlign: "right" })}
                        tooltip="Align Right"
                    >
                        <AlignRight className="h-4 w-4" />
                    </MenuButton>
                </div>

                <div className="h-4 w-px bg-border/60" />

                {/* Lists */}
                <div className="flex items-center gap-0.5">
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        isActive={editor.isActive("bulletList")}
                        tooltip="Bullet List"
                    >
                        <List className="h-4 w-4" />
                    </MenuButton>
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        isActive={editor.isActive("orderedList")}
                        tooltip="Numbered List"
                    >
                        <ListOrdered className="h-4 w-4" />
                    </MenuButton>
                </div>

                <div className="h-4 w-px bg-border/60" />

                {/* Undo/Redo */}
                <div className="flex items-center gap-0.5">
                    <MenuButton
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        tooltip="Undo"
                    >
                        <Undo className="h-4 w-4" />
                    </MenuButton>
                    <MenuButton
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        tooltip="Redo"
                    >
                        <Redo className="h-4 w-4" />
                    </MenuButton>
                </div>
            </div>

            {/* Editor Content */}
            <EditorContent editor={editor} />
        </div>
    );
};

export default RichTextEditor;
