# Bylgja — Agent Guide

Bylgja is a TypeScript animation library for React based on deterministic spring physics. No external motion dependencies.

## Quick Reference

| Command | Purpose |
|---|---|
| `npm test` | Run all vitest tests (use this, not `vitest` directly) |
| `npm run test -- --run` | Single-run (CI), use in watch mode for dev |
| `npm run typecheck` | `tsc --noEmit` — full project type check |
| `npm run build` | `tsc -p tsconfig.build.json` then copies `.css` files with `copy-variant-css` |
| `npm run demo:dev` | Vite dev server for the demo app |
| `npm run demo:build` | Production build of demo app |
| `npm run verify:package` | Smoke-test that published exports actually resolve |

## Project Structure

```
src/
├── core/             Framework-agnostic physics engine
│   ├── spring-solver.ts   1D spring integrator (mass-spring-damper)
│   ├── raf-driver.ts      RAF loop that drives a solver to completion
│   └── *.test.ts          Unit tests (node env, no jsdom)
├── react/            React bindings
│   ├── useSpring.ts       Hook: connects spring to element via --spring-progress
│   ├── Presence.tsx       Component: delays unmount until exit animation settles
│   └── *.test.tsx         Component tests (jsdom env)
├── variants/         Pre-built animation primitives built on useSpring/Presence
│   ├── fade.ts/fadeScale.ts/modalBackdrop.ts/modalPanel.ts
│   ├── pressable.ts/selectedHighlight.ts
│   ├── tooltip.tsx         Most complex variant (portal, flip positioning, a11y)
│   ├── *.css               CSS classes consumed by each variant
│   └── *.test.tsx          Variant tests
├── tokens/           `springs.ts` with named spring presets (`SPRING_GENTLE`, `SPRING_SNAPPY`) plus `timing.css` as the source of truth for CSS timing custom properties (for example `--bylgja-duration-quick` and `--bylgja-ease-out`), consumed via `@import` from variant CSS files that need them
├── a11y/             prefers-reduced-motion utilities
├── test/             Shared test utilities
│   ├── manualRafScheduler.ts    Fake RAF for deterministic animation stepping
│   └── integration/             Cross-module integration tests
├── index.ts          Public API barrel
```

Additional repo-root folders outside `src/`: `playground/` and `tree-shake-check/` are disposable verification/diagnostic tools, not part of the published source or the real package build. `playground/` was used to validate animation techniques in isolation. `tree-shake-check/` was used to verify practical tree-shaking behavior for external consumers, including resolution of internal CSS imports between `tokens/` and `variants/`.

## Architecture & Data Flow

The library has three layers, each unaware of the layer above:

1. **Core** (`core/`) — Pure math. `SpringSolver` integrates a 1D mass-spring-damper using semi-implicit Euler with fixed timestep sub-stepping. `createRafSpringDriver` wraps a solver in a RAF loop, clamps `deltaTime`, and emits `SpringSnapshot` to subscribers.

2. **React Bridge** (`react/`) — `useSpring` creates a driver on mount, subscribes to write `--spring-progress` onto the element's `style`, and re-targets on dependency changes. `Presence` renders a wrapper `div`, uses `useSpring` for exit, and delays unmount via `onSettled` until the target is reached. `Presence` always wraps children so CSS custom properties have a stable DOM node.

3. **Variants** (`variants/`) — Pre-built hooks that return `className`, `props`, and a `render()` function or spreadable props. They delegate to `useSpring` directly (pressable, selectedHighlight) or to `Presence` (fade, fadeScale, modalBackdrop, modalPanel, tooltip). Variants never inject CSS — consumers import CSS files explicitly.

### Key design property: snapshotting to exact target

When the spring settles, `useSpring` writes `snapshot.target` (not `snapshot.value`) to `--spring-progress`. The solver's `positionThreshold` means `value` can be 0.9992 instead of 1, which would leave `opacity: var(--spring-progress)` permanently sub-1. Snapping to target at rest fixes this visual artifact.

### Reduced motion

`getReducedMotionPreference()` checks `matchMedia`. When active, `useSpring` skips the driver entirely: writes the final target to `--spring-progress` immediately, schedules `onSettled` via `queueMicrotask`, and uses a token pattern to prevent stale callbacks. `useReducedMotion` is a React hook that subscribes to changes.

## Testing Patterns

### Test environment

All component tests use `// @vitest-environment jsdom` as a file-level pragma. Pure-core tests (`core/`) don't need jsdom.

### ManualRafScheduler

