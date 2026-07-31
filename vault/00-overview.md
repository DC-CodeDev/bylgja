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

## Índice del vault

- [00-overview](00-overview.md) — descripción general, mapa de `src` y API pública auditada
- [01-core](01-core.md) — spring solver y raf driver
- [02-react-bindings](02-react-bindings.md) — hooks y componentes React
- [03-tokens](03-tokens.md) — presets físicos y tokens CSS
- [04-variants](04-variants.md) — variants listos para consumir
- [05-build-and-packaging](05-build-and-packaging.md) — pipeline de build, exports y packaging
- [06-decisiones-y-sesiones](06-decisiones-y-sesiones.md) — registro de sesiones y decisiones de diseño
- [07-pendientes](07-pendientes.md) — backlog y trabajo pendiente
- [08-loops](08-loops.md) — pilar de loops y oscilación
- [09-layout-flip](09-layout-flip.md) — técnica FLIP para transiciones de layout
- [10-shared-element](10-shared-element.md) — shared element transitions
- [11-funciones-generales](11-funciones-generales.md) — utilidades y funciones transversales
- [12-incidentes-y-lecciones](12-incidentes-y-lecciones.md) — post-mortems y reglas operativas derivadas
