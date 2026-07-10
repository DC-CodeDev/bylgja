import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { cloneElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, } from "react";
import { createPortal } from "react-dom";
import { Presence } from "../react/Presence.js";
import { SPRING_SNAPPY } from "../tokens/springs.js";
export const TOOLTIP_CLASS_NAME = "bylgja-tooltip";
const DEFAULT_OPEN_DELAY = 500;
const DEFAULT_CLOSE_DELAY = 80;
const DEFAULT_OFFSET = 8;
const DEFAULT_VIEWPORT_PADDING = 8;
function joinClassNames(...classNames) {
    return classNames.filter(Boolean).join(" ");
}
function basePlacement(placement) {
    return placement.split("-")[0];
}
function oppositePlacement(placement) {
    const suffix = placement.slice(basePlacement(placement).length);
    const opposite = { top: "bottom", right: "left", bottom: "top", left: "right" };
    return `${opposite[basePlacement(placement)]}${suffix}`;
}
function hasSpace(placement, trigger, tooltip, offset, padding) {
    switch (basePlacement(placement)) {
        case "top": return trigger.top - padding >= tooltip.height + offset;
        case "right": return window.innerWidth - trigger.right - padding >= tooltip.width + offset;
        case "bottom": return window.innerHeight - trigger.bottom - padding >= tooltip.height + offset;
        case "left": return trigger.left - padding >= tooltip.width + offset;
    }
}
function calculatePosition(requestedPlacement, trigger, tooltip, offset, padding) {
    const placement = hasSpace(requestedPlacement, trigger, tooltip, offset, padding)
        ? requestedPlacement
        : hasSpace(oppositePlacement(requestedPlacement), trigger, tooltip, offset, padding)
            ? oppositePlacement(requestedPlacement)
            : requestedPlacement;
    const side = basePlacement(placement);
    const alignment = placement.split("-")[1];
    let left = trigger.left + (trigger.width - tooltip.width) / 2;
    let top = trigger.top + (trigger.height - tooltip.height) / 2;
    if (side === "top")
        top = trigger.top - tooltip.height - offset;
    if (side === "bottom")
        top = trigger.bottom + offset;
    if (side === "left")
        left = trigger.left - tooltip.width - offset;
    if (side === "right")
        left = trigger.right + offset;
    if ((side === "top" || side === "bottom") && alignment) {
        left = alignment === "start" ? trigger.left : trigger.right - tooltip.width;
    }
    if ((side === "left" || side === "right") && alignment) {
        top = alignment === "start" ? trigger.top : trigger.bottom - tooltip.height;
    }
    return {
        left: Math.max(padding, Math.min(left, window.innerWidth - tooltip.width - padding)),
        placement,
        top: Math.max(padding, Math.min(top, window.innerHeight - tooltip.height - padding)),
    };
}
export function useTooltip({ className, closeDelay = DEFAULT_CLOSE_DELAY, defaultOpen = false, disabled = false, offset = DEFAULT_OFFSET, onOpenChange, open: controlledOpen, openDelay = DEFAULT_OPEN_DELAY, placement: requestedPlacement = "top", viewportPadding = DEFAULT_VIEWPORT_PADDING, } = {}) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
    const [mounted, setMounted] = useState(defaultOpen && !disabled);
    const [position, setPosition] = useState({ left: 0, placement: requestedPlacement, top: 0 });
    const triggerRef = useRef(null);
    const tooltipRef = useRef(null);
    const openTimerRef = useRef(null);
    const closeTimerRef = useRef(null);
    const frameRef = useRef(null);
    const id = useId();
    const isControlled = controlledOpen !== undefined;
    const open = !disabled && (isControlled ? controlledOpen : uncontrolledOpen);
    const openRef = useRef(open);
    openRef.current = open;
    const clearTimers = useCallback(() => {
        if (openTimerRef.current !== null)
            clearTimeout(openTimerRef.current);
        if (closeTimerRef.current !== null)
            clearTimeout(closeTimerRef.current);
        openTimerRef.current = null;
        closeTimerRef.current = null;
    }, []);
    const requestOpenChange = useCallback((nextOpen) => {
        if (nextOpen && disabled)
            return;
        if (!isControlled)
            setUncontrolledOpen(nextOpen);
        onOpenChange?.(nextOpen);
    }, [disabled, isControlled, onOpenChange]);
    const scheduleOpen = useCallback(() => {
        if (disabled)
            return;
        if (closeTimerRef.current !== null)
            clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
        if (open || openTimerRef.current !== null)
            return;
        openTimerRef.current = setTimeout(() => {
            openTimerRef.current = null;
            requestOpenChange(true);
        }, openDelay);
    }, [disabled, open, openDelay, requestOpenChange]);
    const scheduleClose = useCallback(() => {
        if (openTimerRef.current !== null)
            clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
        if (!open || closeTimerRef.current !== null)
            return;
        closeTimerRef.current = setTimeout(() => {
            closeTimerRef.current = null;
            requestOpenChange(false);
        }, closeDelay);
    }, [closeDelay, open, requestOpenChange]);
    const updatePosition = useCallback(() => {
        const trigger = triggerRef.current;
        const tooltip = tooltipRef.current;
        if (!trigger || !tooltip || typeof window === "undefined")
            return;
        const next = calculatePosition(requestedPlacement, trigger.getBoundingClientRect(), tooltip.getBoundingClientRect(), offset, viewportPadding);
        setPosition((current) => current.left === next.left && current.top === next.top && current.placement === next.placement ? current : next);
    }, [offset, requestedPlacement, viewportPadding]);
    const schedulePosition = useCallback(() => {
        if (typeof window === "undefined" || frameRef.current !== null)
            return;
        frameRef.current = window.requestAnimationFrame(() => {
            frameRef.current = null;
            updatePosition();
        });
    }, [updatePosition]);
    const setTrigger = useCallback((element) => { triggerRef.current = element; }, []);
    const setTooltip = useCallback((element) => { tooltipRef.current = element; }, []);
    useEffect(() => {
        if (!disabled)
            return;
        clearTimers();
        requestOpenChange(false);
    }, [clearTimers, disabled, requestOpenChange]);
    useEffect(() => {
        if (open)
            setMounted(true);
    }, [open]);
    useEffect(() => () => {
        clearTimers();
        if (frameRef.current !== null && typeof window !== "undefined")
            window.cancelAnimationFrame(frameRef.current);
    }, [clearTimers]);
    useEffect(() => {
        if (!open || typeof window === "undefined")
            return;
        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                clearTimers();
                requestOpenChange(false);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [clearTimers, open, requestOpenChange]);
    useLayoutEffect(() => {
        if (!open || typeof window === "undefined")
            return;
        schedulePosition();
        const onViewportChange = () => schedulePosition();
        window.addEventListener("resize", onViewportChange);
        window.addEventListener("scroll", onViewportChange, true);
        const Observer = window.ResizeObserver;
        const observer = Observer ? new Observer(onViewportChange) : null;
        if (observer && triggerRef.current)
            observer.observe(triggerRef.current);
        if (observer && tooltipRef.current)
            observer.observe(tooltipRef.current);
        return () => {
            window.removeEventListener("resize", onViewportChange);
            window.removeEventListener("scroll", onViewportChange, true);
            observer?.disconnect();
            if (frameRef.current !== null) {
                window.cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
        };
    }, [open, schedulePosition]);
    const triggerProps = {
        "aria-describedby": open ? id : undefined,
        onBlur: scheduleClose,
        onFocus: () => {
            if (closeTimerRef.current !== null)
                clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
            if (!disabled)
                requestOpenChange(true);
        },
        onPointerEnter: (event) => {
            if (event.pointerType === "touch")
                return;
            scheduleOpen();
        },
        onPointerLeave: (event) => {
            if (event.pointerType === "touch")
                return;
            scheduleClose();
        },
        ref: setTrigger,
    };
    return {
        className: joinClassNames(TOOLTIP_CLASS_NAME, className),
        mounted,
        onExitComplete: () => {
            if (!openRef.current)
                setMounted(false);
        },
        open,
        placement: position.placement,
        tooltipProps: {
            "aria-hidden": !open,
            "data-placement": position.placement,
            "data-state": open ? "visible" : "hidden",
            id,
            ref: setTooltip,
            role: "tooltip",
        },
        tooltipStyle: { left: position.left, top: position.top },
        triggerProps,
    };
}
function composeHandlers(first, second) {
    return (event) => { first?.(event); second(event); };
}
function assignRef(ref, value) {
    if (typeof ref === "function")
        ref(value);
    else if (ref)
        ref.current = value;
}
export function Tooltip({ children, content, ...options }) {
    const tooltip = useTooltip(options);
    const [portalReady, setPortalReady] = useState(false);
    useEffect(() => { setPortalReady(true); }, []);
    const trigger = cloneElement(children, {
        ...tooltip.triggerProps,
        "aria-describedby": [children.props["aria-describedby"], tooltip.triggerProps["aria-describedby"]].filter(Boolean).join(" ") || undefined,
        onBlur: composeHandlers(children.props.onBlur, tooltip.triggerProps.onBlur),
        onFocus: composeHandlers(children.props.onFocus, tooltip.triggerProps.onFocus),
        onPointerEnter: composeHandlers(children.props.onPointerEnter, tooltip.triggerProps.onPointerEnter),
        onPointerLeave: composeHandlers(children.props.onPointerLeave, tooltip.triggerProps.onPointerLeave),
        ref: (element) => {
            assignRef(children.props.ref, element);
            tooltip.triggerProps.ref(element);
        },
    });
    return _jsxs(_Fragment, { children: [trigger, portalReady && tooltip.mounted && typeof document !== "undefined" ? createPortal(_jsx(Presence, { show: tooltip.open, exitConfig: SPRING_SNAPPY, onSettled: tooltip.onExitComplete, children: _jsx("div", { ...tooltip.tooltipProps, className: tooltip.className, style: tooltip.tooltipStyle, children: content }) }), document.body) : null] });
}
//# sourceMappingURL=tooltip.js.map