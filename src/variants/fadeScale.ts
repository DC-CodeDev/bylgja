import { createElement, type ReactNode } from "react";
import type { ReactElement } from "react";
import type { SpringSolverConfig } from "../core/spring-solver.js";
import { Presence } from "../react/Presence.js";
import { SPRING_GENTLE } from "../tokens/springs.js";

export const FADE_SCALE_CLASS_NAME = "bylgja-fade-scale";

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

export interface UseFadeScaleOptions {
  show: boolean;
  className?: string | undefined;
  springConfig?: SpringSolverConfig | undefined;
  exitTarget?: number | undefined;
  onSettled?: (() => void) | undefined;
}

export interface FadeScaleBinding {
  className: string;
  render: (children: ReactNode) => ReactElement | null;
  state: "visible" | "hidden";
}

export function useFadeScale({
  show,
  className,
  springConfig = SPRING_GENTLE,
  exitTarget = 0,
  onSettled,
}: UseFadeScaleOptions): FadeScaleBinding {
  const state = show ? "visible" : "hidden";
  const resolvedClassName = joinClassNames(FADE_SCALE_CLASS_NAME, className);

  return {
    className: resolvedClassName,
    render: (children: ReactNode) =>
      createElement(
        Presence,
        {
          show,
          exitConfig: springConfig,
          exitTarget,
          className: resolvedClassName,
          "data-state": state,
          onSettled,
        },
        children,
      ),
    state,
  };
}
