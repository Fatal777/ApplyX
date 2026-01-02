# Scroll Issue Fix Documentation

## Problem

Trackpad/touchpad scrolling was not working in the Resume Editor page, while scrollbar clicks worked fine. This issue affected:
- Left editor panel
- Right preview panel
- Other similar components (mock interview selection)

## Root Cause

The `ResizablePanelGroup` component from `react-resizable-panels` library appears to capture/intercept wheel events, preventing native browser scroll behavior from working properly.

**Diagnostic checks confirmed:**
1. Wheel events WERE being received by the scroll container (confirmed via `addEventListener('wheel', ...)`)
2. Container HAD proper overflow (`overflow-y: auto`)
3. Content DID overflow the container (`scrollHeight > clientHeight`)
4. But native scroll was NOT happening

## Solution

Added **explicit wheel event handlers** that manually scroll the container:

```tsx
const scrollContainerRef = useRef<HTMLDivElement>(null);

const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop += e.deltaY;
        scrollContainerRef.current.scrollLeft += e.deltaX;
    }
};

return (
    <div 
        ref={scrollContainerRef}
        className="overflow-auto"
        onWheel={handleWheel}
    >
        {/* content */}
    </div>
);
```

## Files Modified

1. **`EditorSidebar.tsx`** - Added wheel handler for left editor panel
2. **`ResumeEditor.tsx`** - Added wheel handler for right preview panel

## Other Requirements for Scroll to Work

1. **Container must have constrained height** - Use `h-full` or explicit height
2. **Content must NOT use `h-full`** - This constrains content to container size
3. **Use `absolute inset-0` pattern** for reliable scroll containers:
   ```tsx
   <div className="relative h-full">
       <div className="absolute inset-0 overflow-auto">
           {/* content here grows naturally */}
       </div>
   </div>
   ```

## Verification

Run this in browser console to check if scroll should work:

```js
const el = document.querySelector('.overflow-auto, .overflow-y-auto');
console.log('scrollHeight:', el.scrollHeight, '> clientHeight:', el.clientHeight);
// scrollHeight should be > clientHeight for scroll to work
```

## Browser Tested

- Chrome (Windows 11)

## Date

2026-01-03
