# Incidentes y lecciones

## 2026-07-31 — fixedContent en SmoothScrollProvider: tres problemas en cadena

### Contexto del incidente

Se implementó la prop `fixedContent` en `SmoothScrollProvider` para resolver un bug de containing block en el proyecto consumidor (portafolio Bylgja Labs). El problema raíz del bug era que `Navbar`, posicionado con `position: fixed`, estaba anidado dentro del `div` al que `SmoothScrollProvider` aplica `translateY` en cada frame de scroll. Cualquier elemento `position: fixed` dentro de un ancestro transformado no se posiciona respecto al viewport sino respecto al ancestro, rompiendo el comportamiento esperado del navbar. La solución fue agregar una salida oficial para contenido que debe existir fuera del contenedor transformado pero dentro del mismo `Context.Provider`.

El cambio de código en sí fue correcto desde la primera implementación en source. Sin embargo, antes de llegar a la causa real se recorrieron múltiples rondas de debugging en el proyecto consumidor descartando, en orden: montaje del componente, Context de React entre Astro islands separadas, especificidad CSS, containing block por transform, caché de npm, y hash de commit.

### Causa raíz: tres problemas distintos en cadena

#### Problema 1 — el commit original nunca existió

El primer cambio de `fixedContent` fue reportado como completo, con código fuente pegado como evidencia. Al volver a la sesión siguiente y ejecutar `git log --oneline` y `git diff origin/main HEAD --stat`, se confirmó que el commit no existía ni local ni remotamente. El working tree estaba limpio y sin divergencia respecto al remoto. El reporte describía código que nunca había sido persistido en disco de forma verificable.

#### Problema 2 — source correcto, dist sin actualizar

Una vez re-implementado el cambio y confirmado el commit con hash real (`d4c6d38`), el proyecto consumidor seguía sin recibir la feature. La causa: `dist/react/SmoothScrollProvider.js` en el repositorio todavía correspondía a la versión anterior porque `npm run build` no se ejecutó antes del commit. Los consumidores que instalan Bylgja desde git leen exclusivamente los archivos en `dist/` — nunca `src/`. Un source correcto sin dist actualizado es funcionalmente indistinguible de un cambio que no se hizo, desde el punto de vista de cualquier proyecto que instale el paquete vía `npm install`.

Resolución: ejecutar `npm run build`, verificar con `grep` sobre el dist generado, y commitear los cuatro archivos modificados (`SmoothScrollProvider.js`, `.js.map`, `.d.ts`, `.d.ts.map`) en un commit separado (`ee01cd7`).

#### Problema 3 — prepare roto en instalación limpia

Al forzar una reinstalación completa (`rm -rf node_modules/bylgja && npm install`), se expuso un tercer problema latente: el script `prepare` en `package.json` ejecutaba `npm run build`, que a su vez depende de `tsconfig.build.json`. Ese archivo no estaba incluido en el campo `files` de `package.json` y por lo tanto no viaja en ninguna instalación vía git. Esto rompía cualquier instalación limpia desde cero de forma sistemática y no intermitente. El problema había permanecido enmascarado porque siempre había un `dist/` residual de instalaciones previas en el entorno de desarrollo.

Estado actual: `prepare` fue corregido para emitir un echo en lugar de ejecutar el build, dado que `dist/` se commitea pre-compilado y el consumidor no necesita compilar nada en la instalación.

### Reglas operativas derivadas

- **Cierre con hash verificable.** El reporte de cierre de cualquier cambio en Bylgja debe incluir el hash de commit real, confirmado con `git log origin/main --oneline`. Un reporte sin hash verificable no se considera cerrado, sin importar que incluya código pegado o descripción en prosa.

- **Build y commit del dist en el mismo push.** Todo cambio en `src/` requiere ejecutar `npm run build` y commitear el `dist/` actualizado en el mismo push. Antes de reportar la tarea como terminada, verificar con `grep` sobre el dist generado — no solo sobre el source.

