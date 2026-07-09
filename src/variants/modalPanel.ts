import { createElement, type ReactNode } from "react";
import type { ReactElement } from "react";
import type { SpringSolverConfig } from "../core/spring-solver.js";
import { Presence } from "../react/Presence.js";
import { SPRING_GENTLE } from "../tokens/springs.js";

export const MODAL_PANEL_CLASS_NAME = "bylgja-modal-panel";

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

export interface UseModalPanelOptions {
  show: boolean;
  className?: string | undefined;
  springConfig?: SpringSolverConfig | undefined;
  exitTarget?: number | undefined;
  onSettled?: (() => void) | undefined;
}

export interface ModalPanelBinding {
  className: string;
  render: (children: ReactNode) => ReactElement | null;
  state: "visible" | "hidden";
}

export function useModalPanel({
  show,
  className,
  springConfig = SPRING_GENTLE,
  exitTarget = 0,
  onSettled,
}: UseModalPanelOptions): ModalPanelBinding {
  const state = show ? "visible" : "hidden";
  const resolvedClassName = joinClassNames(MODAL_PANEL_CLASS_NAME, className);

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
