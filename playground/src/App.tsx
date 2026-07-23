/**
 * Spike de validacion — traza de luz con offset-path.
 * No es una feature final del paquete.
 *
 * Al hacer click sobre la card se dispara un pulso animado de
 * un punto que recorre el contorno usando offset-path y el
 * progreso de useSpring.
 *
 * La animacion usa el hook useSpring de Bylgja (importado por
 * path relativo desde src/) y escribe --spring-progress en el
 * elemento. El trail-dot lee esa custom property para calcular
 * su offset-distance y su opacidad de desvanecimiento.
 */

import { useState } from "react";
import { useSpring } from "../../src/react/useSpring.js";
import { SPRING_SNAPPY } from "../../src/tokens/springs.js";
import type { SpringSolverConfig } from "../../src/core/spring-solver.js";
import { WavePropagationView } from "./WavePropagationView.js";
import { PointerTrackerTiltView } from "./PointerTrackerTiltView.js";
import { ScrollRevealView } from "./ScrollRevealView.js";
import { LoopPresetsView } from "./LoopPresetsView.js";
import { FlipLayoutView } from "./FlipLayoutView.js";
import { SharedElementView } from "./SharedElementView.js";
import { DraggableInertiaView } from "./DraggableInertiaView.js";
import { SvgDrawPathView } from "./SvgDrawPathView.js";
import "./styles.css";

/**
 * SPRING_DEBUG_SLOW — configuracion de spring exclusiva para inspeccion
 * visual del recorrido del offset-path con detalle.
 *
 * Stiffness bajo y mass alto para que la animacion dure ~2-3 segundos
 * en lugar de los ~200ms de SPRING_SNAPPY. Permite ver el punto
 * recorrer cada esquina sin perderse en un parpadeo.
 *
 * ¡REVERTIR a SPRING_SNAPPY antes de dar el spike por cerrado!
 */
const SPRING_DEBUG_SLOW = {
  stiffness: 25,
  damping: 6,
  mass: 2,
} as const;

type SpringConfigKey = "snappy" | "debug-slow";
type PlaygroundView =
  | "offset-path"
  | "wave-propagation"
  | "pointer-tracker"
  | "scroll-reveal"
  | "loops"
  | "flip-layout"
  | "shared-element"
  | "draggable-inertia"
  | "svg-draw-path";

const SPRING_CONFIGS: Record<SpringConfigKey, SpringSolverConfig> = {
  "snappy": SPRING_SNAPPY,
  "debug-slow": SPRING_DEBUG_SLOW,
};

function getInitialView(): PlaygroundView {
  if (typeof window === "undefined") {
    return "offset-path";
  }

  const requestedView = new URLSearchParams(window.location.search).get("view");
  switch (requestedView) {
    case "wave-propagation":
    case "pointer-tracker":
    case "scroll-reveal":
    case "loops":
    case "flip-layout":
    case "shared-element":
    case "draggable-inertia":
    case "svg-draw-path":
      return requestedView;
    default:
      return "offset-path";
  }
}

function supportsOffsetPath(): boolean {
  return (
    typeof CSS !== "undefined" &&
    CSS.supports !== undefined &&
    CSS.supports("offset-path", "path('M 0 0')")
  );
}

/**
 * Self-contained card. Manages its own pulseKey so clicks are independent.
 * Remounts the spring on each click via key={pulseKey}.
 */
