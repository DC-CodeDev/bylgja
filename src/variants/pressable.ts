import {
  useEffect,
  useRef,
  useState,
  type MouseEventHandler,
  type PointerEventHandler,
} from "react";
import type { MutableRefObject } from "react";
import { stripUndefined } from "../core/object-utils.js";
import type { SpringSolverConfig } from "../core/spring-solver.js";
import { useSpring } from "../react/useSpring.js";
import { SPRING_SNAPPY } from "../tokens/springs.js";

export const PRESSABLE_CLASS_NAME = "bylgja-pressable";

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

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

export function usePressable<T extends HTMLElement = HTMLElement>({
  className,
  onSettled,
  springConfig = SPRING_SNAPPY,
}: UsePressableOptions = {}): PressableBinding<T> {
  const [isPressed, setIsPressed] = useState(false);
  const ref = useSpring<T>(
    stripUndefined({
      config: springConfig,
      initialValue: 0,
      onSettled,
      targetValue: isPressed ? 1 : 0,
    }),
  );

  const press = (): void => {
    setIsPressed(true);
  };

  const release = (): void => {
    setIsPressed(false);
  };

  useEffect(() => {
    if (!isPressed) {
      return;
    }

    const handleWindowMouseUp = (): void => {
      release();
    };

    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isPressed]);

  return {
    className: joinClassNames(PRESSABLE_CLASS_NAME, className),
    onMouseDown: () => {
      press();
    },
    onMouseUp: () => {
      release();
    },
    onPointerCancel: () => {
      release();
    },
    onPointerDown: (event) => {
      press();
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerUp: () => {
      release();
    },
    ref,
  };
}
