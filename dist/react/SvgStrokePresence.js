import { jsx as _jsx } from "react/jsx-runtime";
import { Presence } from "./Presence.js";
import { SPRING_GENTLE } from "../tokens/springs.js";
function joinClassNames(...classNames) {
    return classNames.filter(Boolean).join(" ");
}
export function SvgStrokePresence({ children, direction, path, pathClassName, pathLength = 100, pathProps, show, springConfig = SPRING_GENTLE, svgClassName, svgLabel = "Animated SVG stroke", svgProps, viewBox, wrapperClassName, }) {
    const directionSign = direction === "draw" ? -1 : 1;
    const style = {
        "--svg-path-length": pathLength,
        "--svg-stroke-direction-sign": directionSign,
    };
    return (_jsx(Presence, { className: joinClassNames("svg-stroke-presence", wrapperClassName), exitConfig: springConfig, exitTarget: 0, show: show, style: style, children: _jsx("svg", { ...svgProps, "aria-label": svgLabel, className: joinClassNames("svg-stroke-canvas", svgClassName, svgProps?.className), role: "img", viewBox: viewBox, children: children ?? (_jsx("path", { ...pathProps, className: joinClassNames("svg-stroke-path", pathClassName, pathProps?.className), d: path ?? "M 20 72 C 72 18, 168 18, 220 72", pathLength: pathLength })) }) }));
}
//# sourceMappingURL=SvgStrokePresence.js.map