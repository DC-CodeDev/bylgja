# Build y Packaging

## Build actual

El script de build es:

```json
"build": "tsc -p tsconfig.build.json && npm run copy:variant-css"
```

### Fase TypeScript

`tsconfig.build.json`:

- extiende `tsconfig.json`
- emite JavaScript ESM, no bundle
- `outDir: "dist"`
- `rootDir: "src"`
- `declaration: true`
- `declarationMap: true`
- `sourceMap: true`
- excluye:
  - `src/**/*.test.ts`
  - `src/**/*.test.tsx`
  - `src/test/**`

La compilación preserva módulos por archivo. No hay bundler en la build principal del paquete.

## Copia de CSS

`scripts/copy-variant-css.mjs` copia `.css` desde dos carpetas fuente:

- `src/variants/` hacia `dist/variants/`
- `src/tokens/` hacia `dist/tokens/`

Esto es importante porque el paquete no empaqueta CSS dentro del JS. El build JS/TS y el build CSS son dos pasos separados:

- `tsc` emite los módulos ESM y `.d.ts`
- `copy-variant-css.mjs` replica los assets CSS necesarios para consumo final

El cambio reciente visible en el diff local extiende el script para cubrir también `src/tokens/`, necesario desde que `fade.css` importa `../tokens/timing.css`.

## `exports` actuales

`package.json` expone:

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js"
  },
  "./variants/*.css": "./dist/variants/*.css",
  "./variants/tooltip.css": "./dist/variants/tooltip.css",
  "./package.json": "./package.json"
}
```

Consecuencias:

- el entrypoint JS público es `bylgja`
- el CSS de variants se consume por subpath, por ejemplo:
  - `bylgja/variants/fade.css`
  - `bylgja/variants/tooltip.css`
- `timing.css` no se exporta como subpath para consumo directo; se distribuye porque es dependencia interna del CSS del paquete

## `sideEffects` y tree shaking

`package.json` declara:

```json
"sideEffects": [
  "**/*.css"
]
```

Esto le dice al bundler del consumidor que:

- el JS ESM puede tree-shakearse normalmente;
- los imports de CSS no deben eliminarse como si fueran puros.

La verificación práctica local está en `tree-shake-check/`. El script `tree-shake-check/run-check.mjs` construye:

- un bundle mínimo con `pressable` solamente
- un bundle con todos los exports

Resultado ejecutado el 19 de julio de 2026:

- `pressable-only minified bytes: 6357`
- `all-exports minified bytes: 14727`
- diferencia: `8370`
- búsqueda textual en el bundle mínimo:
  - `ModalPanel`: no aparece
  - `ModalBackdrop`: no aparece
  - `SelectedHighlight`: no aparece
  - `Tooltip`: no aparece

Resultado: el tree shaking del JS del paquete dio positivo en el chequeo local disponible.

## Smoke test de package

`scripts/verify-package.mjs` verifica después del build:

- que `Tooltip` y `useTooltip` existan como runtime exports;
- que `bylgja/variants/tooltip.css` resuelva correctamente;
- que `dist/index.d.ts` contenga tipos clave del tooltip.