Tests **never use real `requestAnimationFrame`**. They inject the shared `ManualRafScheduler` class (defined in `src/test/manualRafScheduler.ts` or inline per test file) via `vi.stubGlobal`. The scheduler steps time deterministically:

```ts
const scheduler = new ManualRafScheduler();
vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

act(() => {
  scheduler.step(16); // advance 16ms
});

// Loop until idle:
let safety = 0;
while (scheduler.pendingCount() > 0 && safety < 200) {
  act(() => { scheduler.step(16); });
  safety += 1;
}
```

The helper `advanceUntilIdle(scheduler)` wraps this exact loop.

### Key testing gotchas

- **All animation steps must be wrapped in `act()`** — vitest requires this for React state updates triggered by RAF callbacks.
- **`afterEach` must call `cleanup()`, `vi.restoreAllMocks()`, and `vi.unstubAllGlobals()`** — forgetting `vi.unstubAllGlobals()` leaks stubbed RAF across test files, causing mysterious timeout failures.
- Tests verify `--spring-progress` CSS custom property values, never actual animated DOM positions.
- Use `readSpringProgress(element)` pattern: `Number(element.style.getPropertyValue("--spring-progress"))`.

### StrictMode testing

Tests explicitly verify that drivers created during StrictMode's double-mount are properly cleaned up. Pattern: spy on `createRafSpringDriver`, count create/stop lifecycle events, verify only the remounted driver's RAF loop is active.

## Conventions & Gotchas

### Code patterns

- **Imports use `.js` extensions** (e.g., `"../core/spring-solver.js"`), not `.ts` — ESM convention.
- Variants follow a consistent factory pattern: `useXxx({ show, className?, springConfig?, exitTarget?, onSettled? })` returns `{ className, render, state }` or spreadable props. All accept `className` for composition.
- `joinClassNames(...classNames)` is a local helper (not a library) defined in each variant file — it filters falsy values and joins with space.
- CSS class names follow the `bylgja-{variant}` convention (e.g., `.bylgja-fade`, `.bylgja-tooltip`, `.bylgja-pressable`).
- Components prefer `createElement` over JSX in library code (no JSX transform dependency in some contexts).
- All React refs use `useRef`, never `createRef`.

### Exports & distribution

- The public entry is `src/index.ts` (barrel file). Types are re-exported with `export { type Xxx }`.
- Build outputs ESM + `.d.ts` declarations to `dist/`. CSS files are copied separately by `scripts/copy-variant-css.mjs`.
- CSS is consumed via subpath imports: `import "bylgja/variants/fade.css"`. These paths are declared in `package.json`'s `exports` field.
- `package.json` `files` array includes only `dist/`, `README.md`, and `package.json`.
- `sideEffects` includes `**/*.css` so bundlers don't tree-shake CSS imports.

### Build config

- `tsconfig.json` has `noEmit: true` (for typechecking only).
- `tsconfig.build.json` extends it with `noEmit: false`, `outDir: "dist"`, `rootDir: "src"`, `declaration: true`, `sourceMap: true`.
- Build excludes `src/**/*.test.*` and `src/test/**`.
- TypeScript `moduleResolution: "Bundler"`, `target: "ES2022"`, `jsx: "react-jsx"`.

### Important gotchas

- **`useSpring` uses `configKey` (stringified config) as a `useEffect` dependency**, not the config object directly — the effect only recreates the driver when physical parameters change, not on every render.
- **`onSettled` is stored in a ref** (`onSettledRef`) to avoid re-creating the driver when the callback identity changes — the `targetValue` effect runs separately from the config effect.
- **`Presence` renders a wrapper div** — children are always nested inside it. This is intentional so `--spring-progress` lives on a stable element, but it means consumers cannot spread props directly onto the child.
- **The tooltip variant is the only `.tsx` file** in `variants/` — everything else is `.ts` using `createElement`.
- **`verify-package.mjs` tests the built package** via `import * as bylgja from "bylgja"` — it must run after `npm run build`. It imports `createElement` in variants via `react`, not `"react"` as a bare specifier.
- When adding a new variant CSS file, both the `exports` field in `package.json` and `copy-variant-css.mjs` may need updating (CSS files are matched by glob pattern in exports).
- The demo app imports from `"bylgja"` as if installed — it resolves via the package name, not relative paths. This means demo imports reflect the public API.
- Variant CSS may include internal relative `@import` references into other CSS files under `tokens/`, such as `fade.css` importing `tokens/timing.css`. This was verified working in production Vite builds even though `package.json` exports declares `./variants/*.css` but not `./tokens/*.css`; behavior with other build tools has not been verified yet.
