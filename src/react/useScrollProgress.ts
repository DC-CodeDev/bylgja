import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";

export interface UseScrollProgressOptions {
  /**
   * Umbral de intersección del IntersectionObserver.
   * Fracción del elemento que debe estar visible para que
   * scroll-visible se considere 1. Por defecto 0.1 (10 %).
   */
  threshold?: number;
}

const SCROLL_VISIBLE_PROPERTY = "--scroll-visible";
const SCROLL_VISIBLE_RATIO_PROPERTY = "--scroll-visible-ratio";
const SCROLL_PROGRESS_PROPERTY = "--scroll-progress";
const DEFAULT_THRESHOLD = 0.1;

export function useScrollProgress<T extends HTMLElement = HTMLElement>(
  options?: UseScrollProgressOptions,
): MutableRefObject<T | null> {
  const elementRef = useRef<T | null>(null);
  const rafHandleRef = useRef<number | null>(null);
  const threshold = options?.threshold ?? DEFAULT_THRESHOLD;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    // --- scroll-progress: cálculo inmediato + actualización por scroll ---

    const computeProgress = (): void => {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // El recorrido total del elemento a través del viewport es la suma
      // del alto del viewport más el alto del elemento. El progreso mide
      // cuánto de ese recorrido ya transcurrió: 0 cuando el borde inferior
      // del elemento coincide con el borde inferior del viewport (empieza
      // a asomar) y 1 cuando el borde superior coincide con el borde
      // superior del viewport (termina de salir).
      const rawProgress = (viewportHeight - rect.top) / (viewportHeight + rect.height);
      const progress = Math.max(0, Math.min(1, rawProgress));

      element.style.setProperty(SCROLL_PROGRESS_PROPERTY, String(progress));
    };

    // Calcula progreso inmediatamente al montar, para que un elemento
    // parcialmente visible desde el inicio muestre el valor correcto
    // sin esperar el primer scroll.
    computeProgress();

    const handleScroll = (): void => {
      // Si ya hay un frame pendiente no agendamos otro — el que está en
      // cola leerá el estado más reciente de scroll cuando se ejecute.
      if (rafHandleRef.current !== null) {
        return;
      }

      rafHandleRef.current = requestAnimationFrame(() => {
        rafHandleRef.current = null;
        computeProgress();
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // --- scroll-visible y scroll-visible-ratio: IntersectionObserver ---

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }

        element.style.setProperty(SCROLL_VISIBLE_PROPERTY, entry.isIntersecting ? "1" : "0");
        element.style.setProperty(SCROLL_VISIBLE_RATIO_PROPERTY, String(entry.intersectionRatio));
      },
      { threshold },
    );

    observer.observe(element);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();

      if (rafHandleRef.current !== null) {
        cancelAnimationFrame(rafHandleRef.current);
        rafHandleRef.current = null;
      }
    };
  }, [threshold]);

  return elementRef;
}