- **`prepare` no debe compilar en librerías con dist pre-compilado.** Si `dist/` se commitea al repositorio y los consumidores lo reciben vía git, el script `prepare` no debe apuntar a un build step que dependa de archivos fuera del campo `files`. Cualquier dependencia de compilación ausente del campo `files` va a fallar en instalación limpia.

- **Antes de auditar el consumidor, verificar el proveedor.** Cuando un bug persiste después de una corrección reportada como exitosa, el primer paso es confirmar que el cambio efectivamente llegó al remoto (`git log origin/main`) y que el artefacto compilado lo refleja (`grep` sobre `dist/`), antes de seguir auditando el proyecto consumidor.

---

## 2026-07-31 — Hydration mismatch por detección de touch en useState lazy initializer

### Contexto del incidente

Se implementó soporte de scroll táctil en `SmoothScrollProvider`. La solución detectaba dispositivos touch via `window.matchMedia("(pointer: coarse)").matches` dentro de un `useState` lazy initializer, y usaba ese valor para decidir qué árbol de JSX devolver: un `Fragment` (mobile, flujo normal) vs. un `div position:fixed` (desktop, spring physics).

En dispositivos touch reales, Astro reportó el error:

```
Uncaught Error: Hydration failed because the server rendered HTML didn't match the client.
<AppShell> → <SmoothScrollProvider>
+  <astro-slot />
-  <div style={{ position:"fixed", top:"0px", ... }}>
```

### Causa raíz

El `useState` lazy initializer corre durante la primera render — tanto en el servidor (SSR de Astro) como en el cliente. En el servidor, `typeof window !== "undefined"` es `false`, por lo que `isTouchPrimary = false` y el servidor renderiza el árbol desktop (`div position:fixed`). En el cliente, en cualquier dispositivo touch, `matchMedia("(pointer: coarse)").matches` es `true`, por lo que el cliente hidrara con `isTouchPrimary = true` y devuelve el árbol mobile (`Fragment`). Árboles estructuralmente distintos → hydration mismatch garantizado en todo dispositivo touch — no un caso edge, sino el comportamiento sistemático de la lógica.

### Corrección

`useState(false)` como valor inicial (SSR-safe, siempre `false` en primera render). La detección real se hace en un `useEffect` separado con deps vacías, que solo corre en el cliente post-hydration:

```tsx
const [isTouchPrimary, setIsTouchPrimary] = useState(false);   // SSR-safe

useEffect(() => {
  setIsTouchPrimary(window.matchMedia("(pointer: coarse)").matches);
}, []);
```

Secuencia: servidor renderiza `false` → árbol desktop. Cliente hidrata con `false` → mismo árbol → sin mismatch. Effect dispara post-mount → `setIsTouchPrimary(true)` en touch → segundo render → árbol mobile.

### Regla operativa derivada

**APIs de browser que deciden la estructura del árbol JSX son un riesgo de hydration mismatch.** La distinción crítica es:

- **Seguro:** APIs de browser que cambian *comportamiento interno* (listeners, efectos, CSS classes) — pueden evaluarse en effects post-mount sin afectar la estructura del árbol.
- **Riesgo:** APIs de browser (`window`, `matchMedia`, `localStorage`, `navigator`) que deciden *qué elementos existen* en el árbol (presencia/ausencia de elementos, cambio de tag, ramas condicionales en el return del componente) — si se evalúan en el primer render, producen árboles distintos entre servidor y cliente.

El patrón correcto para el segundo caso es siempre: inicializar el estado con el valor SSR-safe (`false`, `null`, valor default), y actualizar en `useEffect(() => { /* detectar */ }, [])` para que el árbol del primer render sea idéntico en servidor y cliente.

`useReducedMotion` en el mismo paquete tiene el mismo patrón (`useState(getReducedMotionPreference)` como lazy initializer), pero solo afecta class names — no estructura del árbol. No causa error de hydration, pero puede producir warning en consola si el usuario tiene `prefers-reduced-motion: reduce` activo. Riesgo latente bajo, documentado.
