/**
 * Spike de validacion visual — createWavePropagation con multiples elementos.
 * No es una feature final del paquete ni un hook orquestador oficial de Bylgja.
 */

import { useCallback, useRef, useState } from "react";
import { useSpring } from "../../src/react/useSpring.js";
import { SPRING_GENTLE } from "../../src/tokens/springs.js";
import {
  createWavePropagation,
  type PropagationElement,
} from "../../src/core/wave-propagation.js";

const GRID_SIZE = 6;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;

const DEFAULT_PROPAGATION_SPEED = 800;
const DEFAULT_MIN_AMPLITUDE = 0.3;
const DEFAULT_MAX_AMPLITUDE = 1;

interface CellWaveParams {
  delay: number;
  amplitude: number;
}

function GridCell({
  index,
  delay,
  amplitude,
  isOrigin,
  onClick,
}: {
  index: number;
  delay: number;
  amplitude: number;
  isOrigin: boolean;
  onClick: () => void;
}) {
  const [targetValue, setTargetValue] = useState(amplitude);
  const hasReturnedRef = useRef(false);

  const ref = useSpring<HTMLDivElement>({
    targetValue,
    config: SPRING_GENTLE,
    initialValue: 0,
    startDelay: delay,
    onSettled: () => {
      if (!hasReturnedRef.current) {
        hasReturnedRef.current = true;
        setTargetValue(0);
      }
    },
  });

  return (
    <div
      ref={ref}
      className={`grid-cell${isOrigin ? " grid-cell--origin" : ""}`}
      onClick={onClick}
      data-cell-id={String(index)}
      style={{ transform: "scale(calc(1 + var(--spring-progress, 0)))" }}
    >
      <span className="grid-cell__index">{index}</span>
    </div>
  );
}

export function WavePropagationView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [waveKey, setWaveKey] = useState(0);
  const [originIndex, setOriginIndex] = useState<number | null>(null);
  const [cellParams, setCellParams] = useState<CellWaveParams[] | null>(null);

  const handleCellClick = useCallback((clickedIndex: number) => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const cellElements =
      container.querySelectorAll<HTMLElement>("[data-cell-id]");

    const elements: PropagationElement[] = [];
    cellElements.forEach((el) => {
      const id = el.getAttribute("data-cell-id")!;
      const rect = el.getBoundingClientRect();
      elements.push({
        id,
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top + rect.height / 2 - containerRect.top,
      });
    });

    const origin = elements[clickedIndex];
    const results = createWavePropagation(elements, origin);

    const params: CellWaveParams[] = [];
    for (let i = 0; i < CELL_COUNT; i++) {
      params.push({ delay: 0, amplitude: 0 });
    }
    for (const r of results) {
      params[Number(r.id)] = { delay: r.delay, amplitude: r.amplitude };
    }

    setOriginIndex(clickedIndex);
    setCellParams(params);
    setWaveKey((k) => k + 1);
  }, []);

  return (
    <div className="wave-view">
      <div className="wave-config-panel">
        <span>propagationSpeed: {DEFAULT_PROPAGATION_SPEED}px/s</span>
        <span>minAmplitude: {DEFAULT_MIN_AMPLITUDE}</span>
        <span>maxAmplitude: {DEFAULT_MAX_AMPLITUDE}</span>
      </div>

      {cellParams !== null && (
        <p className="wave-origin-label">Origen: celda {originIndex}</p>
      )}

      <div className="wave-grid" ref={containerRef}>
        {Array.from({ length: CELL_COUNT }, (_, i) => {
          const params = cellParams?.[i];
          return (
            <GridCell
              key={`${waveKey}-${i}`}
              index={i}
              delay={params?.delay ?? 0}
              amplitude={params?.amplitude ?? 0}
              isOrigin={originIndex === i}
              onClick={() => handleCellClick(i)}
            />
          );
        })}
      </div>
    </div>
  );
}
