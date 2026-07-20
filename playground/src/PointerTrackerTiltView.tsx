/**
 * Spike de validacion visual — usePointerTracker con efecto tilt 3D.
 * No es una feature final del paquete ni un hook orquestador oficial de Bylgja.
 */

import { useState } from "react";
import { usePointerTracker, type PointerPosition } from "../../src/react/usePointerTracker.js";

const TILT_MAX_ANGLE = 15;

export function PointerTrackerTiltView() {
  const [lastPosition, setLastPosition] = useState<PointerPosition>({
    x: 0,
    y: 0,
    normalizedX: 0,
    normalizedY: 0,
    isInside: false,
  });

  const ref = usePointerTracker<HTMLDivElement>({
    onMove(position) {
      setLastPosition(position);
    },
  });

  return (
    <div className="tilt-view">
      <div className="tilt-debug-panel">
        <span>normalizedX: <span className="tilt-debug-value">{lastPosition.normalizedX.toFixed(4)}</span></span>
        <span>normalizedY: <span className="tilt-debug-value">{lastPosition.normalizedY.toFixed(4)}</span></span>
        <span>isInside: <span className="tilt-debug-value">{String(lastPosition.isInside)}</span></span>
      </div>

      <div className="tilt-card-container">
        <div
          ref={ref}
          className="tilt-card"
          data-testid="tilt-card"
        >
          <div className="tilt-card-shine" />
          <h2 className="tilt-card-title">usePointerTracker</h2>
          <p className="tilt-card-subtitle">
            normalizedX · normalizedY · isInside
          </p>
          <div className="tilt-card-divider" />
          <p className="tilt-card-desc">
            Mueve el cursor sobre la tarjeta para ver el efecto 3D.
            El angulo maximo de inclinacion es {TILT_MAX_ANGLE}&deg;.
          </p>
        </div>
      </div>
    </div>
  );
}
