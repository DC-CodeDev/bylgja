import { type ReactNode } from "react";
import type { ReactElement } from "react";
import type { SpringSolverConfig } from "../core/spring-solver.js";
export declare const FADE_SCALE_CLASS_NAME = "bylgja-fade-scale";
export interface UseFadeScaleOptions {
    show: boolean;
    className?: string | undefined;
    springConfig?: SpringSolverConfig | undefined;
    exitTarget?: number | undefined;
    onSettled?: (() => void) | undefined;
}
export interface FadeScaleBinding {
    className: string;
    render: (children: ReactNode) => ReactElement | null;
    state: "visible" | "hidden";
}
export declare function useFadeScale({ show, className, springConfig, exitTarget, onSettled, }: UseFadeScaleOptions): FadeScaleBinding;
//# sourceMappingURL=fadeScale.d.ts.map