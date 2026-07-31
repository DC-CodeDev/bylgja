import { type ReactNode } from "react";
import type { ReactElement } from "react";
import type { SpringSolverConfig } from "../core/spring-solver.js";
export declare const NAV_SLIDE_CLASS_NAME = "bylgja-nav-slide";
export interface UseNavSlideOptions {
    show: boolean;
    className?: string | undefined;
    springConfig?: SpringSolverConfig | undefined;
    exitTarget?: number | undefined;
    onSettled?: (() => void) | undefined;
}
export interface NavSlideBinding {
    className: string;
    render: (children: ReactNode) => ReactElement | null;
    state: "visible" | "hidden";
}
export declare function useNavSlide({ show, className, springConfig, exitTarget, onSettled, }: UseNavSlideOptions): NavSlideBinding;
//# sourceMappingURL=navSlide.d.ts.map