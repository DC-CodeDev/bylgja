import type { RefObject } from "react";
export interface UseInViewOptions {
    threshold?: number;
    once?: boolean;
}
export declare function useInView<T extends Element = Element>(options?: UseInViewOptions): [RefObject<T | null>, boolean];
//# sourceMappingURL=useInView.d.ts.map