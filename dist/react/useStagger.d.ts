import type { CSSProperties } from "react";
export type StaggerCurve = (index: number, count: number) => number;
export interface UseStaggerOptions {
    count: number;
    staggerDelay?: number;
    curve?: StaggerCurve;
}
export interface StaggerBinding {
    style: CSSProperties;
}
export declare function linearStagger(index: number, count: number): number;
export declare function centerOutStagger(index: number, count: number): number;
export declare function useStagger(options: UseStaggerOptions): StaggerBinding[];
//# sourceMappingURL=useStagger.d.ts.map