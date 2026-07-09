import { createElement, type ReactNode } from "react";
import type { ReactElement } from "react";
import type { SpringSolverConfig } from "../core/spring-solver.js";
import { Presence } from "../react/Presence.js";
import { SPRING_GENTLE } from "../tokens/springs.js";

export const MODAL_BACKDROP_CLASS_NAME = "bylgja-modal-backdrop";

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

export interface UseModalBackdropOptions {
  show: boolean;
  className?: string | undefined;
  springConfig?: SpringSolverConfig | undefined;
  exitTarget?: number | undefined;
  onSettled?: (() => void) | undefined;
}

export interface ModalBackdropBinding {
  className: string;
  render: (children?: ReactNode) => ReactElement | null;
  state: "visible" | "hidden";
}

export function useModalBackdrop({
  show,
  className,
  springConfig = SPRING_GENTLE,
  exitTarget = 0,
  onSettled,
}: UseModalBackdropOptions): ModalBackdropBinding {
  const state = show ? "visible" : "hidden";
  const resolvedClassName = joinClassNames(MODAL_BACKDROP_CLASS_NAME, className);

  return {
    className: resolvedClassName,
    render: (children?: ReactNode) =>
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
