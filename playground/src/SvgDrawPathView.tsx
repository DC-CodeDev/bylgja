import { useEffect, useRef, useState } from "react";
import { SvgStrokePresence } from "../../src/index.js";
import { useScrollProgress } from "../../src/react/useScrollProgress.js";

function MountTriggeredExample() {
  const [show, setShow] = useState(false);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    setShow(true);
  }, [runId]);

  const replay = (): void => {
    setShow(false);
    requestAnimationFrame(() => {
      setRunId((value) => value + 1);
    });
  };

  return (
    <article className="svg-draw-card">
      <header className="svg-draw-card__header">
        <p className="svg-draw-card__eyebrow">Mount trigger</p>
        <h2>Draw Path</h2>
        <p>
          `show` arranca en `false` y pasa a `true` después del primer render para
          disparar el enter de `Presence`.
        </p>
      </header>

      <button className="toggle-btn" type="button" onClick={replay}>
        Replay
      </button>

      <div className="svg-draw-demo-stage">
        <SvgStrokePresence
          key={runId}
          direction="draw"
          path="M 18 84 C 74 18, 166 18, 222 84"
          show={show}
          viewBox="0 0 240 120"
          wrapperClassName="svg-draw-demo-presence"
        />
      </div>
    </article>
  );
}

function ScrollTriggeredExample() {
  const scrollRef = useScrollProgress<HTMLDivElement>({ threshold: 0.45 });
  const [show, setShow] = useState(false);
  const rafHandleRef = useRef<number | null>(null);

  useEffect(() => {
    const readVisibility = (): void => {
      const element = scrollRef.current;
      if (!element) {
        return;
      }

      const visible = element.style.getPropertyValue("--scroll-visible");
      setShow(visible === "1");
    };

    const handleScroll = (): void => {
      if (rafHandleRef.current !== null) {
        return;
      }

      rafHandleRef.current = requestAnimationFrame(() => {
        rafHandleRef.current = null;
        readVisibility();
      });
    };

    const initialReadHandle = requestAnimationFrame(() => {
      readVisibility();
    });

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      cancelAnimationFrame(initialReadHandle);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (rafHandleRef.current !== null) {
        cancelAnimationFrame(rafHandleRef.current);
        rafHandleRef.current = null;
      }
    };
  }, [scrollRef]);

  return (
    <article className="svg-draw-card svg-draw-card--scroll">
      <header className="svg-draw-card__header">
        <p className="svg-draw-card__eyebrow">Scroll trigger</p>
        <h2>Stroke Reveal</h2>
        <p>
          `show` se deriva de `useScrollProgress` leyendo `--scroll-visible` del
          contenedor observado.
        </p>
      </header>

      <div className="svg-draw-scroll-spacer">
        <span>Scroll down</span>
      </div>

      <div ref={scrollRef} className="svg-draw-demo-stage svg-draw-demo-stage--scroll">
        <SvgStrokePresence
          direction="draw"
          path="M 24 60 L 88 94 L 216 24"
          pathProps={{ strokeLinecap: "round", strokeLinejoin: "round" }}
          show={show}
          svgLabel="Scroll triggered SVG stroke reveal"
          viewBox="0 0 240 120"
          wrapperClassName="svg-draw-demo-presence"
        />
      </div>
    </article>
  );
}

function HoverTriggeredExample() {
  const [show, setShow] = useState(true);

  return (
    <article className="svg-draw-card">
      <header className="svg-draw-card__header">
        <p className="svg-draw-card__eyebrow">Hover trigger</p>
        <h2>Undraw</h2>
        <p>
          `show` se controla manualmente con `onMouseEnter` y `onMouseLeave`, sin
          helper extra.
        </p>
      </header>

      <div
        className="svg-draw-demo-stage svg-draw-demo-stage--hover"
        onMouseEnter={() => setShow(false)}
        onMouseLeave={() => setShow(true)}
      >
        <SvgStrokePresence
          direction="undraw"
          path="M 20 30 C 56 92, 112 92, 140 30 S 206 -2, 220 64"
          pathProps={{ strokeLinecap: "round" }}
          show={show}
          svgLabel="Hover triggered SVG undraw"
          viewBox="0 0 240 120"
          wrapperClassName="svg-draw-demo-presence"
        />
        <p className="svg-draw-hover-note">Hover aquí para borrar el trazo.</p>
      </div>
    </article>
  );
}

export function SvgDrawPathView() {
  return (
    <section className="svg-draw-view">
      <header className="svg-draw-intro">
        <p className="svg-draw-eyebrow">Pilar 4A · SVG stroke drawing</p>
        <h1>Draw Path, Undraw, Stroke Reveal</h1>
        <p>
          Componente reusable en playground que reacciona solo a `show` y resuelve
          `draw` vs `undraw` invirtiendo el signo del cálculo de `stroke-dashoffset`.
        </p>
      </header>

      <div className="svg-draw-grid">
        <MountTriggeredExample />
        <HoverTriggeredExample />
      </div>

      <ScrollTriggeredExample />
    </section>
  );
}
