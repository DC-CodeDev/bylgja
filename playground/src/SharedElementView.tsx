import { useEffect, useRef, useState } from "react";
import { useSharedElementFlip } from "../../src/react/useSharedElementFlip.js";
import type { FlipInvertMeasurement } from "../../src/core/flip-invert.js";
import { useFade } from "../../src/variants/fade.js";
import "../../src/variants/fade.css";

const SHARED_ITEMS = [
  { id: "dawn", color: "#ff8a5b", accent: "#ffd8a8" },
  { id: "tide", color: "#4cc9f0", accent: "#caf0f8" },
  { id: "pine", color: "#38b000", accent: "#ccff33" },
  { id: "iris", color: "#7b2cbf", accent: "#e0aaff" },
  { id: "ember", color: "#ef233c", accent: "#ffccd5" },
  { id: "sand", color: "#e9c46a", accent: "#fef3c7" },
] as const;

type SharedItem = (typeof SHARED_ITEMS)[number];

interface SelectedOverlayItem {
  item: SharedItem;
  sourceRect: FlipInvertMeasurement | null;
}

function SharedOverlayCard({
  item,
  sourceRect,
}: {
  item: SharedItem;
  sourceRect: FlipInvertMeasurement | null;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  useSharedElementFlip(cardRef, sourceRect);

  return (
    <div
      ref={cardRef}
      data-flip-id={item.id}
      className="shared-overlay-card"
      style={{
        background: `linear-gradient(160deg, ${item.color}, ${item.accent})`,
      }}
    >
      <span className="shared-overlay-card__eyebrow">Shared element probe</span>
      <div className="shared-overlay-card__media" />
      <div className="shared-overlay-card__body">
        <h3>{item.id}</h3>
        <p>
          Este bloque usa `useSharedElementFlip` para entrar desde la
          miniatura clickeada.
        </p>
      </div>
    </div>
  );
}

export function SharedElementView() {
  const [selectedOverlayItem, setSelectedOverlayItem] = useState<SelectedOverlayItem | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [diagnosticNotes, setDiagnosticNotes] = useState<string[]>([]);
  const overlayContainerRef = useRef<HTMLDivElement | null>(null);
  const fade = useFade({
    show: overlayVisible,
    className: "shared-overlay-fade",
    onSettled: () => {
      if (!overlayVisible) {
        setSelectedOverlayItem(null);
      }
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get("shared");
    if (!requestedId) {
      return;
    }

    const item = SHARED_ITEMS.find((entry) => entry.id === requestedId);
    if (!item) {
      return;
    }

    setSelectedOverlayItem({
      item,
      sourceRect: null,
    });
    setOverlayVisible(true);
  }, []);

  useEffect(() => {
    const selectedItem = selectedOverlayItem?.item;
    if (!overlayVisible || !selectedItem) {
      return;
    }

    const sampleTimes = [0, 120, 280];
    const timeoutIds: number[] = [];

    setDiagnosticNotes([
      `open:${selectedItem.id}`,
    ]);

    for (const sampleTime of sampleTimes) {
      const timeoutId = window.setTimeout(() => {
        const overlayChild = overlayContainerRef.current?.firstElementChild;
        if (!(overlayChild instanceof HTMLElement)) {
          setDiagnosticNotes((current) => [...current, `t+${sampleTime}ms missing-child`]);
          return;
        }

        const rect = overlayChild.getBoundingClientRect();
        const style = window.getComputedStyle(overlayChild);
        setDiagnosticNotes((current) => [
          ...current,
          `t+${sampleTime}ms transform=${style.transform} rect=${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)}x${Math.round(rect.height)}`,
        ]);
      }, sampleTime);

      timeoutIds.push(timeoutId);
    }

    return () => {
      for (const timeoutId of timeoutIds) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [overlayVisible, selectedOverlayItem]);

  const openOverlay = (item: SharedItem, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setSelectedOverlayItem({
      item,
      sourceRect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
    });
    setOverlayVisible(true);
  };

  const closeOverlay = () => {
    setOverlayVisible(false);
  };

  return (
    <section className="shared-view">
      <div className="shared-meta">
        <h2>Shared element diagnostic</h2>
        <p>
          Click en una tarjeta para montar un overlay nuevo y probar si
          `useSharedElementFlip` parte desde la miniatura real en vez de aparecer
          directo en el overlay.
        </p>
        <div className="shared-diagnostics">
          {diagnosticNotes.length === 0 ? (
            <span>Sin muestras todavia.</span>
          ) : (
            diagnosticNotes.map((note) => <span key={note}>{note}</span>)
          )}
        </div>
      </div>

      <div className="shared-grid">
        {SHARED_ITEMS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className="shared-card"
            onClick={(event) => {
              const card = event.currentTarget.querySelector(".shared-card__inner");
              if (!(card instanceof HTMLElement)) {
                return;
              }

              openOverlay(item, card);
            }}
          >
            <div
              data-flip-id={item.id}
              className="shared-card__inner"
              style={{
                background: `linear-gradient(145deg, ${item.color}, ${item.accent})`,
              }}
            >
              <span className="shared-card__index">{String(index + 1).padStart(2, "0")}</span>
              <div className="shared-card__media" />
              <span className="shared-card__label">{item.id}</span>
            </div>
          </button>
        ))}
      </div>

      {fade.render(
        selectedOverlayItem ? (
          <div className="shared-overlay-shell" onClick={closeOverlay}>
            <button className="shared-overlay-close" type="button" onClick={closeOverlay}>
              Cerrar
            </button>
            <div
              ref={overlayContainerRef}
              className="shared-overlay-stage"
              onClick={(event) => event.stopPropagation()}
            >
              <SharedOverlayCard
                key={selectedOverlayItem.item.id}
                item={selectedOverlayItem.item}
                sourceRect={selectedOverlayItem.sourceRect}
              />
            </div>
          </div>
        ) : null,
      )}
    </section>
  );
}
