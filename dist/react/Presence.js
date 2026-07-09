import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { useSpring } from "./useSpring.js";
const ENTRY_TARGET = 1;
function PresenceBody({ children, initialValue, onSettled, show, springConfig, targetValue, ...divProps }) {
    const springRef = useSpring(show ? ENTRY_TARGET : targetValue, springConfig, initialValue, onSettled);
    return (_jsx("div", { ref: springRef, ...divProps, children: children }));
}
export function Presence({ children, show, exitConfig, exitTarget = 0, onSettled, ...divProps }) {
    const [isPresent, setIsPresent] = useState(show);
    const [initialValue, setInitialValue] = useState(show ? ENTRY_TARGET : exitTarget);
    const showRef = useRef(show);
    showRef.current = show;
    useEffect(() => {
        if (show) {
            setInitialValue(exitTarget);
            setIsPresent(true);
        }
    }, [exitTarget, show]);
    if (!isPresent) {
        return null;
    }
    // Presence always renders a wrapper so there is a stable DOM node that owns
    // the --spring-progress custom property consumed by CSS variants.
    return (_jsx(PresenceBody, { ...divProps, initialValue: initialValue, onSettled: () => {
            onSettled?.();
            if (!showRef.current) {
                setIsPresent(false);
            }
        }, show: show, springConfig: exitConfig, targetValue: exitTarget, children: children }));
}
//# sourceMappingURL=Presence.js.map