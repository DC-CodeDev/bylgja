import { useRef, useState } from "react";
import { useFlip } from "../../src/react/useFlip.js";
import type { Breakpoint } from "../../src/react/useBreakpoint.js";
import { useBreakpoint } from "../../src/react/useBreakpoint.js";

const FLIP_ITEMS = [
  { id: "aurora", color: "#ff6b6b" },
  { id: "lagoon", color: "#f7b267" },
  { id: "frost", color: "#ffd166" },
  { id: "mint", color: "#06d6a0" },
  { id: "reef", color: "#4cc9f0" },
  { id: "iris", color: "#4361ee" },
  { id: "orchid", color: "#8338ec" },
  { id: "ember", color: "#ff006e" },
] as const;

type FlipStaggerMode = "none" | "index" | "distance";

const COLUMNS_BY_BREAKPOINT: Record<Breakpoint, number> = {
  base: 2,
  sm: 2,
  md: 3,
  lg: 3,
  xl: 4,
  "2xl": 4,
};

function shuffleItems<T>(items: readonly T[]): T[] {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = next[index];
    next[index] = next[swapIndex];
    next[swapIndex] = current;
  }

  return next;
}

export function FlipLayoutView() {
  const [staggerMode, setStaggerMode] = useState<FlipStaggerMode>("none");
  const [items, setItems] = useState(() => [...FLIP_ITEMS]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const breakpoint = useBreakpoint();
  const columns = COLUMNS_BY_BREAKPOINT[breakpoint];

  useFlip(containerRef, items, { staggerMode });

  return (
    <section className="flip-view">
      <div className="flip-toolbar">
        <div className="flip-controls">
          <button
            className="toggle-btn"
            type="button"
            onClick={() => setItems((current) => shuffleItems(current))}
          >
            Reordenar
          </button>
          <label className="flip-select-field">
            <span>Stagger</span>
            <select
              className="flip-select"
              value={staggerMode}
              onChange={(event) => setStaggerMode(event.target.value as FlipStaggerMode)}
            >
              <option value="none">none</option>
              <option value="index">index</option>
              <option value="distance">distance</option>
            </select>
          </label>
        </div>
        <div className="flip-meta">
          <p className="flip-caption">
            Reordena la grilla para forzar translate y scale en el mismo reflow.
          </p>
          <p className="flip-breakpoint">
            Breakpoint activo: {breakpoint} · Columnas: {columns}
          </p>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flip-grid"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {items.map((item, index) => (
          <div
            key={item.id}
            data-flip-id={item.id}
            className="flip-card"
            style={{
              background: `linear-gradient(145deg, ${item.color}, rgba(255, 255, 255, 0.08))`,
            }}
          >
            <span className="flip-card__index">{String(index + 1).padStart(2, "0")}</span>
            <span className="flip-card__label">{item.id}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
