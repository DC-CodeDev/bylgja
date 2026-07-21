/**
 * Spike de validacion visual — useScrollProgress con efecto reveal on scroll.
 * No es una feature final del paquete ni un hook orquestador oficial de Bylgja.
 */

import { useEffect, useRef, useState } from "react";
import { useScrollProgress } from "../../src/react/useScrollProgress.js";

const BLOCK_COUNT = 8;
const REVEAL_FINISH = 0.3;

function ScrollBlock({ index }: { index: number }) {
  const ref = useScrollProgress<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="scroll-block"
      data-block-id={index}
    >
      <span className="scroll-block__number">{String(index + 1).padStart(2, "0")}</span>
      <h2 className="scroll-block__title">Scroll Reveal Block</h2>
      <p className="scroll-block__desc">
        scroll-progress: <code>var(--scroll-progress)</code>
        &nbsp;·&nbsp; opacity hasta {Math.round(REVEAL_FINISH * 100)}%
      </p>
    </div>
  );
}

interface BlockDebugInfo {
  blockId: number;
  scrollVisible: string;
  scrollVisibleRatio: string;
  scrollProgress: string;
}

export function ScrollRevealView() {
  const [debugInfo, setDebugInfo] = useState<BlockDebugInfo>({
    blockId: 0,
    scrollVisible: "0",
    scrollVisibleRatio: "0",
    scrollProgress: "0",
  });

  const rafHandleRef = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (rafHandleRef.current !== null) {
        return;
      }

      rafHandleRef.current = requestAnimationFrame(() => {
        rafHandleRef.current = null;

        const blocks = document.querySelectorAll<HTMLElement>("[data-block-id]");
        const viewportCenter = window.innerHeight / 2;
        let closestId = 0;
        let closestDist = Infinity;

        blocks.forEach((block) => {
          const rect = block.getBoundingClientRect();
          const blockCenter = rect.top + rect.height / 2;
          const dist = Math.abs(blockCenter - viewportCenter);

          if (dist < closestDist) {
            closestDist = dist;
            closestId = Number(block.getAttribute("data-block-id"));
          }
        });

        const target = blocks[closestId] as HTMLElement | undefined;
        if (target) {
          setDebugInfo({
            blockId: closestId,
            scrollVisible: target.style.getPropertyValue("--scroll-visible") || "0",
            scrollVisibleRatio: target.style.getPropertyValue("--scroll-visible-ratio") || "0",
            scrollProgress: target.style.getPropertyValue("--scroll-progress") || "0",
          });
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initial read
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafHandleRef.current !== null) {
        cancelAnimationFrame(rafHandleRef.current);
        rafHandleRef.current = null;
      }
    };
  }, []);

  return (
    <div className="scroll-reveal-view">
      <div className="scroll-reveal-debug">
        <span>Bloque: <span className="debug-value">{debugInfo.blockId + 1}</span></span>
        <span>scroll-visible: <span className="debug-value">{debugInfo.scrollVisible}</span></span>
        <span>scroll-visible-ratio: <span className="debug-value">{debugInfo.scrollVisibleRatio}</span></span>
        <span>scroll-progress: <span className="debug-value">{debugInfo.scrollProgress}</span></span>
      </div>

      <div className="scroll-reveal-intro">
        <h1>Scroll Reveal</h1>
        <p>useScrollProgress con opacidad y desplazamiento</p>
      </div>

      {Array.from({ length: BLOCK_COUNT }, (_, i) => (
        <ScrollBlock key={i} index={i} />
      ))}

      <div className="scroll-reveal-end">
        <p>— Fin —</p>
      </div>
    </div>
  );
}
