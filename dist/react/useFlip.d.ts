import type { MutableRefObject } from "react";
import { type WavePropagationConfig } from "../core/wave-propagation.js";
interface FlipItem {
    id: string | number;
}
export interface UseFlipOptions {
    staggerMode?: "none" | "index" | "distance";
    propagationConfig?: WavePropagationConfig;
}
export declare function useFlip<T extends HTMLElement, TItem extends FlipItem>(containerRef: MutableRefObject<T | null>, items: readonly TItem[], options?: UseFlipOptions): void;
export {};
//# sourceMappingURL=useFlip.d.ts.map