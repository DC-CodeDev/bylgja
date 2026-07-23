# React Bindings

## `useSpring`

### Firma real actual

```ts
export function useSpring<T extends HTMLElement = HTMLElement>(
  targetValue: number,
  config: UseSpringConfig,
  initialValue?: number,
  onSettled?: () => void,
): MutableRefObject<T | null>
```

`UseSpringConfig` es alias directo de `SpringSolverConfig`.

### Qué hace

- Devuelve un `ref` mutable para asociarlo a un elemento DOM.
- Crea un `RafSpringDriver` con `createRafSpringDriver`.
- Escribe progreso en la custom property `--spring-progress`.
- Reacciona a cambios de `targetValue` sin recrear el driver.
- Recrea el driver cuando cambian parámetros físicos del config.

### Mecanismo real de `--spring-progress`

- El nombre está hardcodeado como `const SPRING_PROGRESS_PROPERTY = "--spring-progress"`.
- En montaje escribe `initialValue ?? 0`.
- Durante animación escribe `snapshot.value`.
- Cuando el spring se asienta, escribe `snapshot.target`, no `snapshot.value`.

Ese último punto está explicado en comentario dentro del archivo: el solver puede asentarse dentro de `positionThreshold` y quedar, por ejemplo, en `0.9992` en vez de `1`. Si CSS consume `opacity: var(--spring-progress)`, ese residuo deja el elemento ligeramente translúcido. El hook corrige eso haciendo snap al target exacto al settle.

### Reduced motion

Si `getReducedMotionPreference()` da `true`:

- no crea driver;
- escribe el target final de inmediato en `--spring-progress`;
- agenda `onSettled` con `queueMicrotask`;
- usa `reducedMotionNotificationTokenRef` para invalidar callbacks viejos.

### Dependencias reales

- El efecto de creación del driver depende de `configKey`, un string armado con:
  - `stiffness`
  - `damping`
  - `mass`
  - `timestep ?? ""`
  - `velocityThreshold ?? ""`
  - `positionThreshold ?? ""`
- El efecto de retargeting depende solo de `targetValue`.
- `onSettled` se guarda en `onSettledRef`, no fuerza recreación del driver.

## `Presence`

### Firma real actual

```ts
export interface PresenceProps extends HTMLAttributes<HTMLDivElement> {
  "data-state"?: string | undefined;
  show: boolean;
  exitConfig: SpringSolverConfig;
  exitTarget?: number;
  onSettled?: (() => void) | undefined;
}
```

```ts
export function Presence({
  children,
  show,
  exitConfig,
  exitTarget = 0,
  onSettled,
  ...divProps
}: PresenceProps)
```

### Qué hace

- Mantiene el wrapper montado mientras la salida sigue en curso.
- Si `show` pasa a `true`, restaura presencia y reinicializa `initialValue`.
- Si `show` pasa a `false`, deja correr la salida y desmonta recién al `onSettled`.

### Implementación relevante

- `ENTRY_TARGET = 1`
- Estado interno:
  - `isPresent`
  - `initialValue`
  - `showRef`
- Usa un componente interno `PresenceBody` que llama:

```ts
useSpring<HTMLDivElement>(
  show ? ENTRY_TARGET : targetValue,
  springConfig,
  initialValue,
  onSettled,
)
```

### Decisión de diseño documentada en comentario

El archivo explica explícitamente por qué siempre renderiza un wrapper `div`: necesita un nodo DOM estable que sea dueño de `--spring-progress`, para que los variants CSS lean esa custom property de forma consistente.

## `usePointerTracker`

### Firma real actual

```ts
export interface PointerPosition {
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
  isInside: boolean;
}

export interface UsePointerTrackerOptions {
  onMove?: (position: PointerPosition) => void;
}

export function usePointerTracker<T extends HTMLElement = HTMLElement>(
  options?: UsePointerTrackerOptions,
): MutableRefObject<T | null>
```

### Qué hace

