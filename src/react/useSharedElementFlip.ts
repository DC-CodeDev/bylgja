import { useLayoutEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import {
  startFlipInvert,
  type FlipInvertAnimation,
  type FlipInvertMeasurement,
} from "../core/flip-invert.js";

function stopActiveAnimation(
  activeAnimationRef: MutableRefObject<FlipInvertAnimation | null>,
): void {
  const animation = activeAnimationRef.current;
  if (!animation) {
    return;
  }

  animation.unsubscribe();
  animation.driver.stop();
  activeAnimationRef.current = null;
}

export function useSharedElementFlip<T extends HTMLElement>(
  elementRef: MutableRefObject<T | null>,
  sourceRect: FlipInvertMeasurement | null,
): void {
  const previousSourceRectRef = useRef<FlipInvertMeasurement | null>(null);
  const activeAnimationRef = useRef<FlipInvertAnimation | null>(null);

  useLayoutEffect(() => {
    const previousSourceRect = previousSourceRectRef.current;
    previousSourceRectRef.current = sourceRect;

    if (sourceRect !== null && previousSourceRect === null) {
      const element = elementRef.current;
      if (!element) {
        return () => {
          stopActiveAnimation(activeAnimationRef);
          previousSourceRectRef.current = null;
        };
      }

      const rect = element.getBoundingClientRect();

      stopActiveAnimation(activeAnimationRef);
      activeAnimationRef.current = startFlipInvert(element, sourceRect, {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      }, {
        onSettled: () => {
          stopActiveAnimation(activeAnimationRef);
        },
      });
    }

    return () => {
      stopActiveAnimation(activeAnimationRef);
      previousSourceRectRef.current = null;
    };
  }, [elementRef, sourceRect]);

  useLayoutEffect(() => {
    return () => {
      stopActiveAnimation(activeAnimationRef);
    };
  }, []);
}
