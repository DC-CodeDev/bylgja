# Bylgja

Bylgja es una libreria de animacion en TypeScript para React, basada en springs fisicos y sin dependencias externas de motion. `bylgja` significa "ola" en nordico antiguo.

Bylgja existe para cubrir animaciones de interfaz con una base pequena y verificable: integra una ecuacion de spring real en vez de aproximar el movimiento con `cubic-bezier`, no depende de Framer Motion ni de librerias similares, y conecta esa fisica con el ciclo de vida de React mediante efectos con limpieza explicita. El codigo esta preparado para `StrictMode`, evita dejar drivers activos despues del desmontaje y centraliza las animaciones de salida en `Presence`, donde React todavia puede posponer el unmount.

## Instalacion

El paquete actual esta configurado para consumo por git URL o tag. `package.json` tiene `"private": true` y no declara una publicacion de npm registry.

```bash
npm install git+https://github.com/DC-CodeDev/bylgja.git#main
```

El proyecto todavia no tiene tags de version publicados; `main` es la referencia estable actual. Cuando existan tags, tambien puede instalarse desde un tag o commit especifico:

```bash
npm install git+https://github.com/DC-CodeDev/bylgja.git#<tag-o-commit>
```

La distribucion usa ESM y tipos generados en `dist/`. El script `prepare` ejecuta `npm run build` al instalar desde git con npm.

## Inicio Rapido

### `useSpring`

`useSpring` devuelve un `ref`. El hook escribe el progreso numerico en la custom property `--spring-progress` del elemento asociado.

```tsx
import { useState } from "react";
import { SPRING_GENTLE, useSpring } from "bylgja";

export function MovingDot() {
  const [active, setActive] = useState(false);
  const ref = useSpring<HTMLDivElement>(active ? 1 : 0, SPRING_GENTLE, 0);

  return (
    <button type="button" onClick={() => setActive((value) => !value)}>
      <span ref={ref} className="dot" />
    </button>
  );
}
```

```css
.dot {
  display: block;
  inline-size: 16px;
  block-size: 16px;
  border-radius: 999px;
  background: currentColor;
  transform: translateX(calc(var(--spring-progress, 0) * 160px));
}
```

### `Presence`

`Presence` mantiene renderizado un wrapper `div` mientras la animacion de salida llega a su target. El wrapper recibe la misma custom property `--spring-progress`.

```tsx
import { useState } from "react";
import { Presence, SPRING_GENTLE } from "bylgja";

export function Notice() {
  const [show, setShow] = useState(true);

  return (
    <>
      <button type="button" onClick={() => setShow((value) => !value)}>
        Toggle
      </button>

      <Presence show={show} exitConfig={SPRING_GENTLE} className="notice">
        Saved changes
      </Presence>
    </>
  );
}
```

```css
.notice {
  opacity: var(--spring-progress, 0);
  transform: translateY(calc((1 - var(--spring-progress, 0)) * 8px));
}
```

## Que Incluye

| Pieza | Export principal | Que resuelve |
| --- | --- | --- |
| Core de fisica | `SpringSolver`, `createSpringSolver` | Integra un spring 1D con masa, rigidez, damping, timestep fijo y umbrales de settling. |
| Driver RAF | `createRafSpringDriver` | Avanza el solver con `requestAnimationFrame`, clampa `deltaTime` y permite suscribirse a snapshots. |
| React spring | `useSpring` | Conecta un spring a un elemento React escribiendo `--spring-progress`. |
| Presence | `Presence` | Coordina entrada/salida y retrasa el unmount hasta que la animacion de salida termina. |
| Fade | `useFade` | Fade con estrategia `presence` o tween CSS simple. |
| Fade scale | `useFadeScale` | Opacidad y escala coordinadas con `Presence`. |
| Modal backdrop | `useModalBackdrop` | Backdrop fijo con opacidad controlada por spring. |
| Modal panel | `useModalPanel` | Panel con opacidad, desplazamiento y escala. |
| Pressable | `usePressable` | Interaccion de presionado con handlers de mouse/pointer y spring. |
| Selected highlight | `useSelectedHighlight` | Highlight de seleccion controlado por `selected`. |
| Reduced motion | `getReducedMotionPreference`, `useReducedMotion` | Lectura de `prefers-reduced-motion` desde el navegador. |

Los tokens incluidos son `SPRING_GENTLE`, `SPRING_SNAPPY` y `FADE_QUICK`.

## Reduced Motion y Accesibilidad

Bylgja respeta `prefers-reduced-motion`. Cuando esa preferencia esta activa, `useSpring` no acorta una duracion: salta directamente al `targetValue`, escribe el estado final en `--spring-progress` y agenda `onSettled` en una microtarea. `useReducedMotion` tambien esta disponible para leer la preferencia desde componentes React.

