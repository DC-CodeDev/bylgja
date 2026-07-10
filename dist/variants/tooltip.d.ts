import { type CSSProperties, type FocusEventHandler, type HTMLAttributes, type PointerEventHandler, type ReactElement, type ReactNode, type Ref } from "react";
export declare const TOOLTIP_CLASS_NAME = "bylgja-tooltip";
export type TooltipPlacement = "top" | "top-start" | "top-end" | "right" | "right-start" | "right-end" | "bottom" | "bottom-start" | "bottom-end" | "left" | "left-start" | "left-end";
export interface UseTooltipOptions {
    className?: string | undefined;
    closeDelay?: number | undefined;
    defaultOpen?: boolean | undefined;
    disabled?: boolean | undefined;
    offset?: number | undefined;
    onOpenChange?: ((open: boolean) => void) | undefined;
    open?: boolean | undefined;
    openDelay?: number | undefined;
    placement?: TooltipPlacement | undefined;
    viewportPadding?: number | undefined;
}
export interface TooltipTriggerProps<T extends HTMLElement = HTMLElement> {
    "aria-describedby"?: string | undefined;
    onBlur: FocusEventHandler<T>;
    onFocus: FocusEventHandler<T>;
    onPointerEnter: PointerEventHandler<T>;
    onPointerLeave: PointerEventHandler<T>;
    ref: (element: T | null) => void;
}
export interface TooltipContentProps<T extends HTMLElement = HTMLElement> {
    "aria-hidden": boolean;
    "data-placement": TooltipPlacement;
    "data-state": "hidden" | "visible";
    id: string;
    ref: (element: T | null) => void;
    role: "tooltip";
}
export interface TooltipBinding<T extends HTMLElement = HTMLElement> {
    className: string;
    mounted: boolean;
    onExitComplete: () => void;
    open: boolean;
    placement: TooltipPlacement;
    tooltipProps: TooltipContentProps<T>;
    tooltipStyle: CSSProperties;
    triggerProps: TooltipTriggerProps<T>;
}
export declare function useTooltip<T extends HTMLElement = HTMLElement>({ className, closeDelay, defaultOpen, disabled, offset, onOpenChange, open: controlledOpen, openDelay, placement: requestedPlacement, viewportPadding, }?: UseTooltipOptions): TooltipBinding<T>;
export interface TooltipProps extends UseTooltipOptions {
    children: ReactElement<TooltipChildProps>;
    content: ReactNode;
}
type TooltipChildProps = HTMLAttributes<HTMLElement> & {
    ref?: Ref<HTMLElement> | undefined;
};
export declare function Tooltip({ children, content, ...options }: TooltipProps): ReactElement;
export {};
//# sourceMappingURL=tooltip.d.ts.map