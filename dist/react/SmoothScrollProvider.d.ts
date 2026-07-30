import { type ReactNode } from "react";
interface SmoothScrollContextValue {
    scrollProgress: number;
    isProvided: boolean;
}
export declare const SmoothScrollContext: import("react").Context<SmoothScrollContextValue>;
export declare function useSmoothScrollProgress(): number;
export interface SmoothScrollProviderProps {
    children: ReactNode;
    sensitivity?: number;
}
export declare function SmoothScrollProvider({ children, sensitivity, }: SmoothScrollProviderProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=SmoothScrollProvider.d.ts.map