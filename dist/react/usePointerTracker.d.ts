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
export declare function usePointerTracker<T extends HTMLElement = HTMLElement>(options?: UsePointerTrackerOptions): MutableRefObject<T | null>;
//# sourceMappingURL=usePointerTracker.d.ts.map