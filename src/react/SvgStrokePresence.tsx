import type { CSSProperties, ReactNode, SVGProps } from "react";
import { Presence } from "./Presence.js";
import type { SpringSolverConfig } from "../core/spring-solver.js";
import { SPRING_GENTLE } from "../tokens/springs.js";

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

export type SvgStrokeDirection = "draw" | "undraw";

export interface SvgStrokePresenceProps {
  children?: ReactNode;
  direction: SvgStrokeDirection;
  path?: string;
  pathClassName?: string;
  pathLength?: number;
  pathProps?: SVGProps<SVGPathElement>;
  show: boolean;
  springConfig?: SpringSolverConfig;
  svgClassName?: string;
  svgLabel?: string;
  svgProps?: SVGProps<SVGSVGElement>;
  viewBox: string;
  wrapperClassName?: string;
}

export function SvgStrokePresence({
  children,
  direction,
  path,
  pathClassName,
  pathLength = 100,
  pathProps,
  show,
  springConfig = SPRING_GENTLE,
  svgClassName,
  svgLabel = "Animated SVG stroke",
  svgProps,
  viewBox,
  wrapperClassName,
}: SvgStrokePresenceProps) {
  const directionSign = direction === "draw" ? -1 : 1;
  const style = {
    "--svg-path-length": pathLength,
    "--svg-stroke-direction-sign": directionSign,
  } as CSSProperties;

  return (
    <Presence
      className={joinClassNames("svg-stroke-presence", wrapperClassName)}
      exitConfig={springConfig}
      exitTarget={0}
      show={show}
      style={style}
    >
      <svg
        {...svgProps}
        aria-label={svgLabel}
        className={joinClassNames("svg-stroke-canvas", svgClassName, svgProps?.className)}
        role="img"
        viewBox={viewBox}
      >
        {children ?? (
          <path
            {...pathProps}
            className={joinClassNames("svg-stroke-path", pathClassName, pathProps?.className)}
            d={path ?? "M 20 72 C 72 18, 168 18, 220 72"}
            pathLength={pathLength}
          />
        )}
      </svg>
    </Presence>
  );
}
