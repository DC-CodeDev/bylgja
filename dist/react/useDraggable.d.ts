import { type PointerEventHandler } from "react";
import type { MutableRefObject, MouseEventHandler } from "react";
import type { SpringSolverConfig } from "../core/spring-solver.js";
export interface DragVelocity {
    x: number;
    y: number;
}
export interface DragPosition {
    x: number;
    y: number;
}
export type DraggableBehavior = "return" | "settle";
export interface UseDraggableOptions {
    behavior: DraggableBehavior;
    className?: string;
    pressableSpringConfig?: SpringSolverConfig;
    springConfig?: SpringSolverConfig;
}
export interface DraggableBinding<T extends HTMLElement = HTMLElement> {
    className: string;
    isDragging: boolean;
    onMouseDown: MouseEventHandler<T>;
    onMouseUp: MouseEventHandler<T>;
    onPointerCancel: PointerEventHandler<T>;
    onPointerDown: PointerEventHandler<T>;
    onPointerUp: PointerEventHandler<T>;
    position: DragPosition;
    ref: MutableRefObject<T | null>;
    releaseVelocity: DragVelocity;
}
export declare function useDraggable<T extends HTMLElement = HTMLElement>({ behavior, className, pressableSpringConfig, springConfig, }: UseDraggableOptions): DraggableBinding<T>;
//# sourceMappingURL=useDraggable.d.ts.map