function PulsingCard({
  springConfig,
  cardClassName,
  label,
}: {
  springConfig: SpringSolverConfig;
  cardClassName: string;
  label: string;
}) {
  const [pulseKey, setPulseKey] = useState(0);
  const [settled, setSettled] = useState(false);
  const [animating, setAnimating] = useState(false);

  const ref = useSpring<HTMLDivElement>({
    targetValue: 1,
    config: springConfig,
    initialValue: 0,
    onSettled: () => {
      setSettled(true);
      setAnimating(false);
    },
  });

  const handleClick = () => {
    if (animating) return;
    setPulseKey((k) => k + 1);
    setSettled(false);
    setAnimating(true);
  };

  return (
    <div className="card-set">
      <p className="card-size-label">{label}</p>
      <div className="card-wrapper" onClick={handleClick}>
        <div
          key={pulseKey}
          ref={ref}
          className={`card ${cardClassName}`}
        >
          <div className="trail-dot" />
          <p className="card-label">
            {settled ? "Completado \u2014 haz clic de nuevo" : "\u2026"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [springKey, setSpringKey] = useState<SpringConfigKey>("snappy");
  const [view, setView] = useState<PlaygroundView>(() => getInitialView());

  const toggleConfig = () => {
    setSpringKey((k) => (k === "snappy" ? "debug-slow" : "snappy"));
  };

  const activeConfig = SPRING_CONFIGS[springKey];
  const configLabel = springKey === "snappy" ? "SPRING_SNAPPY" : "SPRING_DEBUG_SLOW";

  return (
    <main className="playground">
      <div className="playground-header">
        {view === "offset-path" ? (
          <button className="toggle-btn" type="button" onClick={toggleConfig}>
            Spring: {configLabel}
          </button>
        ) : (
          <div />
        )}
        <div className="view-toggle">
          <button
            className={`toggle-btn${view === "offset-path" ? " toggle-btn--active" : ""}`}
            type="button"
            onClick={() => setView("offset-path")}
          >
            Offset Path
          </button>
          <button
            className={`toggle-btn${view === "wave-propagation" ? " toggle-btn--active" : ""}`}
            type="button"
            onClick={() => setView("wave-propagation")}
          >
            Wave Propagation
          </button>
          <button
            className={`toggle-btn${view === "pointer-tracker" ? " toggle-btn--active" : ""}`}
            type="button"
            onClick={() => setView("pointer-tracker")}
          >
            Pointer Tracker
          </button>
          <button
            className={`toggle-btn${view === "scroll-reveal" ? " toggle-btn--active" : ""}`}
            type="button"
            onClick={() => setView("scroll-reveal")}
          >
            Scroll Reveal
          </button>
          <button
            className={`toggle-btn${view === "loops" ? " toggle-btn--active" : ""}`}
            type="button"
            onClick={() => setView("loops")}
          >
            CSS Loops
          </button>
          <button
            className={`toggle-btn${view === "flip-layout" ? " toggle-btn--active" : ""}`}
            type="button"
            onClick={() => setView("flip-layout")}
          >
            FLIP Layout
          </button>
          <button
            className={`toggle-btn${view === "shared-element" ? " toggle-btn--active" : ""}`}
            type="button"
            onClick={() => setView("shared-element")}
          >
            Shared Element
          </button>
          <button
            className={`toggle-btn${view === "draggable-inertia" ? " toggle-btn--active" : ""}`}
            type="button"
            onClick={() => setView("draggable-inertia")}
          >
            Draggable Inertia
          </button>
          <button
            className={`toggle-btn${view === "svg-draw-path" ? " toggle-btn--active" : ""}`}
            type="button"
            onClick={() => setView("svg-draw-path")}
          >
            SVG Draw Path
          </button>
        </div>
      </div>

      {view === "offset-path" ? (
        supportsOffsetPath() ? (
          <div className="cards-grid">
            <PulsingCard
              springConfig={activeConfig}
              cardClassName="card--small"
              label="320 × 200 px"
            />
            <PulsingCard
              springConfig={activeConfig}
              cardClassName="card--large"
              label="480 × 600 px"
            />
          </div>
        ) : (
          <div className="fallback">
            Tu navegador no soporta <code>offset-path</code>
          </div>
        )
      ) : view === "wave-propagation" ? (
        <WavePropagationView />
      ) : view === "pointer-tracker" ? (
        <PointerTrackerTiltView />
      ) : view === "loops" ? (
        <LoopPresetsView />
      ) : view === "flip-layout" ? (
        <FlipLayoutView />
      ) : view === "shared-element" ? (
        <SharedElementView />
      ) : view === "draggable-inertia" ? (
        <DraggableInertiaView />
      ) : view === "svg-draw-path" ? (
        <SvgDrawPathView />
      ) : (
        <ScrollRevealView />
      )}
    </main>
  );
}
