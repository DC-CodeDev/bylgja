import { useContext, useEffect, useRef } from "react";
import { SmoothScrollContext } from "./SmoothScrollProvider.js";
const SCROLL_VISIBLE_PROPERTY = "--scroll-visible";
const SCROLL_VISIBLE_RATIO_PROPERTY = "--scroll-visible-ratio";
const SCROLL_PROGRESS_PROPERTY = "--scroll-progress";
const DEFAULT_THRESHOLD = 0.1;
function computeScrollProgress(element) {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    // El recorrido total del elemento a través del viewport es la suma
    // del alto del viewport más el alto del elemento. El progreso mide
    // cuánto de ese recorrido ya transcurrió: 0 cuando el borde inferior
    // del elemento coincide con el borde inferior del viewport (empieza
    // a asomar) y 1 cuando el borde superior coincide con el borde
    // superior del viewport (termina de salir).
    const rawProgress = (viewportHeight - rect.top) / (viewportHeight + rect.height);
    element.style.setProperty(SCROLL_PROGRESS_PROPERTY, String(Math.max(0, Math.min(1, rawProgress))));
}
export function useScrollProgress(options) {
    const elementRef = useRef(null);
    const rafHandleRef = useRef(null);
    const threshold = options?.threshold ?? DEFAULT_THRESHOLD;
    const { scrollProgress, isProvided: hasProvider } = useContext(SmoothScrollContext);
    // Cálculo inicial + listener de scroll nativo.
    // Cuando hay SmoothScrollProvider en el árbol, el listener no se registra:
    // el efecto de context (abajo) se encarga de disparar el recálculo.
    useEffect(() => {
        const element = elementRef.current;
        if (!element)
            return;
        computeScrollProgress(element);
        if (hasProvider)
            return;
        const handleScroll = () => {
            if (rafHandleRef.current !== null)
                return;
            rafHandleRef.current = requestAnimationFrame(() => {
                rafHandleRef.current = null;
                computeScrollProgress(element);
            });
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (rafHandleRef.current !== null) {
                cancelAnimationFrame(rafHandleRef.current);
                rafHandleRef.current = null;
            }
        };
    }, [threshold, hasProvider]);
    // Cuando hay SmoothScrollProvider, scrollProgress cambia en cada frame
    // animado. Ese cambio es la señal para recalcular --scroll-progress con
    // getBoundingClientRect(), que en ese momento ya refleja el transform
    // aplicado por el provider. El resultado es un valor por-elemento distinto
    // al scrollProgress de página que dispara este efecto.
    useEffect(() => {
        if (!hasProvider)
            return;
        const element = elementRef.current;
        if (!element)
            return;
        computeScrollProgress(element);
    }, [scrollProgress, hasProvider]);
    // IntersectionObserver para --scroll-visible y --scroll-visible-ratio.
    // Sin cambios respecto al comportamiento original.
    useEffect(() => {
        const element = elementRef.current;
        if (!element)
            return;
        const observer = new IntersectionObserver((entries) => {
            const entry = entries[0];
            if (!entry)
                return;
            element.style.setProperty(SCROLL_VISIBLE_PROPERTY, entry.isIntersecting ? "1" : "0");
            element.style.setProperty(SCROLL_VISIBLE_RATIO_PROPERTY, String(entry.intersectionRatio));
        }, { threshold });
        observer.observe(element);
        return () => {
            observer.disconnect();
        };
    }, [threshold]);
    return elementRef;
}
//# sourceMappingURL=useScrollProgress.js.map