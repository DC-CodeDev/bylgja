import { type HTMLAttributes } from "react";
import type { SpringSolverConfig } from "../core/spring-solver.js";
export interface PresenceProps extends HTMLAttributes<HTMLDivElement> {
    "data-state"?: string | undefined;
    show: boolean;
    exitConfig: SpringSolverConfig;
    exitTarget?: number;
    onSettled?: (() => void) | undefined;
}
export declare function Presence({ children, show, exitConfig, exitTarget, onSettled, ...divProps }: PresenceProps): import("react").JSX.Element | null;
//# sourceMappingURL=Presence.d.ts.map