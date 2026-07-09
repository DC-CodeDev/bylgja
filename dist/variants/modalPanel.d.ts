import { type ReactNode } from "react";
import type { ReactElement } from "react";
import type { SpringSolverConfig } from "../core/spring-solver.js";
export declare const MODAL_PANEL_CLASS_NAME = "bylgja-modal-panel";
export interface UseModalPanelOptions {
    show: boolean;
    className?: string | undefined;
    springConfig?: SpringSolverConfig | undefined;
    exitTarget?: number | undefined;
    onSettled?: (() => void) | undefined;
}
export interface ModalPanelBinding {
    className: string;
    render: (children: ReactNode) => ReactElement | null;
    state: "visible" | "hidden";
}
export declare function useModalPanel({ show, className, springConfig, exitTarget, onSettled, }: UseModalPanelOptions): ModalPanelBinding;
//# sourceMappingURL=modalPanel.d.ts.map