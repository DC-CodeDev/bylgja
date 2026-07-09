import { type ReactNode } from "react";
import type { ReactElement } from "react";
import type { SpringSolverConfig } from "../core/spring-solver.js";
export declare const FADE_CLASS_NAME = "bylgja-fade";
export declare const FADE_SPRING_CLASS_NAME = "bylgja-fade--spring";
export declare const FADE_TWEEN_CLASS_NAME = "bylgja-fade--tween";
export type FadeStrategy = "presence" | "tween";
export type FadeState = "visible" | "hidden";
export interface UseFadeOptions {
    show: boolean;
    strategy?: FadeStrategy;
    className?: string | undefined;
    springConfig?: SpringSolverConfig | undefined;
    exitTarget?: number | undefined;
    onSettled?: (() => void) | undefined;
}
export interface FadeBinding {
    className: string;
    props: {
        className: string;
        "data-state": FadeState;
    };
    render: (children: ReactNode) => ReactElement | null;
    state: FadeState;
}
export declare function useFade({ show, strategy, className, springConfig, exitTarget, onSettled, }: UseFadeOptions): FadeBinding;
//# sourceMappingURL=fade.d.ts.map