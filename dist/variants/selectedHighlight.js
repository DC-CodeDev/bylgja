import { stripUndefined } from "../core/object-utils.js";
import { useSpring } from "../react/useSpring.js";
import { SPRING_GENTLE } from "../tokens/springs.js";
export const SELECTED_HIGHLIGHT_CLASS_NAME = "bylgja-selected-highlight";
function joinClassNames(...classNames) {
    return classNames.filter(Boolean).join(" ");
}
export function useSelectedHighlight({ className, onSettled, selected, springConfig = SPRING_GENTLE, }) {
    const ref = useSpring(stripUndefined({
        config: springConfig,
        initialValue: selected ? 1 : 0,
        onSettled,
        targetValue: selected ? 1 : 0,
    }));
    return {
        className: joinClassNames(SELECTED_HIGHLIGHT_CLASS_NAME, className),
        "data-selected": selected ? "true" : "false",
        ref,
    };
}
//# sourceMappingURL=selectedHighlight.js.map