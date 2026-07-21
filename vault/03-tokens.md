# Tokens

## `src/tokens/springs.ts`

Contenido actual:

```ts
export const SPRING_GENTLE = {
  stiffness: 200,
  damping: 28,
  mass: 1,
} as const;

export const SPRING_SNAPPY = {
  stiffness: 400,
  damping: 30,
  mass: 0.8,
} as const;
```

Son los únicos presets físicos exportados hoy desde `src/index.ts`.

## `src/tokens/timing.css`

Contenido actual:

```css
:root {
  /*
   * Central timing values for pure CSS animations.
   * Any current or future variant/pillar that uses CSS transitions instead of
   * the spring solver should read from here rather than inventing its own values.
   */
  --bylgja-duration-quick: 150ms;
  --bylgja-ease-out: ease-out;
}
```

### Rol actual

- Es la fuente de verdad para timings de animaciones CSS puras.
- Hoy `src/variants/fade.css` la importa con `@import "../tokens/timing.css";`.
- El token `--bylgja-duration-quick` reemplaza el valor duro `150ms` del fade tween.
- `--bylgja-ease-out` centraliza el easing CSS correspondiente.

## Estado de `FADE_QUICK` y `tokens/tweens.ts`

En el árbol de trabajo auditado el 19 de julio de 2026:

- `src/tokens/tweens.ts` fue eliminado.
- `src/index.ts` ya no exporta `FADE_QUICK`.
- El diff local muestra que `FADE_QUICK` salió de la API pública.
- `fade.css` pasó a consumir `timing.css` en vez de un valor duro aislado.

La decisión operativa documentable desde el repo es:

- `tokens/tweens.ts` y `FADE_QUICK` fueron retirados de la API pública;
- `timing.css` pasa a ser la fuente de verdad para timings de animaciones CSS puras;
- `FADE_QUICK` quedó como código muerto respecto del CSS real y ya no participa en el entrypoint público.

Nota de consistencia: el `README.md` todavía menciona `FADE_QUICK`, pero esa referencia ya no coincide con la API real auditada en `src/index.ts`.
