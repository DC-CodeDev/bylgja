import { useState } from "react";
import {
  SPRING_GENTLE,
  SPRING_SNAPPY,
  useDraggable,
  type DraggableBehavior,
} from "../../src/index.js";

function DraggableCard({
  behavior,
}: {
  behavior: DraggableBehavior;
}) {
  const draggable = useDraggable<HTMLDivElement>({
    behavior,
    springConfig: behavior === "return" ? SPRING_SNAPPY : SPRING_GENTLE,
  });

  return (
    <div className="drag-demo-card-set">
      <div className="drag-demo-card-header">
        <h2>{behavior === "return" ? "Return / Rubber Band" : "Settle In Place"}</h2>
        <p>
          {behavior === "return"
            ? "Suelta y vuelve al origen usando la velocidad de salida."
            : "Suelta y se asienta cerca del punto final con la misma inercia inicial."}
        </p>
      </div>

      <div className="drag-demo-surface">
        <div
          ref={draggable.ref}
          className={`${draggable.className} drag-demo-card${draggable.isDragging ? " drag-demo-card--dragging" : ""}`}
          onMouseDown={draggable.onMouseDown}
          onMouseUp={draggable.onMouseUp}
          onPointerCancel={draggable.onPointerCancel}
          onPointerDown={draggable.onPointerDown}
          onPointerUp={draggable.onPointerUp}
        >
          <div className="drag-demo-card-glow" />
          <span className="drag-demo-card-label">Drag me</span>
          <span className="drag-demo-card-mode">{behavior}</span>
        </div>
      </div>

      <div className="drag-demo-stats">
        <span>x: <strong>{draggable.position.x.toFixed(1)}</strong></span>
        <span>y: <strong>{draggable.position.y.toFixed(1)}</strong></span>
        <span>vx: <strong>{draggable.releaseVelocity.x.toFixed(1)}</strong></span>
        <span>vy: <strong>{draggable.releaseVelocity.y.toFixed(1)}</strong></span>
        <span>dragging: <strong>{String(draggable.isDragging)}</strong></span>
      </div>
    </div>
  );
}

export function DraggableInertiaView() {
  const [mode, setMode] = useState<"compare" | DraggableBehavior>("compare");

  return (
    <section className="drag-demo-view">
      <header className="drag-demo-intro">
        <p className="drag-demo-eyebrow">Pilar 5 · playground spike</p>
        <h1>useDraggable with inertia</h1>
        <p>
          `usePressable` detecta press/release. El drag guarda las ultimas 4 muestras
          `{`x, y, timestamp`}` y calcula la velocidad de salida al soltar.
        </p>
      </header>

      <div className="drag-demo-mode-switch">
        <button
          className={`toggle-btn${mode === "compare" ? " toggle-btn--active" : ""}`}
          type="button"
          onClick={() => setMode("compare")}
        >
          Compare
        </button>
        <button
          className={`toggle-btn${mode === "return" ? " toggle-btn--active" : ""}`}
          type="button"
          onClick={() => setMode("return")}
        >
          Return
        </button>
        <button
          className={`toggle-btn${mode === "settle" ? " toggle-btn--active" : ""}`}
          type="button"
          onClick={() => setMode("settle")}
        >
          Settle
        </button>
      </div>

      <div className={`drag-demo-grid${mode === "compare" ? "" : " drag-demo-grid--single"}`}>
        {(mode === "compare" || mode === "return") && <DraggableCard behavior="return" />}
        {(mode === "compare" || mode === "settle") && <DraggableCard behavior="settle" />}
      </div>
    </section>
  );
}
