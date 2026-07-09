import { type ReactNode } from "react";
import type { ReactElement } from "react";
import type { SpringSolverConfig } from "../core/spring-solver.js";
export declare const MODAL_BACKDROP_CLASS_NAME = "bylgja-modal-backdrop";
export interface UseModalBackdropOptions {
    show: boolean;
    className?: string | undefined;
    springConfig?: SpringSolverConfig | undefined;
    exitTarget?: number | undefined;
    onSettled?: (() => void) | undefined;
}
export interface ModalBackdropBinding {
    className: string;
    render: (children?: ReactNode) => ReactElement | null;
    state: "visible" | "hidden";
}
export declare function useModalBackdrop({ show, className, springConfig, exitTarget, onSettled, }: UseModalBackdropOptions): ModalBackdropBinding;
//# sourceMappingURL=modalBackdrop.d.ts.map