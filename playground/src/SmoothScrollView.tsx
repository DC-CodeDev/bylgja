/**
 * Spike de calibracion — SmoothScrollProvider con fisica de spring.
 * Entorno aislado para ajustar STIFFNESS / DAMPING / MASS antes de
 * llevar el provider al portafolio real.
 *
 * Editar las constantes en src/react/SmoothScrollProvider.tsx,
 * guardar, y el HMR recarga el provider sin recargar la pagina.
 */

import { useEffect } from "react";
import { SmoothScrollProvider } from "../../src/react/SmoothScrollProvider.js";

const SECTIONS: { bg: string; n: string }[] = [
  { bg: "#0f0e17", n: "01" },
  { bg: "#1b1b2f", n: "02" },
  { bg: "#162447", n: "03" },
  { bg: "#1f4068", n: "04" },
  { bg: "#2d3561", n: "05" },
  { bg: "#0a3d62", n: "06" },
  { bg: "#1b262c", n: "07" },
];

interface SmoothScrollViewProps {
  onBack: () => void;
}

export function SmoothScrollView({ onBack }: SmoothScrollViewProps) {
  useEffect(() => {
    return () => {
      window.scrollTo(0, 0);
    };
  }, []);

  return (
    <>
      {/* Fuera del provider — position:fixed real, no afectado por el transform del contenido */}
      <button
        type="button"
        onClick={onBack}
        style={{
          position: "fixed",
          top: "1rem",
          left: "1rem",
          zIndex: 999,
          padding: "0.5rem 1rem",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "0.5rem",
          color: "rgba(255,255,255,0.7)",
          cursor: "pointer",
          fontSize: "0.8125rem",
          backdropFilter: "blur(8px)",
        }}
      >
        ← Volver
      </button>

      <SmoothScrollProvider>
        <div style={{ width: "100%" }}>
          {SECTIONS.map((s) => (
            <div
              key={s.n}
              style={{
                height: "100vh",
                background: s.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontSize: "clamp(6rem, 20vw, 14rem)",
                  fontWeight: 900,
                  color: "rgba(255,255,255,0.12)",
                  fontFamily: "system-ui, sans-serif",
                  letterSpacing: "-0.05em",
                  lineHeight: 1,
                  userSelect: "none",
                }}
              >
                {s.n}
              </span>
            </div>
          ))}
        </div>
      </SmoothScrollProvider>
    </>
  );
}
