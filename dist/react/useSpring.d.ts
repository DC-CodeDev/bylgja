import type { MutableRefObject } from "react";
import type { SpringSolverConfig } from "../core/spring-solver.js";
export interface UseSpringOptions {
    targetValue: number;
    config: SpringSolverConfig;
    initialValue?: number;
    onSettled?: () => void;
    startDelay?: number;
}
export declare function useSpring<T extends HTMLElement = HTMLElement>(options: UseSpringOptions): MutableRefObject<T | null>;
//# sourceMappingURL=useSpring.d.ts.map