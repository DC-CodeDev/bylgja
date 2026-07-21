import type { MutableRefObject } from "react";
import type { SpringSolverConfig } from "../core/spring-solver.js";
import { useSpring } from "../react/useSpring.js";
import { SPRING_GENTLE } from "../tokens/springs.js";

export const SELECTED_HIGHLIGHT_CLASS_NAME = "bylgja-selected-highlight";

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

export interface UseSelectedHighlightOptions {
  className?: string | undefined;
  onSettled?: (() => void) | undefined;
  selected: boolean;
  springConfig?: SpringSolverConfig | undefined;
}

export interface SelectedHighlightBinding<T extends HTMLElement = HTMLElement> {
  className: string;
  "data-selected": "false" | "true";
  ref: MutableRefObject<T | null>;
}

export function useSelectedHighlight<T extends HTMLElement = HTMLElement>({
  className,
  onSettled,
  selected,
  springConfig = SPRING_GENTLE,
}: UseSelectedHighlightOptions): SelectedHighlightBinding<T> {
  const ref = useSpring<T>({
    config: springConfig,
    initialValue: selected ? 1 : 0,
    onSettled,
    targetValue: selected ? 1 : 0,
  });

  return {
    className: joinClassNames(SELECTED_HIGHLIGHT_CLASS_NAME, className),
    "data-selected": selected ? "true" : "false",
    ref,
  };
}
