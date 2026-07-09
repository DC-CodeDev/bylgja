import { createElement, type ReactNode } from "react";
import type { ReactElement } from "react";
import type { SpringSolverConfig } from "../core/spring-solver.js";
import { Presence } from "../react/Presence.js";
import { SPRING_GENTLE } from "../tokens/springs.js";

export const FADE_CLASS_NAME = "bylgja-fade";
export const FADE_SPRING_CLASS_NAME = "bylgja-fade--spring";
export const FADE_TWEEN_CLASS_NAME = "bylgja-fade--tween";

export type FadeStrategy = "presence" | "tween";
export type FadeState = "visible" | "hidden";

export interface UseFadeOptions {
  show: boolean;
  strategy?: FadeStrategy;
  className?: string | undefined;
  springConfig?: SpringSolverConfig | undefined;
  exitTarget?: number | undefined;
  onSettled?: (() => void) | undefined;
}

export interface FadeBinding {
  className: string;
  props: {
    className: string;
    "data-state": FadeState;
  };
  render: (children: ReactNode) => ReactElement | null;
  state: FadeState;
}

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

export function useFade({
  show,
  strategy = "presence",
  className,
  springConfig = SPRING_GENTLE,
  exitTarget = 0,
  onSettled,
}: UseFadeOptions): FadeBinding {
  const state: FadeState = show ? "visible" : "hidden";
  const resolvedClassName = joinClassNames(
    FADE_CLASS_NAME,
    strategy === "presence" ? FADE_SPRING_CLASS_NAME : FADE_TWEEN_CLASS_NAME,
    className,
  );
  const props = {
    className: resolvedClassName,
    "data-state": state,
  } as const;

  // `useFade` stays as a single API because consumers often want to switch
  // between pure CSS tweening and Presence-backed unmount coordination without
  // rewriting their call site. The strategy flag keeps that swap explicit.
  const render = (children: ReactNode): ReactElement | null => {
    if (strategy === "tween") {
      return createElement("div", props, children);
    }

    return createElement(
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
    );
  };

  return {
    className: resolvedClassName,
    props,
    render,
    state,
  };
}
