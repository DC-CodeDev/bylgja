import type { MutableRefObject } from "react";
export interface UseScrollProgressOptions {
    /**
     * Umbral de intersección del IntersectionObserver.
     * Fracción del elemento que debe estar visible para que
     * scroll-visible se considere 1. Por defecto 0.1 (10 %).
     */
    threshold?: number;
}
export declare function useScrollProgress<T extends HTMLElement = HTMLElement>(options?: UseScrollProgressOptions): MutableRefObject<T | null>;
//# sourceMappingURL=useScrollProgress.d.ts.map