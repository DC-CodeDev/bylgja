import { useContext, useEffect, useRef, useState } from "react";
import { SmoothScrollContext } from "./SmoothScrollProvider.js";
// 0 when element's top edge is at the viewport bottom (element starts entering)
// 1 when element's top edge is at the viewport top (element fills the screen)
function computeEntryProgress(element) {
    const rect = element.getBoundingClientRect();
    const raw = (window.innerHeight - rect.top) / window.innerHeight;
    return Math.max(0, Math.min(1, raw));
}
/**
 * Tracks how far an element has entered the viewport from the bottom.
 * Returns 0 when the element's top edge touches the viewport bottom,
 * and 1 when the element's top edge reaches the viewport top.
 * Useful for element-level color interpolation or entrance effects
 * tied to scroll position.
 */
export function useElementScrollProgress() {
    const elementRef = useRef(null);
    const rafHandleRef = useRef(null);
    const [progress, setProgress] = useState(0);
    const isInRangeRef = useRef(false);
    const { scrollProgress, isProvided: hasProvider } = useContext(SmoothScrollContext);
    // Compute initial value and use IntersectionObserver to gate scroll updates.
    // Updates only run while the element is (partially) intersecting the viewport.
    useEffect(() => {
        const element = elementRef.current;
        if (!element)
            return;
        setProgress(computeEntryProgress(element));
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry)
                return;
            isInRangeRef.current = entry.isIntersecting;
            if (entry.isIntersecting) {
                setProgress(computeEntryProgress(element));
            }
        }, { threshold: 0 });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    // Native scroll listener — only when SmoothScrollProvider is absent.
    useEffect(() => {
        const element = elementRef.current;
        if (!element || hasProvider)
            return;
        const handleScroll = () => {
            if (!isInRangeRef.current)
                return;
            if (rafHandleRef.current !== null)
                return;
            rafHandleRef.current = requestAnimationFrame(() => {
                rafHandleRef.current = null;
                setProgress(computeEntryProgress(element));
            });
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (rafHandleRef.current !== null) {
                cancelAnimationFrame(rafHandleRef.current);
                rafHandleRef.current = null;
            }
        };
    }, [hasProvider]);
    // SmoothScrollProvider: recalculate on each animated frame driven by the provider.
    useEffect(() => {
        if (!hasProvider || !isInRangeRef.current)
            return;
        const element = elementRef.current;
        if (!element)
            return;
        setProgress(computeEntryProgress(element));
    }, [scrollProgress, hasProvider]);
    return [elementRef, progress];
}
//# sourceMappingURL=useElementScrollProgress.js.map