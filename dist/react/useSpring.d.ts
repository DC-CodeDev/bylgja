import type { MutableRefObject } from "react";
import type { SpringSolverConfig } from "../core/spring-solver.js";
export type UseSpringConfig = SpringSolverConfig;
export declare function useSpring<T extends HTMLElement = HTMLElement>(targetValue: number, config: UseSpringConfig, initialValue?: number, onSettled?: () => void): MutableRefObject<T | null>;
//# sourceMappingURL=useSpring.d.ts.map