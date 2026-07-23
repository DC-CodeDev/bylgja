import type { ReactNode, SVGProps } from "react";
import type { SpringSolverConfig } from "../core/spring-solver.js";
export type SvgStrokeDirection = "draw" | "undraw";
export interface SvgStrokePresenceProps {
    children?: ReactNode;
    direction: SvgStrokeDirection;
    path?: string;
    pathClassName?: string;
    pathLength?: number;
    pathProps?: SVGProps<SVGPathElement>;
    show: boolean;
    springConfig?: SpringSolverConfig;
    svgClassName?: string;
    svgLabel?: string;
    svgProps?: SVGProps<SVGSVGElement>;
    viewBox: string;
    wrapperClassName?: string;
}
export declare function SvgStrokePresence({ children, direction, path, pathClassName, pathLength, pathProps, show, springConfig, svgClassName, svgLabel, svgProps, viewBox, wrapperClassName, }: SvgStrokePresenceProps): import("react").JSX.Element;
//# sourceMappingURL=SvgStrokePresence.d.ts.map