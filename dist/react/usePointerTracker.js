import { useEffect, useRef } from "react";
const POINTER_X_PROPERTY = "--pointer-x";
const POINTER_Y_PROPERTY = "--pointer-y";
const POINTER_NORMALIZED_X_PROPERTY = "--pointer-normalized-x";
const POINTER_NORMALIZED_Y_PROPERTY = "--pointer-normalized-y";
const POINTER_INSIDE_PROPERTY = "--pointer-inside";
export function usePointerTracker(options) {
    const elementRef = useRef(null);
    const rectRef = useRef(null);
    const optionsRef = useRef(options);
    const lastPositionRef = useRef(null);
    optionsRef.current = options;
    useEffect(() => {
        const element = elementRef.current;
        if (!element) {
            return;
        }
        const handlePointerEnter = () => {
            const rect = element.getBoundingClientRect();
            rectRef.current = rect;
            element.style.setProperty(POINTER_INSIDE_PROPERTY, "1");
        };
        const handlePointerMove = (event) => {
            const rect = rectRef.current;
            if (!rect) {
                return;
            }
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const normalizedX = rect.width > 0 ? x / rect.width : 0;
            const normalizedY = rect.height > 0 ? y / rect.height : 0;
            lastPositionRef.current = { x, y, normalizedX, normalizedY };
            element.style.setProperty(POINTER_X_PROPERTY, String(x));
            element.style.setProperty(POINTER_Y_PROPERTY, String(y));
            element.style.setProperty(POINTER_NORMALIZED_X_PROPERTY, String(normalizedX));
            element.style.setProperty(POINTER_NORMALIZED_Y_PROPERTY, String(normalizedY));
            if (optionsRef.current?.onMove) {
                optionsRef.current.onMove({ x, y, normalizedX, normalizedY, isInside: true });
            }
        };
        const handlePointerLeave = () => {
            element.style.setProperty(POINTER_INSIDE_PROPERTY, "0");
            if (optionsRef.current?.onMove) {
                // Use the last known position so callers receive the real cursor coordinates
                // at the moment the pointer left, rather than zeros. If no pointermove has
                // fired yet (pointerenter → pointerleave with no movement), fall back to
                // zeros as the initial uncomputed state.
                const last = lastPositionRef.current ?? { x: 0, y: 0, normalizedX: 0, normalizedY: 0 };
                optionsRef.current.onMove({
                    ...last,
                    isInside: false,
                });
            }
        };
        const resizeObserver = new ResizeObserver(() => {
            const newRect = element.getBoundingClientRect();
            rectRef.current = newRect;
        });
        element.addEventListener("pointerenter", handlePointerEnter);
        element.addEventListener("pointermove", handlePointerMove);
        element.addEventListener("pointerleave", handlePointerLeave);
        resizeObserver.observe(element);
        return () => {
            element.removeEventListener("pointerenter", handlePointerEnter);
            element.removeEventListener("pointermove", handlePointerMove);
            element.removeEventListener("pointerleave", handlePointerLeave);
            resizeObserver.disconnect();
        };
    }, []);
    return elementRef;
}
//# sourceMappingURL=usePointerTracker.js.map