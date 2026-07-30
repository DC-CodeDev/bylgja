import { useEffect, useRef } from "react";
import { createRafSpringDriver } from "../core/raf-driver.js";
import type { SpringSolverConfig } from "../core/spring-solver.js";

// The config passed here must mirror the SpringSolverConfig driving the CSS
// transition being monitored in the consumer. If the visual timing changes,
// this config must be updated in parallel — the two are manually coupled.
export function useOverlapTrigger(
  config: SpringSolverConfig,
  active: boolean,
  threshold: number,
  onTrigger: () => void,
): void {
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
    if (!active) return;

    const driver = createRafSpringDriver({
      initialValue: 0,
      targetValue: 1,
      ...config,
    });

    let triggered = false;

    const unsubscribe = driver.subscribe((snapshot) => {
      if (!triggered && snapshot.value >= threshold) {
        triggered = true;
        unsubscribe();
        driver.stop();
        onTriggerRef.current();
      }
    });

    driver.start();

    return () => {
      unsubscribe();
      driver.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, threshold, configKey]);
}
