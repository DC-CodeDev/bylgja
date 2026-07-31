import { createElement } from "react";
import { Presence } from "../react/Presence.js";
import { SPRING_GENTLE } from "../tokens/springs.js";
export const NAV_SLIDE_CLASS_NAME = "bylgja-nav-slide";
function joinClassNames(...classNames) {
    return classNames.filter(Boolean).join(" ");
}
export function useNavSlide({ show, className, springConfig = SPRING_GENTLE, exitTarget = 0, onSettled, }) {
    const state = show ? "visible" : "hidden";
    const resolvedClassName = joinClassNames(NAV_SLIDE_CLASS_NAME, className);
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
//# sourceMappingURL=navSlide.js.map