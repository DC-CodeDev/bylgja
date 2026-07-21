# Bylgja

Bylgja es una librería de motion primitives para React, escrita en TypeScript, basada en springs físicos deterministas y sin dependencias externas de animación. En la Yggdrasil Suite cumple el rol de capa compartida de motion para componentes y pantallas; como paquete más general, expone un core de física, bindings de React y variants listos para consumir vía CSS explícito.

## Mapa de `src`

- `src/core/`
  - `spring-solver.ts`: solver 1D de resorte con masa, rigidez, damping, timestep fijo y criterio de settling.
  - `raf-driver.ts`: driver basado en `requestAnimationFrame` que avanza el solver y emite snapshots.
- `src/react/`
  - `useSpring.ts`: hook que conecta un spring a un elemento DOM escribiendo `--spring-progress`.
  - `Presence.tsx`: wrapper que retrasa el unmount hasta terminar la salida.
- `src/tokens/`
  - `springs.ts`: presets físicos `SPRING_GENTLE` y `SPRING_SNAPPY`.
  - `timing.css`: tokens CSS para duraciones y easing de animaciones CSS puras.
- `src/variants/`
  - `fade.ts`
  - `fadeScale.ts`
  - `modalBackdrop.ts`
  - `modalPanel.ts`
  - `pressable.ts`
  - `selectedHighlight.ts`
  - `tooltip.tsx`
  - Cada variant tiene su CSS asociado en la misma carpeta.
- `src/a11y/`
  - `reducedMotion.ts`: lectura de `prefers-reduced-motion` y hook React asociado.
- `src/test/`
  - `manualRafScheduler.ts`: scheduler determinista para tests.
  - `integration/`: tests de composición entre módulos.
- `src/index.ts`
  - Barrel público actual del paquete.

## API pública auditada

`src/index.ts` exporta hoy:

- Core: `createRafSpringDriver`, `SpringSolver`, `createSpringSolver`
- Tipos core: `SpringSnapshot`, `SpringSolverConfig`
- Tokens: `SPRING_GENTLE`, `SPRING_SNAPPY`
- React: `Presence`, `useSpring`
- Variants: `useFade`, `useFadeScale`, `useModalBackdrop`, `useModalPanel`, `usePressable`, `useSelectedHighlight`, `useTooltip`, `Tooltip`
- Tooltip: `TOOLTIP_CLASS_NAME` y sus tipos públicos
- A11y: `getReducedMotionPreference`, `useReducedMotion`

No existe export público actual de `FADE_QUICK`.