## CSS de Variants

Los hooks de variants devuelven clases y props, pero no inyectan CSS. Para que esas clases tengan efecto visual, el consumidor debe importar explicitamente los archivos CSS expuestos por subpath:

```ts
import "bylgja/variants/fade.css";
import "bylgja/variants/fadeScale.css";
import "bylgja/variants/modalBackdrop.css";
import "bylgja/variants/modalPanel.css";
import "bylgja/variants/pressable.css";
import "bylgja/variants/selectedHighlight.css";
```

Esos subpaths estan declarados en `package.json` como `./variants/*.css` y apuntan a `src/variants/*.css`.

## API Publica

El entrypoint publico es `bylgja`:

```ts
import {
  Presence,
  SPRING_GENTLE,
  SPRING_SNAPPY,
  createRafSpringDriver,
  createSpringSolver,
  getReducedMotionPreference,
  useFade,
  useFadeScale,
  useModalBackdrop,
  useModalPanel,
  usePressable,
  useReducedMotion,
  useSelectedHighlight,
  useSpring,
} from "bylgja";
```

Los tipos publicos exportados incluyen `SpringSolverConfig`, `SpringSnapshot`, `FadeBinding`, `FadeState`, `FadeStrategy`, `UseFadeOptions`, `FadeScaleBinding`, `UseFadeScaleOptions`, `ModalBackdropBinding`, `UseModalBackdropOptions`, `ModalPanelBinding`, `UseModalPanelOptions`, `PressableBinding`, `UsePressableOptions`, `SelectedHighlightBinding` y `UseSelectedHighlightOptions`.

## Distribucion

Bylgja compila `src/` a `dist/` con JavaScript ESM, sourcemaps y declaraciones `.d.ts`.

```bash
npm run build
```

Esta estrategia evita exigir que las apps consumidoras transpilen TypeScript desde dependencias instaladas por git. Antes de consumir un tag o commit desde otra app, ese estado del paquete debe poder generar `dist/`; con npm, `prepare` ejecuta el build durante la instalacion desde git.

## Limitaciones Conocidas

- `useSpring` evalua `prefers-reduced-motion` cuando crea el driver y cuando cambia `targetValue`. Si la preferencia del sistema cambia en medio de una animacion ya en curso sin cambio de target ni recreacion del driver, esa animacion actual no se interrumpe a mitad de trayecto; el nuevo valor aplica en la proxima recreacion o cambio de target.
- La prueba de consistencia del timestep fijo en `spring-solver` usa deltas que son fracciones exactas en punto flotante. Verifica determinismo para esas secuencias concretas, no una garantia universal para cualquier combinacion arbitraria de deltas.
- `useSpring` escribe una unica variable CSS fija por elemento: `--spring-progress`. No soporta multiples springs simultaneos sobre el mismo elemento con nombres de variable distintos.
- `useReducedMotion` no acepta override manual. Lee automaticamente `prefers-reduced-motion` desde el sistema operativo o el navegador.
- Los archivos CSS de cada variant deben importarse explicitamente para que las clases tengan efecto visual. Importar el hook TypeScript no aplica estilos por si solo.
- Las animaciones de salida se resuelven con `Presence`. No hay un hook publico separado para exit animations, porque un hook por si solo no puede posponer un desmontaje que ya decidio el componente padre.

## Desarrollo Local

```bash
git clone <repo-url>
cd bylgja
npm install
```

Comandos principales:

```bash
npm run build
npm run typecheck
npm run test
npm run demo:dev
npm run demo:build
```

El demo de Vite vive en `demo/` y usa el entrypoint publico `bylgja`, por lo que tambien funciona como prueba de humo de la distribucion local. Para probar reduced motion, activa `prefers-reduced-motion` desde DevTools o desde la configuracion de accesibilidad del sistema operativo y vuelve a interactuar con el demo.

Convenciones de testing del proyecto:

- Los tests verifican comportamiento observable real, no solo ausencia de errores.
- Para logica numerica o de estado, se prueban entradas, salidas y convergencia.
- Para hooks de React, se prueba ciclo de vida con Testing Library y React.
- Para variants con CSS, se verifica la clase, las custom properties y el comportamiento visible en DOM.
- Hay cobertura para los seis variants y una prueba de composicion anidada con `StrictMode`.

## Dependencias

- No incluye `framer-motion`.
- No incluye otra dependencia externa de animacion.
- `react` es `peerDependency`.
- `typescript`, `vite`, `@vitejs/plugin-react`, `vitest`, `jsdom` y Testing Library son `devDependencies`.

## Licencia

Pendiente de definir. El `package.json` actual declara `"license": "UNLICENSED"` y no hay un archivo de licencia explicito en el repo.
