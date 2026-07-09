import { useEffect, useState } from "react";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function getReducedMotionMediaQueryList() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return null;
    }
    return window.matchMedia(REDUCED_MOTION_QUERY);
}
export function getReducedMotionPreference() {
    return getReducedMotionMediaQueryList()?.matches ?? false;
}
export function useReducedMotion() {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(getReducedMotionPreference);
    useEffect(() => {
        const mediaQueryList = getReducedMotionMediaQueryList();
        if (!mediaQueryList) {
            setPrefersReducedMotion(false);
            return;
        }
        setPrefersReducedMotion(mediaQueryList.matches);
        const handleChange = (event) => {
            setPrefersReducedMotion(event.matches);
        };
        if (typeof mediaQueryList.addEventListener === "function") {
            mediaQueryList.addEventListener("change", handleChange);
            return () => {
                mediaQueryList.removeEventListener("change", handleChange);
            };
        }
        mediaQueryList.addListener?.(handleChange);
        return () => {
            mediaQueryList.removeListener?.(handleChange);
        };
    }, []);
    return prefersReducedMotion;
}
//# sourceMappingURL=reducedMotion.js.map