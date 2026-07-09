# bylgja

`bylgja` es la librería de motion de la Yggdrasil Suite.

Está pensada para reemplazar el sistema de animación basado en Framer Motion con una base propia en TypeScript puro, más bindings de React. La distribución está pensada para consumo directo vía git URL o tag, no como parte de un monorepo.

## Instalación

Instalación desde git:

```bash
npm install git+https://github.com/<org>/bylgja.git#v0.1.0
```

También puede consumirse por tag:

```bash
npm install git+https://github.com/<org>/bylgja.git#<tag>
```

## Estado actual

Fase 1:

- Implementado y testeado:
  - `src/core/spring-solver.ts`
  - `src/core/raf-driver.ts`
  - `src/tokens/springs.ts`
  - `src/tokens/tweens.ts`
  - validación de parámetros físicos y clamp de `deltaTime` en el driver

Fase 2:

- Implementado y testeado:
  - `src/react/useSpring.ts`
  - `src/react/Presence.tsx`
  - `src/variants/fade.ts` y `src/variants/fade.css`
  - `src/variants/fadeScale.ts` y `src/variants/fadeScale.css`
  - `src/variants/modalBackdrop.ts` y `src/variants/modalBackdrop.css`
  - `src/variants/modalPanel.ts` y `src/variants/modalPanel.css`
  - `src/variants/pressable.ts` y `src/variants/pressable.css`
  - `src/variants/selectedHighlight.ts` y `src/variants/selectedHighlight.css`
  - `src/a11y/reducedMotion.ts`

## Roadmap original

- Completo y testeado:
  - core (`spring-solver`, `raf-driver`)
  - React (`useSpring`, `Presence`)
  - variants (`fade`, `fadeScale`, `modalBackdrop`, `modalPanel`, `pressable`, `selectedHighlight`)
  - a11y (`reducedMotion`)

Las animaciones de salida se resuelven exclusivamente con el componente `Presence`. No hay hook público separado para exit animations: un hook por sí solo no puede posponer un desmontaje que ya decidió el componente padre.

## Distribución

`bylgja` usa build a `dist/` con JavaScript ESM y archivos `.d.ts`. Esta estrategia se eligió sobre exportar TypeScript fuente directamente porque el paquete se instala vía git URL o tag y debe poder resolverse desde apps consumidoras sin exigir configuración especial del bundler para transpilar dependencias.

Antes de consumir un tag o commit desde otra app, el paquete debe tener generado `dist/`. El script `prepare` ejecuta el build al instalar desde git con npm, y también se puede correr manualmente:

```bash
npm run build
```

Importación desde una app consumidora:

```ts
import { Presence, useSpring } from "bylgja";
```

Los estilos de variants se importan como subpaths públicos del paquete:

```ts
import "bylgja/variants/fade.css";
import "bylgja/variants/pressable.css";
```

## Limitaciones conocidas

- `useSpring` evalúa `prefers-reduced-motion` cuando crea el driver y cuando cambia `targetValue`. Si la preferencia del sistema cambia en medio de una animación ya en curso sin cambio de target ni recreación del driver, esa animación actual no se interrumpe a mitad de trayecto; el nuevo valor sí aplica en la próxima recreación o cambio de target.
- La prueba de consistencia del timestep fijo en `spring-solver` usa deltas que son fracciones exactas en punto flotante. Verifica determinismo para esas secuencias concretas, no una garantía universal para cualquier combinación arbitraria de deltas.
- `useSpring` escribe una única variable CSS fija por elemento: `--spring-progress`. No soporta múltiples springs simultáneos sobre el mismo elemento con nombres de variable distintos.
- `useReducedMotion` no acepta override manual. Lee automáticamente `prefers-reduced-motion` desde el sistema operativo o el navegador.
- Los archivos CSS de cada variant deben importarse explícitamente para que las clases tengan efecto visual. Importar el hook TypeScript no aplica estilos por sí solo.

## Auditoría transversal

Los hallazgos reales de la auditoría transversal inicial están resueltos:

- El hook stub de exit animations fue eliminado de la API pública; las exit animations se resuelven con `Presence`.
- El paquete expone un entrypoint real en `dist/` con JavaScript ESM y tipos `.d.ts`.
- El core rechaza valores `NaN` e `Infinity` en los puntos de entrada numéricos públicos.
- Los seis variants usan `springConfig` como nombre común para configurar `SpringSolverConfig`.
- Los tipos públicos de opciones y bindings de variants se exportan desde `bylgja`.
- La cobertura de variants incluye una matriz mínima común y hay un test de composición anidada con StrictMode.

## Dependencias

Auditoría de fase 1:

- No se incluye `framer-motion`
- No se incluyen otras dependencias de animación externa
- `react` queda como `peerDependency`
- `typescript` queda como `devDependency`
- `vite` y `@vitejs/plugin-react` son `devDependencies` usadas solo para el demo visual local; no forman parte de la librería publicada.

## Demo visual local

El repo incluye una mini app Vite en `demo/` para probar las animaciones reales en navegador. El demo importa `bylgja` desde el punto de entrada público del paquete, así que también funciona como prueba de humo de la distribución local.

```bash
npm run demo:dev
```

Para generar el build estático del demo:

```bash
npm run demo:build
```

Para probar reduced motion, activá `prefers-reduced-motion` desde DevTools o desde la configuración de accesibilidad del sistema operativo y volvé a interactuar con las secciones.

## Convenciones de Testing

- Cada fase nueva debe incluir sus propios tests en la misma entrega.
- Los tests deben verificar comportamiento observable real, no solo ausencia de errores.
- Para lógica numérica o de estado, se prueban entradas, salidas y convergencia.
- Para hooks de React, se probará ciclo de vida con una librería de testing de React.
- Para variants con CSS, se verificará la clase, las custom properties y el comportamiento visible en DOM.