- Devuelve un `ref` mutable para asociarlo a un elemento DOM.
- Escucha `pointerenter`, `pointermove`, `pointerleave` y un `ResizeObserver`.
- Escribe posición en custom properties CSS sobre el elemento:
  - `--pointer-x`, `--pointer-y` (píxeles relativos al borde superior izquierdo)
  - `--pointer-normalized-x`, `--pointer-normalized-y` (0–1 relativos al ancho/alto)
  - `--pointer-inside` (`1` mientras el cursor está dentro, `0` al salir)
- Sin re-renders de React — el movimiento se escribe directo en `element.style`.
- Cachea `getBoundingClientRect` en `pointerenter` y lo reusa en cada `pointermove`. El `ResizeObserver` actualiza la caché cuando cambia el tamaño del elemento mientras el cursor sigue encima.
- Soporta un callback opcional `onMove` que recibe `PointerPosition` en cada evento (incluyendo en `pointerleave` con el último `x`/`y`/`normalizedX`/`normalizedY` conocido y `isInside: false`).
- Sin capa `core/` separada: el tracking de puntero es inherentemente DOM, no existe una versión útil de esto separada de eventos reales del navegador.

### Mecanismo de `--pointer-inside` y valores de posición

- `pointerenter`: mide el rect, lo guarda en `rectRef`, escribe `pointer-inside = 1`.
- `pointermove`: calcula posición contra `rectRef` cacheado (sin remedir), escribe las 4 custom properties de posición, llama `onMove` si existe, guarda el último `PointerPosition` en `lastPositionRef`.
- `pointerleave`: escribe `pointer-inside = 0`. No toca los valores de posición — quedan en su último valor real conocido. Si existe `onMove`, lo llama con el último `PointerPosition` de `lastPositionRef` (o `x: 0, y: 0, normalizedX: 0, normalizedY: 0` si nunca hubo un `pointermove`).
- `ResizeObserver`: actualiza `rectRef` cuando el elemento cambia de tamaño, sin esperar a un nuevo `pointerenter`.

### Dependencias reales

- El `useEffect` se ejecuta una sola vez (dependencia `[]`). Las opciones se leen desde `optionsRef` para no recrear listeners.

## `useScrollProgress`

### Firma real actual

```ts
export interface UseScrollProgressOptions {
  threshold?: number;
}

export function useScrollProgress<T extends HTMLElement = HTMLElement>(
  options?: UseScrollProgressOptions,
): MutableRefObject<T | null>
```

### Qué hace

- Devuelve un `ref` mutable para asociarlo a un elemento DOM.
- Expone tres custom properties CSS sobre el elemento:
  - `--scroll-visible`: `1` si el elemento intersecta el viewport según el threshold configurado, `0` en caso contrario.
  - `--scroll-visible-ratio`: valor crudo de `entry.intersectionRatio` del `IntersectionObserver`, entre 0 y 1.
  - `--scroll-progress`: 0 cuando el borde inferior del elemento coincide con el borde inferior del viewport (empieza a asomar), 1 cuando el borde superior del elemento coincide con el borde superior del viewport (terminó de salir). Siempre clampeado entre 0 y 1.
- Sin re-renders de React — todos los valores se escriben directo en `element.style`.
- `IntersectionObserver` para `scroll-visible` y `scroll-visible-ratio` (con el `threshold` configurado, default 0.1).
- Cálculo de `scroll-progress` vía `requestAnimationFrame` desde eventos de `scroll` de window, con una bandera que evita agendar más de un frame por vez. El cálculo también se ejecuta inmediatamente al montar el hook, sin esperar el primer evento de scroll.
- Listener de scroll con `{ passive: true }` para no interferir con el rendimiento del scroll del navegador.

### Fórmula de `scroll-progress`

```
rawProgress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height)
progress = Math.max(0, Math.min(1, rawProgress))
```

El denominador (`window.innerHeight + rect.height`) es el recorrido total del elemento a través del viewport. El clamps garantiza que ningún consumidor reciba valores fuera de rango en posiciones extremas.

### Dependencias reales

- El `useEffect` se ejecuta cuando `threshold` cambia (dependencia `[threshold]`).
- Sin referencias a opciones externas mutables dentro del efecto — todo lo necesario se captura en el closure o se lee del DOM en el momento del cálculo.

## `useDraggable`

### Ubicación y composición

