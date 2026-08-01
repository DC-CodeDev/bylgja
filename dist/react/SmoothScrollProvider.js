import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useRef, useState, } from "react";
import { createRafSpringDriver } from "../core/raf-driver.js";
import { getReducedMotionPreference } from "../a11y/reducedMotion.js";
// Spring physics — adjust these to tune the scroll feel before committing values
const STIFFNESS = 120;
const DAMPING = 20;
const MASS = 1;
const MAX_DELTA_TIME = 0.1;
const DEFAULT_SENSITIVITY = 1;
// Internal-only — consumed within src/react/ by useScrollProgress.
// Do NOT re-export from src/index.ts.
export const SmoothScrollContext = createContext({
    scrollProgress: 0,
    isProvided: false,
});
export function useSmoothScrollProgress() {
    return useContext(SmoothScrollContext).scrollProgress;
}
export function SmoothScrollProvider({ children, fixedContent, sensitivity = DEFAULT_SENSITIVITY, }) {
    const [scrollProgress, setScrollProgress] = useState(0);
    // Always false on first render (SSR-safe). Detected client-side after mount
    // so that server and client produce the same JSX tree on hydration.
    const [isTouchPrimary, setIsTouchPrimary] = useState(false);
    const contentRef = useRef(null);
    const spacerRef = useRef(null);
    const scrollTargetRef = useRef(0);
    const isProgrammaticScrollRef = useRef(false);
    // Capture latest sensitivity without re-creating the driver on each change.
    const sensitivityRef = useRef(sensitivity);
    sensitivityRef.current = sensitivity;
    useEffect(() => {
        setIsTouchPrimary(window.matchMedia("(pointer: coarse)").matches);
    }, []);
    useEffect(() => {
        if (getReducedMotionPreference()) {
            // Reduced-motion: leave native scroll untouched, mount nothing.
            return;
        }
        if (isTouchPrimary) {
            // Touch-primary device: let the browser handle scroll natively.
            // Still emit scrollProgress so dependent hooks (Navbar, Footer,
            // ThemeContext) keep receiving updates without any code changes.
            const handleNativeScroll = () => {
                const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                setScrollProgress(maxScroll > 0 ? window.scrollY / maxScroll : 0);
            };
            window.addEventListener("scroll", handleNativeScroll, { passive: true });
            return () => window.removeEventListener("scroll", handleNativeScroll);
        }
        // Desktop: spring-physics scroll via wheel events.
        const contentEl = contentRef.current;
        const spacerEl = spacerRef.current;
        if (!contentEl || !spacerEl)
            return;
        const getContentHeight = () => contentEl.getBoundingClientRect().height;
        const getMaxScroll = () => Math.max(0, getContentHeight() - window.innerHeight);
        // The content is position:fixed so it contributes nothing to document height.
        // The spacer mirrors its rendered height so the native scrollbar stays functional.
        const syncSpacerHeight = () => {
            spacerEl.style.height = `${getContentHeight()}px`;
        };
        const resizeObserver = new ResizeObserver(syncSpacerHeight);
        resizeObserver.observe(contentEl);
        syncSpacerHeight();
        const driver = createRafSpringDriver({
            initialValue: 0,
            targetValue: 0,
            stiffness: STIFFNESS,
            damping: DAMPING,
            mass: MASS,
            maxDeltaTime: MAX_DELTA_TIME,
        });
        const unsubscribe = driver.subscribe((snapshot) => {
            contentEl.style.transform = `translateY(${-snapshot.value}px)`;
            // Sync native scrollbar without creating a feedback loop — the scroll
            // event this fires must not be read back as user wheel input.
            isProgrammaticScrollRef.current = true;
            window.scrollTo(0, snapshot.value);
            isProgrammaticScrollRef.current = false;
            const maxScroll = getMaxScroll();
            setScrollProgress(maxScroll > 0 ? snapshot.value / maxScroll : 0);
        });
        const handleWheel = (event) => {
            event.preventDefault();
            const maxScroll = getMaxScroll();
            scrollTargetRef.current = Math.max(0, Math.min(maxScroll, scrollTargetRef.current + event.deltaY * sensitivityRef.current));
            driver.setTarget(scrollTargetRef.current);
            // The driver auto-stops when settled; a new wheel event must restart it.
            if (!driver.isRunning() && !driver.getSnapshot().settled) {
                driver.start();
            }
        };
        // passive:false is required so preventDefault() is honoured.
        window.addEventListener("wheel", handleWheel, { passive: false });
        return () => {
            window.removeEventListener("wheel", handleWheel);
            unsubscribe();
            driver.stop();
            resizeObserver.disconnect();
        };
    }, [isTouchPrimary]);
    // Mobile: children in normal document flow — no position:fixed wrapper, no spacer.
    // fixedContent (Navbar) is already position:fixed via CSS; no special container needed.
    if (isTouchPrimary) {
        return (_jsxs(SmoothScrollContext.Provider, { value: { scrollProgress, isProvided: true }, children: [children, fixedContent] }));
    }
    return (_jsxs(SmoothScrollContext.Provider, { value: { scrollProgress, isProvided: true }, children: [_jsx("div", { ref: contentRef, style: {
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    willChange: "transform",
                }, children: children }), fixedContent, _jsx("div", { "aria-hidden": "true", ref: spacerRef, style: { pointerEvents: "none" } })] }));
}
//# sourceMappingURL=SmoothScrollProvider.js.map