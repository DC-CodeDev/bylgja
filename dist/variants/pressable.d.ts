import { type MouseEventHandler, type PointerEventHandler } from "react";
import type { MutableRefObject } from "react";
import type { SpringSolverConfig } from "../core/spring-solver.js";
export declare const PRESSABLE_CLASS_NAME = "bylgja-pressable";
export interface UsePressableOptions {
    className?: string | undefined;
    onSettled?: (() => void) | undefined;
    springConfig?: SpringSolverConfig | undefined;
}
export interface PressableBinding<T extends HTMLElement = HTMLElement> {
    className: string;
    onMouseDown: MouseEventHandler<T>;
    onMouseUp: MouseEventHandler<T>;
    onPointerCancel: PointerEventHandler<T>;
    onPointerDown: PointerEventHandler<T>;
    onPointerUp: PointerEventHandler<T>;
    ref: MutableRefObject<T | null>;
}
export declare function usePressable<T extends HTMLElement = HTMLElement>({ className, onSettled, springConfig, }?: UsePressableOptions): PressableBinding<T>;
//# sourceMappingURL=pressable.d.ts.map