- Vive en `src/react/useDraggable.ts`.
- Compone `usePressable` puertas adentro, sin modificar `pressable.ts`.
- Mantiene encapsulada dentro del mismo archivo la utilidad de velocidad y el buffer circular de muestras; no existe hoy una extracción a `core/`.

### Firma real actual

```ts
export interface DragVelocity {
  x: number;
  y: number;
}

export interface DragPosition {
  x: number;
  y: number;
}

export type DraggableBehavior = "return" | "settle";

export interface UseDraggableOptions {
  behavior: DraggableBehavior;
  className?: string;
  pressableSpringConfig?: SpringSolverConfig;
  springConfig?: SpringSolverConfig;
}

export interface DraggableBinding<T extends HTMLElement = HTMLElement> {
  className: string;
  isDragging: boolean;
  onMouseDown: MouseEventHandler<T>;
  onMouseUp: MouseEventHandler<T>;
  onPointerCancel: PointerEventHandler<T>;
  onPointerDown: PointerEventHandler<T>;
  onPointerUp: PointerEventHandler<T>;
  position: DragPosition;
  ref: MutableRefObject<T | null>;
  releaseVelocity: DragVelocity;
}

export function useDraggable<T extends HTMLElement = HTMLElement>(
  options: UseDraggableOptions,
): DraggableBinding<T>
```

### Qué hace

- Mientras el drag está activo, escucha `pointermove` global y guarda las últimas 4 muestras `{ x, y, timestamp }` en un buffer circular interno.
- Al soltar, calcula la velocidad de salida usando la muestra más vieja y la más nueva del buffer. Si hay menos de 2 muestras, devuelve velocidad cero en ambos ejes.
- Expone dos modos configurables:
  - `return`: rubber band, vuelve al origen al soltar.
  - `settle`: se asienta en la posición donde fue soltado.
- Maneja ambos ejes en paralelo usando dos instancias independientes de `createRafSpringDriver`, una para `x` y otra para `y`.

### Decisión explícita vigente

- La utilidad de velocidad se mantiene encapsulada en `useDraggable.ts` y no se extrae a `core` hasta que aparezca un segundo consumidor real, por ejemplo si más adelante los pilares de puntero o scroll necesitan cálculo de velocidad compartido.

## `SvgStrokePresence`

### Ubicación y composición

- Vive en `src/react/SvgStrokePresence.tsx`.
- Usa `Presence` puertas adentro sin modificarlo.
- `Presence` siempre intercala un wrapper `div`, así que `SvgStrokePresence` no envuelve directamente un nodo SVG; el `path` SVG vive adentro de ese wrapper y consume `--spring-progress` desde ahí.

### Firma real actual

```ts
export type SvgStrokeDirection = "draw" | "undraw";

export interface SvgStrokePresenceProps {
  children?: ReactNode;
  direction: SvgStrokeDirection;
  path?: string;
  pathClassName?: string;
  pathLength?: number;
  pathProps?: SVGProps<SVGPathElement>;
  show: boolean;
  springConfig?: SpringSolverConfig;
  svgClassName?: string;
  svgLabel?: string;
  svgProps?: SVGProps<SVGSVGElement>;
  viewBox: string;
  wrapperClassName?: string;
}

export function SvgStrokePresence(
  props: SvgStrokePresenceProps,
): JSX.Element
```

### Qué hace

- Es agnóstico al trigger: solo reacciona a la prop `show`, igual que `Presence`.
- No sabe nada de scroll, hover ni mount; esa decisión queda del lado del consumidor.
- Cubre `Draw Path`, `Undraw` y `Stroke Reveal`.
- `Stroke Reveal` quedó modelado como alias de `direction="draw"`, no como variante separada.

### Dirección y fórmula compartida

- `draw` y `undraw` comparten una única fórmula de `stroke-dashoffset` en CSS.
- La diferencia se resuelve por una custom property de signo (`--svg-stroke-direction-sign`), evitando lógica duplicada.

### Fuera de alcance

- `Trim Path` queda explícitamente fuera de este componente y pendiente para una sesión futura aparte.
- Motivo: no es un cambio de signo del mismo modelo, sino una lógica distinta de recorte sobre una porción intermedia del trazo.
