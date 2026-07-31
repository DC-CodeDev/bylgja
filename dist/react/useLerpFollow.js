import { useEffect, useRef } from "react";
const SETTLE_EPSILON = 0.15;
/**
 * Attaches a ref to a `position:fixed; pointer-events:none` element and drives
 * it toward the cursor using linear interpolation (lerp) on each RAF frame —
 * not spring physics. The element must set `top:0; left:0` in CSS; the hook
 * writes `transform: translate3d(x, y, 0)` directly.
 *
 * prefers-reduced-motion: snaps immediately to cursor position, no animation.
 */
export function useLerpFollow(options) {
    const factor = options?.factor ?? 0.1;
    const active = options?.active ?? true;
    const elementRef = useRef(null);
    const targetRef = useRef({ x: 0, y: 0 });
    const currentRef = useRef({ x: 0, y: 0 });
    const rafHandleRef = useRef(null);
    const activeRef = useRef(active);
    const factorRef = useRef(factor);
    activeRef.current = active;
    factorRef.current = factor;
    useEffect(() => {
        const cancelRaf = () => {
            if (rafHandleRef.current !== null) {
                cancelAnimationFrame(rafHandleRef.current);
                rafHandleRef.current = null;
            }
        };
        const applyTransform = () => {
            const el = elementRef.current;
            if (!el)
                return;
            el.style.transform = `translate3d(${currentRef.current.x}px, ${currentRef.current.y}px, 0)`;
        };
        const scheduleRaf = () => {
            if (rafHandleRef.current === null) {
                rafHandleRef.current = requestAnimationFrame(tick);
            }
        };
        const tick = () => {
            rafHandleRef.current = null;
            if (!activeRef.current)
                return;
            const f = factorRef.current;
            const cur = currentRef.current;
            const tgt = targetRef.current;
            const dx = tgt.x - cur.x;
            const dy = tgt.y - cur.y;
            if (Math.abs(dx) < SETTLE_EPSILON && Math.abs(dy) < SETTLE_EPSILON) {
                cur.x = tgt.x;
                cur.y = tgt.y;
                applyTransform();
                return;
            }
            cur.x += dx * f;
            cur.y += dy * f;
            applyTransform();
            scheduleRaf();
        };
        const handleMouseMove = (e) => {
            targetRef.current.x = e.clientX;
            targetRef.current.y = e.clientY;
            if (activeRef.current) {
                scheduleRaf();
            }
        };
        document.addEventListener("mousemove", handleMouseMove);
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            cancelRaf();
        };
    }, []);
    useEffect(() => {
        if (active) {
            currentRef.current.x = targetRef.current.x;
            currentRef.current.y = targetRef.current.y;
            const el = elementRef.current;
            if (el) {
                el.style.transform = `translate3d(${currentRef.current.x}px, ${currentRef.current.y}px, 0)`;
            }
        }
        else {
            if (rafHandleRef.current !== null) {
                cancelAnimationFrame(rafHandleRef.current);
                rafHandleRef.current = null;
            }
        }
    }, [active]);
    return elementRef;
}
//# sourceMappingURL=useLerpFollow.js.map