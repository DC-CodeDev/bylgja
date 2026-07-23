import { useEffect, useState, } from "react";
import { stripUndefined } from "../core/object-utils.js";
import { useSpring } from "../react/useSpring.js";
import { SPRING_SNAPPY } from "../tokens/springs.js";
export const PRESSABLE_CLASS_NAME = "bylgja-pressable";
function joinClassNames(...classNames) {
    return classNames.filter(Boolean).join(" ");
}
export function usePressable({ className, onSettled, springConfig = SPRING_SNAPPY, } = {}) {
    const [isPressed, setIsPressed] = useState(false);
    const ref = useSpring(stripUndefined({
        config: springConfig,
        initialValue: 0,
        onSettled,
        targetValue: isPressed ? 1 : 0,
    }));
    const press = () => {
        setIsPressed(true);
    };
    const release = () => {
        setIsPressed(false);
    };
    useEffect(() => {
        if (!isPressed) {
            return;
        }
        const handleWindowMouseUp = () => {
            release();
        };
        window.addEventListener("mouseup", handleWindowMouseUp);
        return () => {
            window.removeEventListener("mouseup", handleWindowMouseUp);
        };
    }, [isPressed]);
    return {
        className: joinClassNames(PRESSABLE_CLASS_NAME, className),
        onMouseDown: () => {
            press();
        },
        onMouseUp: () => {
            release();
        },
        onPointerCancel: () => {
            release();
        },
        onPointerDown: (event) => {
            press();
            event.currentTarget.setPointerCapture(event.pointerId);
        },
        onPointerUp: () => {
            release();
        },
        ref,
    };
}
//# sourceMappingURL=pressable.js.map