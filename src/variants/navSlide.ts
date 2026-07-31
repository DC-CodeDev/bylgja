import { createElement, type ReactNode } from "react";
import type { ReactElement } from "react";
import type { SpringSolverConfig } from "../core/spring-solver.js";
import { Presence } from "../react/Presence.js";
import { SPRING_GENTLE } from "../tokens/springs.js";

export const NAV_SLIDE_CLASS_NAME = "bylgja-nav-slide";

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

export interface UseNavSlideOptions {
  show: boolean;
  className?: string | undefined;
  springConfig?: SpringSolverConfig | undefined;
  exitTarget?: number | undefined;
  onSettled?: (() => void) | undefined;
}

export interface NavSlideBinding {
  className: string;
  render: (children: ReactNode) => ReactElement | null;
  state: "visible" | "hidden";
}

export function useNavSlide({
  show,
  className,
  springConfig = SPRING_GENTLE,
  exitTarget = 0,
  onSettled,
}: UseNavSlideOptions): NavSlideBinding {
  const state = show ? "visible" : "hidden";
  const resolvedClassName = joinClassNames(NAV_SLIDE_CLASS_NAME, className);

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
