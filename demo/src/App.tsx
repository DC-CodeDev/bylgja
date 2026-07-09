import { useState } from "react";
import {
  SPRING_GENTLE,
  SPRING_SNAPPY,
  useFade,
  useFadeScale,
  useModalBackdrop,
  useModalPanel,
  usePressable,
  useSelectedHighlight,
  useSpring,
} from "bylgja";

type SpringTokenName = "gentle" | "snappy";

const springTokens = {
  gentle: SPRING_GENTLE,
  snappy: SPRING_SNAPPY,
} as const;

const files = [
  "atlas-notes.md",
  "motion-spec.ts",
  "presence-review.txt",
  "release-checklist.md",
];

function SpringDemo() {
  const [right, setRight] = useState(false);
  const [tokenName, setTokenName] = useState<SpringTokenName>("gentle");
  const springRef = useSpring<HTMLDivElement>(
    right ? 1 : 0,
    springTokens[tokenName],
    right ? 1 : 0,
  );

  return (
    <section className="demo-section">
      <div className="section-heading">
        <h2>Spring puro</h2>
        <div className="controls">
          <select
            aria-label="Spring token"
            value={tokenName}
            onChange={(event) => setTokenName(event.target.value as SpringTokenName)}
          >
            <option value="gentle">SPRING_GENTLE</option>
            <option value="snappy">SPRING_SNAPPY</option>
          </select>
          <button type="button" onClick={() => setRight((value) => !value)}>
            mover
          </button>
        </div>
      </div>
      <div className="spring-track">
        <div ref={springRef} className="spring-dot" />
      </div>
    </section>
  );
}

function FadeDemo() {
  const [show, setShow] = useState(true);
  const [settledCount, setSettledCount] = useState(0);
  const fade = useFade({
    show,
    strategy: "presence",
    onSettled: () => setSettledCount((count) => count + 1),
  });
  const fadeScale = useFadeScale({ show });

  return (
    <section className="demo-section">
      <div className="section-heading">
        <h2>Fade y fadeScale</h2>
        <button type="button" onClick={() => setShow((value) => !value)}>
          toggle
        </button>
      </div>
      <div className="fade-stage">
        {fade.render(<div className="fade-card coral" />)}
        {fadeScale.render(<div className="fade-card mint" />)}
      </div>
      <p className="microcopy">settled: {settledCount}</p>
    </section>
  );
}

function ModalDemo() {
  const [open, setOpen] = useState(false);
  const backdrop = useModalBackdrop({ show: open });
  const panel = useModalPanel({ show: open });

  return (
    <section className="demo-section">
      <div className="section-heading">
        <h2>Modal</h2>
        <button type="button" onClick={() => setOpen(true)}>
          abrir
        </button>
      </div>
      <div className="modal-anchor">
        <div className="modal-preview-shape" />
      </div>
      {backdrop.render(
        <button
          type="button"
          className="modal-backdrop-hitbox"
          aria-label="Cerrar modal"
          onClick={() => setOpen(false)}
        />,
      )}
      {panel.render(
        <div className="modal-card" role="dialog" aria-modal="true" aria-label="Bylgja modal demo">
          <div className="modal-orb" />
          <button type="button" onClick={() => setOpen(false)}>
            cerrar
          </button>
        </div>,
      )}
    </section>
  );
}

function PressableDemo() {
  const circle = usePressable<HTMLButtonElement>({ className: "pressable-shape circle" });
  const square = usePressable<HTMLButtonElement>({ className: "pressable-shape square" });
  const pill = usePressable<HTMLButtonElement>({ className: "pressable-pill" });

  return (
    <section className="demo-section">
      <h2>Pressable</h2>
      <div className="pressable-row">
        <button type="button" aria-label="Circulo pressable" {...circle} />
        <button type="button" aria-label="Cuadrado pressable" {...square} />
        <button type="button" {...pill}>
          press
        </button>
      </div>
    </section>
  );
}

function SelectableFile({
  name,
  selected,
  onSelect,
}: {
  name: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const highlight = useSelectedHighlight<HTMLButtonElement>({
    selected,
    className: "file-item",
  });

  return (
    <button type="button" {...highlight} onClick={onSelect}>
      <span className="file-icon" />
      {name}
    </button>
  );
}

function SelectedHighlightDemo() {
  const [selectedFile, setSelectedFile] = useState(files[1]);

  return (
    <section className="demo-section">
      <h2>SelectedHighlight</h2>
      <div className="file-list">
        {files.map((file) => (
          <SelectableFile
            key={file}
            name={file}
            selected={selectedFile === file}
            onSelect={() => setSelectedFile(file)}
          />
        ))}
      </div>
    </section>
  );
}

export default function App() {
  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Bylgja visual demo</p>
          <h1>Motion primitives in browser</h1>
        </div>
        <p className="reduced-motion-note">
          Para probar reduced motion, activa la preferencia desde DevTools o desde la
          configuracion de accesibilidad del sistema y vuelve a interactuar.
        </p>
      </header>
      <SpringDemo />
      <FadeDemo />
      <ModalDemo />
      <PressableDemo />
      <SelectedHighlightDemo />
    </main>
  );
}
