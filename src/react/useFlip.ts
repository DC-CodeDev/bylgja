import { useLayoutEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import {
  startFlipInvert,
  type FlipInvertAnimation,
} from "../core/flip-invert.js";
import {
  createWavePropagation,
  type WavePropagationConfig,
} from "../core/wave-propagation.js";
import { getReducedMotionPreference } from "../a11y/reducedMotion.js";

interface FlipItem {
  id: string | number;
}

interface FlipMeasurement {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FlipSnapshot {
  measurements: Map<string, FlipMeasurement>;
  elements: Map<string, HTMLElement>;
}

interface PendingFlipAnimation {
  id: string;
  element: HTMLElement;
  previous: FlipMeasurement;
  current: FlipMeasurement;
  deltaX: number;
  deltaY: number;
  scaleX: number;
  scaleY: number;
}

export interface UseFlipOptions {
  staggerMode?: "none" | "index" | "distance";
  propagationConfig?: WavePropagationConfig;
}

function measureDirectChildren(container: HTMLElement): FlipSnapshot {
  const measurements = new Map<string, FlipMeasurement>();
  const elements = new Map<string, HTMLElement>();

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

function stopActiveAnimation(
  activeAnimationsRef: MutableRefObject<Map<string, FlipInvertAnimation>>,
  id: string,
): void {
  const animation = activeAnimationsRef.current.get(id);
  if (!animation) {
    return;
  }

  animation.unsubscribe();
  animation.driver.stop();
  activeAnimationsRef.current.delete(id);
}

export function useFlip<T extends HTMLElement, TItem extends FlipItem>(
  containerRef: MutableRefObject<T | null>,
  items: readonly TItem[],
  options?: UseFlipOptions,
): void {
  const previousMeasurementsRef = useRef<Map<string, FlipMeasurement>>(new Map());
  const activeAnimationsRef = useRef<Map<string, FlipInvertAnimation>>(new Map());
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

    const {
      measurements: currentMeasurements,
      elements: currentElements,
    } = measureDirectChildren(container);
    const previousMeasurements = previousMeasurementsRef.current;

    if (getReducedMotionPreference()) {
      previousMeasurementsRef.current = currentMeasurements;
      return;
    }

    const pendingAnimations: PendingFlipAnimation[] = [];
    const itemIndexes = new Map<string, number>();

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
      const shouldAnimate =
        Math.abs(deltaX) >= 0.001 ||
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

    let propagationById = new Map<string, { delay: number; amplitude: number }>();

    if (staggerMode === "index" && pendingAnimations.length > 0) {
      propagationById = new Map(
        createWavePropagation(
          pendingAnimations.map((animation) => ({
            id: animation.id,
            x: itemIndexes.get(animation.id) ?? 0,
            y: 0,
          })),
          { x: 0, y: 0 },
          options?.propagationConfig,
        ).map((result) => [result.id, { delay: result.delay, amplitude: result.amplitude }]),
      );
    } else if (staggerMode === "distance" && pendingAnimations.length > 0) {
      propagationById = new Map(
        createWavePropagation(
          pendingAnimations.map((animation) => ({
            id: animation.id,
            x: animation.deltaX,
            y: animation.deltaY,
          })),
          { x: 0, y: 0 },
          options?.propagationConfig,
        ).map((result) => [result.id, { delay: result.delay, amplitude: result.amplitude }]),
      );
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
