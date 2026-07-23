import { useEffect, useRef } from "react";
import { createRafSpringDriver, } from "../core/raf-driver.js";
import { stripUndefined } from "../core/object-utils.js";
import { getReducedMotionPreference } from "../a11y/reducedMotion.js";
const SPRING_PROGRESS_PROPERTY = "--spring-progress";
export function useSpring(options) {
    const { config, initialValue, onSettled, startDelay, targetValue } = options;
    const elementRef = useRef(null);
    const driverRef = useRef(null);
    const onSettledRef = useRef(onSettled);
    const hasAnimatedRef = useRef(false);
    const hasReportedSettledRef = useRef(false);
    const reducedMotionNotificationTokenRef = useRef(0);
    const reducedMotionAppliedTargetRef = useRef(null);
    const resolvedInitialValue = initialValue ?? 0;
    const configKey = [
        config.stiffness,
        config.damping,
        config.mass,
        config.timestep ?? "",
        config.velocityThreshold ?? "",
        config.positionThreshold ?? "",
        startDelay ?? "",
    ].join(":");
    onSettledRef.current = onSettled;
    const scheduleReducedMotionSettled = () => {
        reducedMotionNotificationTokenRef.current += 1;
        const token = reducedMotionNotificationTokenRef.current;
        queueMicrotask(() => {
            if (reducedMotionNotificationTokenRef.current !== token) {
                return;
            }
            onSettledRef.current?.();
        });
    };
    useEffect(() => {
        const element = elementRef.current;
        if (element) {
            element.style.setProperty(SPRING_PROGRESS_PROPERTY, String(resolvedInitialValue));
        }
        hasAnimatedRef.current = false;
        hasReportedSettledRef.current = false;
        if (getReducedMotionPreference()) {
            if (element) {
                element.style.setProperty(SPRING_PROGRESS_PROPERTY, String(targetValue));
            }
            driverRef.current = null;
            reducedMotionAppliedTargetRef.current = targetValue;
            scheduleReducedMotionSettled();
            return () => {
                reducedMotionNotificationTokenRef.current += 1;
                reducedMotionAppliedTargetRef.current = null;
            };
        }
        reducedMotionAppliedTargetRef.current = null;
        const driver = createRafSpringDriver(stripUndefined({
            initialValue: resolvedInitialValue,
            startDelay,
            targetValue,
            ...config,
        }));
        driverRef.current = driver;
        const unsubscribe = driver.subscribe((snapshot) => {
            const element = elementRef.current;
            if (!element) {
                return;
            }
            // While animating we write the live position, but once the spring has
            // settled we snap to the exact target. The solver only guarantees the
            // resting value is within `positionThreshold` of the target, so it comes
            // to rest at e.g. 0.9992 rather than 1. That residual leaves
            // `opacity: var(--spring-progress)` permanently below 1, and because the
            // modal-panel variant sets `will-change: opacity`, the panel stays on its
            // own GPU compositing layer and is composited at <100% opacity — which
            // renders as a lighter rounded-rectangle frame against dark backgrounds.
            // Snapping to the target at rest keeps will-change (and its perf win)
            // while removing the artifact.
            const renderedValue = snapshot.settled ? snapshot.target : snapshot.value;
            element.style.setProperty(SPRING_PROGRESS_PROPERTY, String(renderedValue));
            if (snapshot.settled) {
                // If the spring starts already settled, do not treat that initial
                // snapshot as a completed animation.
                if (hasAnimatedRef.current && !hasReportedSettledRef.current) {
                    hasReportedSettledRef.current = true;
                    onSettledRef.current?.();
                }
                return;
            }
            hasAnimatedRef.current = true;
            hasReportedSettledRef.current = false;
        });
        driver.start();
        return () => {
            reducedMotionNotificationTokenRef.current += 1;
            unsubscribe();
            driver.stop();
            if (driverRef.current === driver) {
                driverRef.current = null;
            }
        };
    }, [configKey]);
    useEffect(() => {
        const driver = driverRef.current;
        if (!driver) {
            if (getReducedMotionPreference()) {
                if (reducedMotionAppliedTargetRef.current === targetValue) {
                    return;
                }
                const element = elementRef.current;
                if (element) {
                    element.style.setProperty(SPRING_PROGRESS_PROPERTY, String(targetValue));
                }
                reducedMotionAppliedTargetRef.current = targetValue;
                scheduleReducedMotionSettled();
            }
            return;
        }
        driver.setTarget(targetValue);
        if (!driver.isRunning() && !driver.getSnapshot().settled) {
            driver.start();
        }
    }, [targetValue]);
    return elementRef;
}
//# sourceMappingURL=useSpring.js.map