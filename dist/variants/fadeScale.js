import { createElement } from "react";
import { Presence } from "../react/Presence.js";
import { SPRING_GENTLE } from "../tokens/springs.js";
export const FADE_SCALE_CLASS_NAME = "bylgja-fade-scale";
function joinClassNames(...classNames) {
    return classNames.filter(Boolean).join(" ");
}
export function useFadeScale({ show, className, springConfig = SPRING_GENTLE, exitTarget = 0, onSettled, }) {
    const state = show ? "visible" : "hidden";
    const resolvedClassName = joinClassNames(FADE_SCALE_CLASS_NAME, className);
    return {
        className: resolvedClassName,
        render: (children) => createElement(Presence, {
            show,
            exitConfig: springConfig,
            exitTarget,
            className: resolvedClassName,
            "data-state": state,
            onSettled,
        }, children),
        state,
    };
}
//# sourceMappingURL=fadeScale.js.map