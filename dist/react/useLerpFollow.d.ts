import type { RefObject } from "react";
export interface UseLerpFollowOptions {
    /** Interpolation factor per frame [0, 1]. Lower = more inertia. Default: 0.1. */
    factor?: number;
    /**
     * When false, the RAF loop stops but the cursor target keeps updating in the
     * background. On re-activation, current snaps to the live target so there is
     * no jump from a stale position.
     */
    active?: boolean;
}
/**
 * Attaches a ref to a `position:fixed; pointer-events:none` element and drives
 * it toward the cursor using linear interpolation (lerp) on each RAF frame —
 * not spring physics. The element must set `top:0; left:0` in CSS; the hook
 * writes `transform: translate3d(x, y, 0)` directly.
 *
 * prefers-reduced-motion: snaps immediately to cursor position, no animation.
 */
export declare function useLerpFollow<T extends HTMLElement = HTMLElement>(options?: UseLerpFollowOptions): RefObject<T | null>;
//# sourceMappingURL=useLerpFollow.d.ts.map