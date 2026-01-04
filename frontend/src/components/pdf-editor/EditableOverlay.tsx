import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface EditableOverlayProps {
    initialValue: string;
    x: number;
    y: number;
    width: number;
    height: number; // Initial height
    fontSize?: number;
    fontFamily?: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    className?: string;
    isMultiline?: boolean;
}

export function EditableOverlay({
    initialValue,
    x,
    y,
    width,
    height,
    fontSize = 12,
    fontFamily = "sans-serif",
    onChange,
    onBlur,
    className,
    isMultiline = false,
}: EditableOverlayProps) {
    const [value, setValue] = useState(initialValue);
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Sync value if prop changes (e.g. from sidebar)
    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        onChange(newValue);

        // Auto-resize height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    };

    return (
        <div
            style={{
                position: "absolute",
                left: x,
                top: y,
                width: Math.max(width, 50), // Min width
                zIndex: 10,
            }}
            className={cn("group", className)}
        >
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                    setIsFocused(false);
                    onBlur?.();
                }}
                className={cn(
                    "w-full resize-none overflow-hidden bg-transparent border-none p-0 focus:ring-1 focus:ring-primary focus:bg-white/90 transition-colors",
                    !isFocused && "hover:bg-blue-50/30", // Gentle hover effect
                    // Hide text when not focused to show underlying PDF text? 
                    // No, we want to show OUR text because it might be edited matching the PDF
                    // But to align perfectly, we usually make text transparent and only show cursor/caret/bg?
                    // For this Hybrid approach, we'll try to match font and show it.
                    "text-transparent selection:text-white caret-black focus:text-black",
                )}
                style={{
                    fontSize: `${fontSize}px`,
                    fontFamily,
                    minHeight: height,
                    lineHeight: 1.2, // Approximate PDF line height
                    // Debugging border
                    // border: "1px solid red",
                }}
                spellCheck={false}
            />
            {/* 
         Technique: 
         When NOT focused: Text is transparent (PDF text shows through).
         When focused: Text becomes black, background white (to editing clearly).
      */}
            <style>{`
        textarea:focus {
           color: black !important;
        }
      `}</style>
        </div>
    );
}
