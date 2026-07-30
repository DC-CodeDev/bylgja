import { useEffect, useRef } from "react";
import { createRafSpringDriver } from "../core/raf-driver.js";
// The config passed here must mirror the SpringSolverConfig driving the CSS
// transition being monitored in the consumer. If the visual timing changes,
// this config must be updated in parallel — the two are manually coupled.
//
// minDelayMs guards against the case where threshold % of a very fast spring
// resolves to an absolute time below the human perceptual threshold (~100ms).
// For example, 45% of a 520ms spring = ~117ms — two stages appear simultaneous
// even though the percentage trigger fired "correctly". The trigger fires at
// whichever moment comes LATER: threshold crossed OR minDelayMs elapsed since
// active became true. Both conditions must be met; neither alone is sufficient.
export function useOverlapTrigger(config, active, threshold, onTrigger, minDelayMs = 150) {
    const onTriggerRef = useRef(onTrigger);
    onTriggerRef.current = onTrigger;
    const configKey = [
        config.stiffness,
        config.damping,
        config.mass,
        config.timestep ?? "",
        config.velocityThreshold ?? "",
        config.positionThreshold ?? "",
    ].join(":");
    useEffect(() => {
        if (!active)
            return;
        const driver = createRafSpringDriver({
            initialValue: 0,
            targetValue: 1,
            ...config,
        });
        let triggered = false;
        let thresholdReached = false;
        let minDelayPassed = false;
        let unsubscribe;
        const tryFire = () => {
            if (!triggered && thresholdReached && minDelayPassed) {
                triggered = true;
                unsubscribe();
                driver.stop();
                onTriggerRef.current();
            }
        };
        unsubscribe = driver.subscribe((snapshot) => {
            if (!thresholdReached && snapshot.value >= threshold) {
                thresholdReached = true;
                tryFire();
            }
        });
        const timerId = setTimeout(() => {
            minDelayPassed = true;
            tryFire();
        }, minDelayMs);
        driver.start();
        return () => {
            unsubscribe();
            driver.stop();
            clearTimeout(timerId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, threshold, minDelayMs, configKey]);
}
//# sourceMappingURL=useOverlapTrigger.js.map