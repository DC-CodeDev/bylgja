import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";

export interface PointerPosition {
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
  isInside: boolean;
}

export interface UsePointerTrackerOptions {
  onMove?: (position: PointerPosition) => void;
}

const POINTER_X_PROPERTY = "--pointer-x";
const POINTER_Y_PROPERTY = "--pointer-y";
const POINTER_NORMALIZED_X_PROPERTY = "--pointer-normalized-x";
const POINTER_NORMALIZED_Y_PROPERTY = "--pointer-normalized-y";
const POINTER_INSIDE_PROPERTY = "--pointer-inside";

export function usePointerTracker<T extends HTMLElement = HTMLElement>(
  options?: UsePointerTrackerOptions,
): MutableRefObject<T | null> {
  const elementRef = useRef<T | null>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    const handlePointerEnter = (): void => {
      const rect = element.getBoundingClientRect();
      rectRef.current = rect;
      element.style.setProperty(POINTER_INSIDE_PROPERTY, "1");
    };

    const handlePointerMove = (event: PointerEvent): void => {
      const rect = rectRef.current;
      if (!rect) {
        return;
      }

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const normalizedX = rect.width > 0 ? x / rect.width : 0;
      const normalizedY = rect.height > 0 ? y / rect.height : 0;

      element.style.setProperty(POINTER_X_PROPERTY, String(x));
      element.style.setProperty(POINTER_Y_PROPERTY, String(y));
      element.style.setProperty(POINTER_NORMALIZED_X_PROPERTY, String(normalizedX));
      element.style.setProperty(POINTER_NORMALIZED_Y_PROPERTY, String(normalizedY));

      if (optionsRef.current?.onMove) {
        optionsRef.current.onMove({ x, y, normalizedX, normalizedY, isInside: true });
      }
    };

    const handlePointerLeave = (): void => {
      element.style.setProperty(POINTER_INSIDE_PROPERTY, "0");

      if (optionsRef.current?.onMove) {
        const rect = rectRef.current;
        if (rect) {
          // Fire a final move report with isInside=false so callers know the cursor left,
          // but keep the last known positional values unchanged.
          optionsRef.current.onMove({
            x: 0,
            y: 0,
            normalizedX: 0,
            normalizedY: 0,
            isInside: false,
          });
        }
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
