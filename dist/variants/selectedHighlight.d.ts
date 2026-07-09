import type { MutableRefObject } from "react";
import type { SpringSolverConfig } from "../core/spring-solver.js";
export declare const SELECTED_HIGHLIGHT_CLASS_NAME = "bylgja-selected-highlight";
export interface UseSelectedHighlightOptions {
    className?: string | undefined;
    onSettled?: (() => void) | undefined;
    selected: boolean;
    springConfig?: SpringSolverConfig | undefined;
}
export interface SelectedHighlightBinding<T extends HTMLElement = HTMLElement> {
    className: string;
    "data-selected": "false" | "true";
    ref: MutableRefObject<T | null>;
}
export declare function useSelectedHighlight<T extends HTMLElement = HTMLElement>({ className, onSettled, selected, springConfig, }: UseSelectedHighlightOptions): SelectedHighlightBinding<T>;
//# sourceMappingURL=selectedHighlight.d.ts.map