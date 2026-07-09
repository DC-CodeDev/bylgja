import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import type { MutableRefObject } from "react";
import type { SpringSolverConfig } from "../core/spring-solver.js";
import { useSpring } from "./useSpring.js";

const ENTRY_TARGET = 1;

export interface PresenceProps extends HTMLAttributes<HTMLDivElement> {
  "data-state"?: string | undefined;
  show: boolean;
  exitConfig: SpringSolverConfig;
  exitTarget?: number;
  onSettled?: (() => void) | undefined;
}

interface PresenceBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  initialValue: number;
  onSettled?: (() => void) | undefined;
  show: boolean;
  springConfig: SpringSolverConfig;
  targetValue: number;
}

function PresenceBody({
  children,
  initialValue,
  onSettled,
  show,
  springConfig,
  targetValue,
  ...divProps
}: PresenceBodyProps) {
  const springRef: MutableRefObject<HTMLDivElement | null> = useSpring<HTMLDivElement>(
    show ? ENTRY_TARGET : targetValue,
    springConfig,
    initialValue,
    onSettled,
  );

  return (
    <div ref={springRef} {...divProps}>
      {children}
    </div>
  );
}

export function Presence({
  children,
  show,
  exitConfig,
  exitTarget = 0,
  onSettled,
  ...divProps
}: PresenceProps) {
  const [isPresent, setIsPresent] = useState(show);
  const [initialValue, setInitialValue] = useState(show ? ENTRY_TARGET : exitTarget);
  const showRef = useRef(show);

  showRef.current = show;

  useEffect(() => {
    if (show) {
      setInitialValue(exitTarget);
      setIsPresent(true);
    }
  }, [exitTarget, show]);

  if (!isPresent) {
    return null;
  }

  // Presence always renders a wrapper so there is a stable DOM node that owns
  // the --spring-progress custom property consumed by CSS variants.
  return (
    <PresenceBody
      {...divProps}
      initialValue={initialValue}
      onSettled={() => {
        onSettled?.();
        if (!showRef.current) {
          setIsPresent(false);
        }
      }}
      show={show}
      springConfig={exitConfig}
      targetValue={exitTarget}
    >
      {children}
    </PresenceBody>
  );
}
