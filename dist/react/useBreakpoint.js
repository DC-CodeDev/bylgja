import { useEffect, useState } from "react";
export const BREAKPOINTS = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    "2xl": 1536,
};
const BREAKPOINT_ORDER = ["2xl", "xl", "lg", "md", "sm"];
function resolveActiveBreakpoint(mediaQueries) {
    for (const breakpoint of BREAKPOINT_ORDER) {
        if (mediaQueries.get(breakpoint)?.matches) {
            return breakpoint;
        }
    }
    return "base";
}
export function useBreakpoint() {
    const [breakpoint, setBreakpoint] = useState("base");
    useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return;
        }
        const mediaQueries = new Map();
        for (const [name, minWidth] of Object.entries(BREAKPOINTS)) {
            mediaQueries.set(name, window.matchMedia(`(min-width: ${minWidth}px)`));
        }
        const updateBreakpoint = () => {
            const next = resolveActiveBreakpoint(mediaQueries);
            setBreakpoint((current) => (current === next ? current : next));
        };
        const listeners = Array.from(mediaQueries.values()).map((query) => {
            const handleChange = () => {
                updateBreakpoint();
            };
            query.addEventListener("change", handleChange);
            return {
                handleChange,
                query,
            };
        });
        updateBreakpoint();
        return () => {
            for (const { handleChange, query } of listeners) {
                query.removeEventListener("change", handleChange);
            }
        };
    }, []);
    return breakpoint;
}
//# sourceMappingURL=useBreakpoint.js.map