import { useLayoutEffect, useRef } from "react";
import { startFlipInvert, } from "../core/flip-invert.js";
import { createWavePropagation, } from "../core/wave-propagation.js";
import { getReducedMotionPreference } from "../a11y/reducedMotion.js";
function measureDirectChildren(container) {
    const measurements = new Map();
    const elements = new Map();
    for (const child of Array.from(container.children)) {
        if (!(child instanceof HTMLElement)) {
            continue;
        }
        const id = child.dataset.flipId;
        if (!id) {
            continue;
        }
        const rect = child.getBoundingClientRect();
        elements.set(id, child);
        measurements.set(id, {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
        });
    }
    return {
        measurements,
        elements,
    };
}
function stopActiveAnimation(activeAnimationsRef, id) {
    const animation = activeAnimationsRef.current.get(id);
    if (!animation) {
        return;
    }
    animation.unsubscribe();
    animation.driver.stop();
    activeAnimationsRef.current.delete(id);
}
export function useFlip(containerRef, items, options) {
    const previousMeasurementsRef = useRef(new Map());
    const activeAnimationsRef = useRef(new Map());
    const staggerMode = options?.staggerMode ?? "none";
    const propagationConfigKey = [
        staggerMode,
        options?.propagationConfig?.propagationSpeed ?? "",
        options?.propagationConfig?.minAmplitude ?? "",
        options?.propagationConfig?.maxAmplitude ?? "",
    ].join(":");
    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) {
            previousMeasurementsRef.current = new Map();
            return;
        }
        for (const [id] of activeAnimationsRef.current) {
            stopActiveAnimation(activeAnimationsRef, id);
        }
        for (const child of Array.from(container.children)) {
            if (!(child instanceof HTMLElement)) {
                continue;
            }
            child.style.transform = "none";
            child.style.transition = "";
            child.style.transformOrigin = "";
            child.style.willChange = "";
        }
        const { measurements: currentMeasurements, elements: currentElements, } = measureDirectChildren(container);
        const previousMeasurements = previousMeasurementsRef.current;
        if (getReducedMotionPreference()) {
            previousMeasurementsRef.current = currentMeasurements;
            return;
        }
        const pendingAnimations = [];
        const itemIndexes = new Map();
        for (const [index, item] of items.entries()) {
            itemIndexes.set(String(item.id), index);
        }
        for (const item of items) {
            const id = String(item.id);
            const previous = previousMeasurements.get(id);
            const current = currentMeasurements.get(id);
            if (!previous || !current) {
                continue;
            }
            const element = currentElements.get(id);
            if (!element) {
                continue;
            }
            const deltaX = previous.x - current.x;
            const deltaY = previous.y - current.y;
            const scaleX = current.width === 0 ? 1 : previous.width / current.width;
            const scaleY = current.height === 0 ? 1 : previous.height / current.height;
            const shouldAnimate = Math.abs(deltaX) >= 0.001 ||
                Math.abs(deltaY) >= 0.001 ||
                Math.abs(scaleX - 1) >= 0.001 ||
                Math.abs(scaleY - 1) >= 0.001;
            if (!shouldAnimate) {
                element.style.transform = "none";
                element.style.transition = "";
                element.style.transformOrigin = "";
                element.style.willChange = "";
                continue;
            }
            pendingAnimations.push({
                id,
                element,
                previous,
                current,
                deltaX,
                deltaY,
                scaleX,
                scaleY,
            });
        }
        let propagationById = new Map();
        if (staggerMode === "index" && pendingAnimations.length > 0) {
            propagationById = new Map(createWavePropagation(pendingAnimations.map((animation) => ({
                id: animation.id,
                x: itemIndexes.get(animation.id) ?? 0,
                y: 0,
            })), { x: 0, y: 0 }, options?.propagationConfig).map((result) => [result.id, { delay: result.delay, amplitude: result.amplitude }]));
        }
        else if (staggerMode === "distance" && pendingAnimations.length > 0) {
            propagationById = new Map(createWavePropagation(pendingAnimations.map((animation) => ({
                id: animation.id,
                x: animation.deltaX,
                y: animation.deltaY,
            })), { x: 0, y: 0 }, options?.propagationConfig).map((result) => [result.id, { delay: result.delay, amplitude: result.amplitude }]));
        }
        for (const animation of pendingAnimations) {
            const propagation = propagationById.get(animation.id);
            const amplitude = propagation?.amplitude ?? 1;
            const delay = propagation?.delay ?? 0;
            const { element, id, previous, current } = animation;
            const activeAnimation = startFlipInvert(element, previous, current, {
                amplitude,
                delay,
                onSettled: () => {
                    stopActiveAnimation(activeAnimationsRef, id);
                },
            });
            activeAnimationsRef.current.set(id, activeAnimation);
        }
        previousMeasurementsRef.current = currentMeasurements;
        return () => {
            for (const id of activeAnimationsRef.current.keys()) {
                stopActiveAnimation(activeAnimationsRef, id);
            }
        };
    }, [containerRef, items, propagationConfigKey]);
}
//# sourceMappingURL=useFlip.js.map