import type { RefObject } from "react";
/**
 * Tracks how far an element has entered the viewport from the bottom.
 * Returns 0 when the element's top edge touches the viewport bottom,
 * and 1 when the element's top edge reaches the viewport top.
 * Useful for element-level color interpolation or entrance effects
 * tied to scroll position.
 */
export declare function useElementScrollProgress<T extends HTMLElement = HTMLElement>(): [
    RefObject<T | null>,
    number
];
//# sourceMappingURL=useElementScrollProgress.d.ts.map