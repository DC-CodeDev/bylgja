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

